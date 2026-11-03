#!/usr/bin/env node
import * as fs from "fs";

interface HarEntry {
  startedDateTime: string;
  request: {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
    postData?: { text?: string; mimeType?: string };
  };
  response: {
    status: number;
    content: { text?: string; mimeType?: string };
    headers: Array<{ name: string; value: string }>;
  };
  time: number;
}

const harPath = "captures/session.har";
if (!fs.existsSync(harPath)) {
  console.error("HAR not found");
  process.exit(1);
}
const har = JSON.parse(fs.readFileSync(harPath, "utf-8"));
const entries: HarEntry[] = har.log.entries;
console.log(`Total entries: ${entries.length}`);

const byHost: Record<string, HarEntry[]> = {};
for (const e of entries) {
  try {
    const u = new URL(e.request.url);
    (byHost[u.hostname] ||= []).push(e);
  } catch {}
}
for (const [host, es] of Object.entries(byHost)) {
  console.log(`\n=== HOST: ${host} (${es.length} requests) ===`);
  const seen = new Set<string>();
  for (const e of es) {
    const u = new URL(e.request.url);
    let body: any = null;
    if (e.request.postData?.text) {
      try { body = JSON.parse(e.request.postData.text); } catch {}
    }
    const op = body?.operationName ? `GraphQL op=${body.operationName}` : (body?.query ? "GraphQL query" : u.pathname);
    const key = `${e.request.method} ${op}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const authHeaders = e.request.headers.filter(h => ["authorization","x-api-key","x-client-id","x-app-version","x-event-id","cookie"].includes(h.name.toLowerCase()));
    console.log(`  ${e.request.method} ${e.response.status} ${op}`);
    for (const h of authHeaders) {
      console.log(`      ${h.name}: ${h.value.length > 60 ? h.value.slice(0,60)+"..." : h.value}`);
    }
    if (body && !body.operationName && !body.query) {
      const s = JSON.stringify(body);
      console.log(`      body: ${s.slice(0, 200)}`);
    }
  }
}
