import { z } from "zod";
import { loadCredentials, deleteCredentials } from "../auth/session.js";
import { AttendeeClient } from "../api/client.js";

export const authStartSchema = z.object({ email: z.string().email() });
export async function authStart(args: z.infer<typeof authStartSchema>) {
  const { authStart } = await import("../auth/flow.js");
  const client = new AttendeeClient();
  return authStart({ baseUrl: client.baseUrl, event: client.event, email: args.email });
}

export const authVerifySchema = z.object({ code: z.string().min(4) });
export async function authVerify(args: z.infer<typeof authVerifySchema>) {
  const { authVerify } = await import("../auth/flow.js");
  const client = new AttendeeClient();
  return authVerify({ baseUrl: client.baseUrl, event: client.event, email: "" }, args.code);
}

export const authStatusSchema = z.object({});
export function authStatus() {
  const client = new AttendeeClient();
  const c = loadCredentials(client.event);
  if (!c) return { signedIn: false, event: client.event, maskedEmail: null, expiresAt: null };
  return { signedIn: true, event: c.event, maskedEmail: c.email, expiresAt: c.expiresAt };
}

export const authLogoutSchema = z.object({});
export async function authLogout() {
  const client = new AttendeeClient();
  const ok = deleteCredentials(client.event);
  return { ok: true, message: ok ? "Logged out." : "Not logged in." };
}
