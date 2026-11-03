// HTTP client for the Web Summit attendee app.
//
// The app is server-rendered HTML, so every request returns HTML. We drive it
// with fetch() + the cookies captured at sign-in. Rate limiting, retries and
// timeouts live here; HTML parsing lives in ./parse.ts.

import { RateLimiter, withRetry } from "../http.js";
import { loadCredentials } from "../auth/session.js";
import type { StoredCredentials } from "../auth/session.js";
import { env } from "../env.js";

export class AuthRequired extends Error {
  constructor(msg = "auth required") {
    super(msg);
    this.name = "AuthRequired";
  }
}
export class NotFound extends Error {
  constructor(msg = "not found") {
    super(msg);
    this.name = "NotFound";
  }
}
export class RateLimited extends Error {
  retryAfter?: number;
  constructor(msg = "rate limited", retryAfter?: number) {
    super(msg);
    this.name = "RateLimited";
    this.retryAfter = retryAfter;
  }
}
export class Upstream extends Error {
  constructor(msg = "upstream error") {
    super(msg);
    this.name = "Upstream";
  }
}

export interface ClientOptions {
  baseUrl?: string;
  event?: string;
  rps?: number;
  maxInFlight?: number;
  maxRetries?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
  now?: () => number;
}

const DEFAULT_BASE = "https://attend.websummit.com";

export class AttendeeClient {
  readonly baseUrl: string;
  readonly event: string;
  private limiter: RateLimiter;
  private maxRetries: number;
  private timeoutMs: number;
  private fetchFn: typeof fetch;
  private now: () => number;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.event = opts.event ?? env.WEBSUMMIT_EVENT ?? "lis26";
    this.limiter = new RateLimiter(opts.rps ?? env.WEBSUMMIT_RPS ?? 2, opts.maxInFlight ?? 2);
    this.maxRetries = opts.maxRetries ?? 3;
    this.timeoutMs = opts.timeoutMs ?? 20000;
    this.fetchFn = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
  }

  private creds(): StoredCredentials | null {
    const token = env.WEBSUMMIT_TOKEN ?? process.env.WEBSUMMIT_TOKEN;
    if (token) {
      // Debug override: treat the token as a bare identity cookie value.
      return {
        event: this.event,
        email: "***",
        cookies: [`EXP_${this.event}_identity=${token}`],
        csrfToken: null,
        expiresAt: null,
        savedAt: 0,
      };
    }
    return loadCredentials(this.event);
  }

  private async ensureAuth(): Promise<StoredCredentials> {
    const c = this.creds();
    if (!c) throw new AuthRequired();
    return c;
  }

  private headers(c: StoredCredentials, extra: Record<string,string> = {}): Record<string,string> {
    const h: Record<string,string> = {
      "User-Agent": "websummit-mcp/0.1",
      Accept: "text/html,application/xhtml+xml",
      "X-Requested-With": "XMLHttpRequest",
      ...extra,
    };
    if (c.cookies.length) h.Cookie = c.cookies.join("; ");
    if (c.csrfToken) {
      // CSRF token must be sent on same-origin POSTs; include as a hidden field
      // in the body instead of a header (Rails reads it from the form).
    }
    return h;
  }

  async get(path: string, opts: { signal?: AbortSignal } = {}): Promise<string> {
    return this.request("GET", path, { signal: opts.signal });
  }

  async post(path: string, params: Record<string,string>, opts: { signal?: AbortSignal } = {}): Promise<string> {
    const body = new URLSearchParams(params);
    return this.request("POST", path, {
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: opts.signal,
    });
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    opts: { body?: URLSearchParams | string; headers?: Record<string,string>; signal?: AbortSignal } = {}
  ): Promise<string> {
    const c = await this.ensureAuth();
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;

    const doFetch = async (attempt: number): Promise<string> => {
      await this.limiter.acquire();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const signal = opts.signal ? AbortSignal.any([opts.signal, controller.signal]) : controller.signal;
        try {
          const res = await this.fetchFn(url, {
            method,
            headers: this.headers(c, opts.headers ?? {}),
            body: opts.body,
            redirect: "manual",
            signal,
          });
          if (res.status === 401) throw new AuthRequired();
          if (res.status === 429) {
            const ra = res.headers.get("retry-after");
            throw new RateLimited("rate limited", ra ? Number(ra) : undefined);
          }
          if (res.status >= 500 && res.status < 600) {
            throw new Upstream(`upstream ${res.status}`);
          }
          if (res.status === 302 || res.status === 303) {
            const loc = res.headers.get("location");
            if (loc && loc.includes("/magic_links")) throw new AuthRequired();
          }
          if (res.status >= 400) {
            // 404 etc
            if (res.status === 404) throw new NotFound();
            throw new Upstream(`status ${res.status}`);
          }
          return await res.text();
        } finally {
          clearTimeout(timer);
        }
      } finally {
        this.limiter.release();
      }
    };

    return withRetry(() => doFetch(0), this.maxRetries, 500);
  }
}