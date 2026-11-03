#!/usr/bin/env node
import * as fs from "fs";
const har = JSON.parse(fs.readFileSync("captures/session.har","utf-8"));
const find = (pred:(u:URL)=>boolean) => har.log.entries.find(e=>{try{return pred(new URL(e.request.url));}catch{return false;}});
const save = (name:string, txt:string) => {
  let r = txt;
  // emails (plain + url-encoded)
  r = r.replace(/[A-Za-z0-9._%+-]+(?:%40|@)[A-Za-z0-9._%+-]+\.[A-Za-z]{2,}/g, "REDACTED@REDACTED");
  r = r.replace(/EXP_[0-9a-f]+_identity=[^;"\s]+/g, "EXP_REDACTED_identity=REDACTED");
  r = r.replace(/_attendee_portal_session=[0-9a-f]+/g, "_attendee_portal_session=REDACTED");
  r = r.replace(/name="authenticity_token"[^/]*value="[^"]*"/g, 'name="authenticity_token" value="REDACTED"');
  r = r.replace(/value="[0-9a-f]{64}"/g, 'value="REDACTED"');
  r = r.replace(/magic_link_id=[0-9]+/g, "magic_link_id=REDACTED");
  r = r.replace(/web_exp_id_v2[^,}]{0,40}/g, 'web_exp_id_v2":"REDACTED"');
  // keep event/profile/company IDs (structural), redact user profile id only
  r = r.replace(/\/profiles\/f43f1241-3e13-4436-b2f0-55d5cb3b3a52/g, "/profiles/REDACTED_SELF");
  fs.writeFileSync(`fixtures/${name}`, r);
  console.log(`wrote fixtures/${name} (${r.length} bytes)`);
};
const schedule = find(u=>u.pathname==="/lis26/schedule" && u.search.includes("active_tab=available-events"));
save("schedule.html", schedule.response.content.text);
const ev = find(u=>u.pathname.startsWith("/lis26/events/"));
save("event.html", ev.response.content.text);
const prof = find(u=>u.pathname.startsWith("/lis26/profiles/") && !u.pathname.includes("/edit"));
save("profile.html", prof.response.content.text);
const disc = find(u=>u.pathname==="/lis26/discovery");
save("discovery.html", disc.response.content.text);
const tickets = find(u=>u.pathname==="/lis26/tickets");
save("tickets.html", tickets.response.content.text);
const inv = find(u=>u.pathname==="/lis26/invitations");
save("invitations.html", inv.response.content.text);
const magic = find(u=>u.pathname==="/magic_links");
save("magic_links_post.html", magic.response.content.text);
const verify = find(u=>u.pathname==="/magic_links/verify_otp");
save("verify_otp.html", verify.response.content.text);
