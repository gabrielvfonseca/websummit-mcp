import { z } from "zod";
import type { Api } from "../api/api.js";
import type { Speaker } from "../domain.js";

export const searchSpeakersSchema = z.object({
  query: z.string().optional(),
  limit: z.number().min(1).max(50).default(25),
});

export async function searchSpeakers(api: Api, args: z.input<typeof searchSpeakersSchema>) {
  const parsed = searchSpeakersSchema.parse(args);
  // The attendee app lists speakers/attendees together in discovery; reuse attendees.
  return api.searchAttendees(parsed.query ?? "", parsed.limit);
}

export const getSpeakerSchema = z.object({ id: z.string() });

export async function getSpeaker(api: Api, args: z.infer<typeof getSpeakerSchema>) {
  return api.getAttendee(args.id);
}
