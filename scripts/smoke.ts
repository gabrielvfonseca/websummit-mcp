#!/usr/bin/env node
// Read-only smoke test against the live API. Requires credentials.
import { AttendeeClient } from "../src/api/client.js";
import { Api } from "../src/api/api.js";
import { loadCredentials } from "../src/auth/session.js";

async function main() {
  const event = process.env.WEBSUMMIT_EVENT ?? "lis26";
  const c = loadCredentials(event);
  if (!c) {
    console.log("No credentials for", event, "- run auth_start/auth_verify first.");
    process.exit(0);
  }
  const client = new AttendeeClient();
  const api = new Api(client);

  const r = await api.searchSessions("AI", { day: "10", limit: 5 });
  console.log("search_sessions AI day 10:", r.length, "sessions");

  if (r[0]) {
    const detail = await api.getSession(r[0].id);
    console.log("get_session:", detail.title);
  }

  const mine = await api.mySchedule();
  console.log("my_schedule:", mine.length, "entries");
}
main().catch((e) => { console.error("smoke error:", e.message); process.exit(1); });
