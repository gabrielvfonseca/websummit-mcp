// Direct HTTPS sign-in flow (Path A).
//
// The attendee app is plain Rails form POSTs with no bot protection, so we can
// drive it with fetch(). Cookies are captured from Set-Cookie headers and the
// CSRF token is scraped from the login form. We never touch the user's inbox.

import { saveCredentials, maskEmail, loadCredentials, deleteCredentials, savePendingEmail, loadPendingEmail, clearPendingEmail } from "./session.js";

export interface AuthStartResult {
  ok: true;
  maskedEmail: string;
  message: string;
}

export interface AuthVerifyResult {
  ok: true;
  maskedEmail: string;
  message: string;
}

export interface AuthStatus {
  signedIn: boolean;
  event: string | null;
  maskedEmail: string | null;
  expiresAt: number | null;
}

export interface AuthFlowDeps {
  baseUrl: string;
  event: string;
  email: string;
  fetch?: typeof fetch;
  now?: () => number;
}

function collectCookies(res: Response): string[] {
  // Node 22 exposes raw Set-Cookie via getSetCookie(); keep only "name=value".
  const out: string[] = [];
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const sc = raw.indexOf(";");
    const pair = sc > 0 ? raw.slice(0, sc) : raw;
    const eq = pair.indexOf("=");
    if (eq > 0) out.push(pair);
  }
  return out;
}

function extractCsrf(html: string): string | null {
  const m = html.match(/name="authenticity_token"[^>]*value="([^"]*)"/);
  return m ? m[1] : null;
}

function extractMagicLinkIds(html: string): string[] {
  const re = /name="magic_link_id"[^>]*value="([^"]*)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

export async function authStart(deps: AuthFlowDeps): Promise<AuthStartResult> {
  const f = deps.fetch ?? fetch;
  const base = deps.baseUrl.replace(/\/$/, "");
  const event = deps.event;

  // 1. GET the login page to obtain the CSRF token.
  const pageRes = await f(`${base}/${event}`);
  if (!pageRes.ok) throw new Error(`login page returned ${pageRes.status}`);
  const pageHtml = await pageRes.text();
  const csrf = extractCsrf(pageHtml);
  if (!csrf) throw new Error("could not find authenticity_token on login page");

  // 2. POST the email.
  const body = new URLSearchParams({
    authenticity_token: csrf,
    email: deps.email,
    commit: "Continue",
  });
  const res = await f(`${base}/magic_links?slug=${event}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
    redirect: "manual",
  });
  if (res.status >= 400) {
    throw new Error(`request-code failed (${res.status})`);
  }

  try { savePendingEmail(event, deps.email); } catch {}

  return {
    ok: true,
    maskedEmail: maskEmail(deps.email),
    message: `Code sent to ${maskEmail(deps.email)}. Enter it with auth_verify.`,
  };
}

export async function authVerify(
  deps: AuthFlowDeps,
  code: string
): Promise<AuthVerifyResult> {
  const f = deps.fetch ?? fetch;
  const base = deps.baseUrl.replace(/\/$/, "");
  const event = deps.event;

  // 1. GET the login page again to obtain a fresh CSRF token + magic_link_id.
  const pageRes = await f(`${base}/${event}`);
  const pageHtml = await pageRes.ok ? await pageRes.text() : "";
  const csrf = extractCsrf(pageHtml);
  const ids = extractMagicLinkIds(pageHtml);
  const email = deps.email && deps.email.includes("@") ? deps.email : (loadPendingEmail(event) ?? "");

  // 2. POST the OTP. Try each magic_link_id we found.
  let lastErr: Error | null = null;
  for (const id of ids.length ? ids : [""]) {
    const body = new URLSearchParams({
      authenticity_token: csrf ?? "",
      magic_link_id: id,
      email,
      otp: code,
      commit: "Verify",
    });
    const res = await f(`${base}/magic_links/verify_otp?slug=${event}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
      redirect: "manual",
    });
    if (res.status >= 200 && res.status < 300) {
      const cookies = collectCookies(res);
      if (cookies.length) {
        saveCredentials({
          event,
          email: maskEmail(email),
          cookies,
          csrfToken: csrf,
          expiresAt: null,
          savedAt: (deps.now ?? Date.now)(),
        });
        try { clearPendingEmail(event); } catch {}
        return {
          ok: true,
          maskedEmail: maskEmail(email),
          message: `Signed in as ${maskEmail(email)}.`,
        };
      }
      lastErr = new Error("verify succeeded but no Set-Cookie headers");
      continue;
    }
    lastErr = new Error(`verify failed (${res.status})`);
  }
  throw lastErr ?? new Error("verify failed: no magic_link_id found");
}

export function authStatus(event: string): AuthStatus {
  const c = loadCredentials(event);
  if (!c) return { signedIn: false, event: null, maskedEmail: null, expiresAt: null };
  return {
    signedIn: true,
    event: c.event,
    maskedEmail: c.email,
    expiresAt: c.expiresAt,
  };
}

export function authLogout(event: string): { ok: true; message: string } {
  const ok = deleteCredentials(event);
  return { ok: true, message: ok ? "Logged out." : "Not logged in." };
}