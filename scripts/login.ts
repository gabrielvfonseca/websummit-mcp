#!/usr/bin/env node
// Path B fallback: open headed Chromium, let the user sign in by hand,
// then save the session cookies + CSRF token for later fetch() use.
//
// Run with: npm run login

import { chromium } from "playwright";
import * as readline from "readline";
import { saveCredentials, maskEmail } from "../src/auth/session.js";
import { AttendeeClient } from "../src/api/client.js";

async function main() {
  const event = process.env.WEBSUMMIT_EVENT ?? "lis26";
  const client = new AttendeeClient();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("Web Summit MCP - browser sign-in (Path B)");
  console.log("URL:", `${client.baseUrl}/${event}`);
  console.log("Sign in by hand in the browser, then press Enter here.");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${client.baseUrl}/${event}`);

  rl.question("Press Enter after you are signed in and on the schedule page... ", () => {});
  rl.close();

  const cookies = await context.cookies();
  const cookiePairs = cookies.map(c => `${c.name}=${c.value}`);

  // Grab CSRF token from the page HTML.
  const html = await page.content();
  const csrfMatch = html.match(/name="authenticity_token"[^>]*value="([^"]*)"/);
  const csrf = csrfMatch ? csrfMatch[1] : null;

  // Best-effort email from the page.
  const emailMatch = html.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
  const email = emailMatch ? emailMatch[1] : "unknown";

  saveCredentials({
    event,
    email: maskEmail(email),
    cookies: cookiePairs,
    csrfToken: csrf,
    expiresAt: null,
    savedAt: Date.now(),
  });

  console.log(`Saved ${cookiePairs.length} cookies for ${maskEmail(email)}.`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
