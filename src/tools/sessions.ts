import { z } from "zod";
import type { Api } from "../api/api.js";
import type { Session } from "../domain.js";

export const searchSessionsSchema = z.object({
  query: z.string().optional(),
  day: z.string().optional(),
  track: z.string().optional(),
  speaker: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  fits_my_schedule: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(25),
});

export async function searchSessions(api: Api, args: z.input<typeof searchSessionsSchema>) {
  const parsed = searchSessionsSchema.parse(args);
  const sessions = await api.searchSessions(parsed.query ?? "", {
    day: parsed.day,
    track: parsed.track,
    limit: parsed.limit,
  });
  return sessions;
}

export const getSessionSchema = z.object({ id: z.string() });

export async function getSession(api: Api, args: z.infer<typeof getSessionSchema>) {
  return api.getSession(args.id);
}
