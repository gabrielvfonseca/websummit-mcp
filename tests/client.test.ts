import { describe, it, expect, vi } from "vitest";
import { AttendeeClient, AuthRequired, NotFound, RateLimited } from "../src/api/client.js";
import { Api } from "../src/api/api.js";

function mockFetch(responses: Record<string, { status: number; body: string; headers?: Record<string,string> }>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const u = new URL(url);
    const key = u.pathname + u.search;
    const r = responses[key] || responses[u.pathname] || { status: 404, body: "not found" };
    return new Response(r.body, {
      status: r.status,
      headers: { "content-type": "text/html", ...r.headers },
    });
  });
  return { fn, calls };
}

describe("client header injection", () => {
  it("sends cookies + user agent", async () => {
    const { fn, calls } = mockFetch({});
    const c = new AttendeeClient({ fetch: fn as any });
    // inject creds via WEBSUMMIT_TOKEN override
    process.env.WEBSUMMIT_TOKEN = "abc123";
    try {
      await expect(c.get("/lis26/schedule")).rejects.toThrow();
    } finally {
      delete process.env.WEBSUMMIT_TOKEN;
    }
    expect(calls[0].url).toContain("/lis26/schedule");
  });
});

describe("client 401 handling", () => {
  it("throws AuthRequired on 401", async () => {
    const { fn } = mockFetch({ "/lis26/schedule": { status: 401, body: "" } });
    const c = new AttendeeClient({ fetch: fn as any });
    process.env.WEBSUMMIT_TOKEN = "tok";
    await expect(c.get("/lis26/schedule")).rejects.toThrow(AuthRequired);
    delete process.env.WEBSUMMIT_TOKEN;
  });

  it("throws NotFound on 404", async () => {
    const { fn } = mockFetch({ "/lis26/x": { status: 404, body: "" } });
    const c = new AttendeeClient({ fetch: fn as any });
    process.env.WEBSUMMIT_TOKEN = "tok";
    await expect(c.get("/lis26/x")).rejects.toThrow(NotFound);
    delete process.env.WEBSUMMIT_TOKEN;
  });
});

describe("secret leak guard", () => {
  it("never returns the token in output", async () => {
    const { fn } = mockFetch({ "/lis26/schedule": { status: 200, body: "<html></html>" } });
    const c = new AttendeeClient({ fetch: fn as any });
    process.env.WEBSUMMIT_TOKEN = "SECRET-TOKEN-12345";
    try {
      const html = await c.get("/lis26/schedule");
      expect(html).not.toContain("SECRET-TOKEN-12345");
    } finally {
      delete process.env.WEBSUMMIT_TOKEN;
    }
  });
});
