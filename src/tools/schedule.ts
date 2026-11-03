import { z } from "zod";
import type { Api } from "../api/api.js";
import type { MyScheduleEntry } from "../domain.js";
import { detectClashes, freeSlots, exportIcs } from "../agenda.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { env } from "../env.js";

export const myScheduleSchema = z.object({});

export async function mySchedule(api: Api) {
  const entries = await api.mySchedule();
  const sessions = entries.map(e => ({ id: e.sessionId, title: e.title, date: e.date, start: e.start, end: e.end }));
  const clashes = detectClashes(sessions);
  return { entries, clashes: [...clashes.keys()] };
}

export const scheduleAddSchema = z.object({ id: z.string() });

export async function scheduleAdd(api: Api, args: z.infer<typeof scheduleAddSchema>) {
  const c = (api as any).client;
  const creds = c.creds();
  const csrf = creds?.csrfToken ?? "";
  await c.post(`/lis26/events/${args.id}/responses`, {
    authenticity_token: csrf,
    response: "going",
  });
  api.invalidateWrites();
  return { ok: true, id: args.id };
}

export const scheduleRemoveSchema = z.object({ id: z.string() });

export async function scheduleRemove(api: Api, args: z.infer<typeof scheduleRemoveSchema>) {
  const c = (api as any).client;
  const creds = c.creds();
  const csrf = creds?.csrfToken ?? "";
  await c.post(`/lis26/events/${args.id}/responses`, {
    authenticity_token: csrf,
    response: "no",
  });
  api.invalidateWrites();
  return { ok: true, id: args.id };
}

export const freeSlotsSchema = z.object({
  day: z.string().optional(),
  dayStart: z.string().default("09:00"),
  dayEnd: z.string().default("19:00"),
});

export async function freeSlotsTool(api: Api, args: z.input<typeof freeSlotsSchema>) {
  const parsed = freeSlotsSchema.parse(args);
  const entries = await api.mySchedule();
  const sessions = entries.map(e => ({ id: e.sessionId, title: e.title, date: e.date, start: e.start, end: e.end }));
  const days = parsed.day ? [parsed.day] : [...new Set(sessions.map(s => s.date))];
  const out: { date: string; slots: { date: string; start: string; end: string }[] }[] = [];
  for (const d of days) {
    out.push({ date: d, slots: freeSlots(sessions, d, parsed.dayStart, parsed.dayEnd) });
  }
  return out;
}

export const exportIcsSchema = z.object({});

export async function exportIcsTool() {
  const dir = env.WEBSUMMIT_DATA_DIR ?? path.join(os.homedir(), ".websummit-mcp");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = path.join(dir, "agenda.ics");
  return { path: p };
}

export function buildIcs(sessions: { id: string; title: string; date: string; start: string; end: string }[]) {
  return exportIcs(sessions);
}
