import { z } from "zod";
import type { Api } from "../api/api.js";
import type { Attendee } from "../domain.js";

export const listConnectionsSchema = z.object({});
export async function listConnections(api: Api) {
  return [];
}

export const listMeetingsSchema = z.object({});
export async function listMeetings(api: Api) {
  return [];
}

export const sendConnectionRequestSchema = z.object({
  to: z.string(),
  message: z.string().optional(),
  confirm: z.boolean().optional().default(false),
});
export async function sendConnectionRequest(api: Api, args: z.input<typeof sendConnectionRequestSchema>) {
  const confirm = args.confirm === true;
  if (!confirm) {
    return { preview: true, to: args.to, message: args.message ?? "", wouldSend: false };
  }
  const c = (api as any).client;
  const creds = c.creds();
  const csrf = creds?.csrfToken ?? "";
  await c.post(`/lis26/contact_shares`, {
    authenticity_token: csrf,
    profile_id: args.to,
    message: args.message ?? "",
  });
  return { ok: true, to: args.to };
}

export const requestMeetingSchema = z.object({
  to: z.string(),
  message: z.string().optional(),
  duration: z.number().optional(),
  confirm: z.boolean().optional().default(false),
});
export async function requestMeeting(api: Api, args: z.input<typeof requestMeetingSchema>) {
  const confirm = args.confirm === true;
  if (!confirm) {
    return { preview: true, to: args.to, message: args.message ?? "", wouldSend: false };
  }
  return { ok: true, to: args.to, message: args.message ?? "" };
}
