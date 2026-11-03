// Session/auth flow for the Web Summit attendee app.
//
// Path A: direct HTTPS sign-in. The app uses plain form POSTs with no CAPTCHA,
// device attestation, request signing or certificate pinning, so we can drive
// it with fetch() + the cookies the server sends back.
//
// Steps:
//   1. auth_start(email)  -> GET /lis26 (login page) to grab the CSRF token,
//                              then POST /magic_links?slug=lis26 with email.
//   2. auth_verify(code)   -> GET the OTP page to grab CSRF + magic_link_id,
//                              then POST /magic_links/verify_otp?slug=lis26.
//                              Captures Set-Cookie headers and saves them.
//   3. Every subsequent request replays those cookies + the CSRF token.

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { env } from "../env.js";

export interface StoredCredentials {
  event: string;
  email: string; // masked
  cookies: string[];
  csrfToken: string | null;
  expiresAt: number | null;
  savedAt: number;
}

const FILE_NAME = "credentials.json";

function dataDir(): string {
  return env.WEBSUMMIT_DATA_DIR
    ? path.resolve(env.WEBSUMMIT_DATA_DIR)
    : path.join(os.homedir(), ".websummit-mcp");
}

export function credPath(event: string): string {
  return path.join(dataDir(), `${event}.${FILE_NAME}`);
}

export function loadCredentials(event: string): StoredCredentials | null {
  try {
    return JSON.parse(fs.readFileSync(credPath(event), "utf-8")) as StoredCredentials;
  } catch {
    return null;
  }
}

export function saveCredentials(c: StoredCredentials): void {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = credPath(c.event);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(c, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, p);
  try { fs.chmodSync(p, 0o600); } catch {}
}

export function deleteCredentials(event: string): boolean {
  try { fs.unlinkSync(credPath(event)); return true; } catch { return false; }
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return email.slice(0, 2) + "***" + email.slice(at);
}

export function pendingEmailPath(event: string): string {
  return path.join(dataDir(), `${event}.pending-email`);
}

export function savePendingEmail(event: string, email: string): void {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(pendingEmailPath(event), email, { mode: 0o600 });
}

export function loadPendingEmail(event: string): string | null {
  try {
    return fs.readFileSync(pendingEmailPath(event), "utf-8").trim();
  } catch {
    return null;
  }
}

export function clearPendingEmail(event: string): void {
  try { fs.unlinkSync(pendingEmailPath(event)); } catch {}
}
