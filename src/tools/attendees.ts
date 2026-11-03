import { z } from "zod";
import type { Api } from "../api/api.js";
import type { Attendee } from "../domain.js";

export const searchAttendeesSchema = z.object({
  query: z.string().optional(),
  limit: z.number().min(1).max(25).default(25),
});

export async function searchAttendees(api: Api, args: z.input<typeof searchAttendeesSchema>) {
  const parsed = searchAttendeesSchema.parse(args);
  return api.searchAttendees(parsed.query ?? "", parsed.limit);
}

export const getAttendeeSchema = z.object({ id: z.string() });

export async function getAttendee(api: Api, args: z.infer<typeof getAttendeeSchema>) {
  return api.getAttendee(args.id);
}
