#!/usr/bin/env node
import * as fs from "fs";
const har = JSON.parse(fs.readFileSync("captures/session.har","utf-8"));
const entries = har.log.entries;
const out: any[] = [];
for (const e of entries) {
  const u = new URL(e.request.url);
  if (u.hostname !== "attend.websummit.com") continue;
  let body: any = null;
  if (e.request.postData?.text) { try { body = JSON.parse(e.request.postData.text); } catch { body = e.request.postData.text; } }
  let resp: any = null;
  if (e.response.content?.text) { try { resp = JSON.parse(e.response.content.text); } catch { resp = e.response.content.text.slice(0,300); } }
  out.push({
    t: e.startedDateTime,
    method: e.request.method,
    path: u.pathname + u.search,
    status: e.response.status,
    reqBody: body,
    respBody: resp,
    reqHeaders: e.request.headers.filter((h:any)=>["authorization","cookie","content-type","x-"].includes(h.name.toLowerCase().slice(0,3))),
  });
}
fs.writeFileSync("captures/_endpoints.json", JSON.stringify(out, null, 1));
console.log("wrote captures/_endpoints.json", out.length, "entries");
