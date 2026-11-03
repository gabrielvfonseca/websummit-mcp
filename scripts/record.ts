#!/usr/bin/env node
import { chromium } from "playwright";
import * as readline from "readline";

async function main() {
  console.log("Web Summit MCP - Login/Discovery Recorder");
  console.log("Event: Web Summit Lisbon 2026 (lis26)");
  console.log("URL: https://attend.websummit.com/lis26");
  console.log("");
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordHar: {
      path: "captures/session.har",
      content: "embed",
    },
  });
  
  const page = await context.newPage();
  await page.goto("https://attend.websummit.com/lis26");
  
  console.log("Browser opened. Please sign in manually.");
  console.log("");
  console.log("Follow these steps and press Enter after each:");
  console.log("1. Finish signing in (email → code)");
  console.log("2. Open the schedule; switch days; filter by a track; scroll until more sessions load");
  console.log("3. Search sessions for \"AI\"");
  console.log("4. Open one session");
  console.log("5. Bookmark that session, then remove the bookmark");
  console.log("6. Open \"My schedule\"");
  console.log("7. Open the speakers list and one speaker profile");
  console.log("8. Search attendees for a company name; open one profile");
  console.log("9. Open the companies or startups list; filter by industry; open one company");
  console.log("10. Open connections, meetings and recommendations, if present (read only)");
  console.log("11. Leave the tab idle for 15 minutes or more, then click something");
  console.log("");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  for (let i = 1; i <= 11; i++) {
    await new Promise((resolve) => {
      rl.question(`Press Enter after step ${i}...`, resolve);
    });
    console.log(`✓ Step ${i} marked`);
  }
  
  rl.close();
  
  console.log("");
  console.log("Recording complete. Saving HAR...");
  await context.close();
  await browser.close();
  
  console.log("Done. HAR saved to captures/session.har");
  console.log("Run 'npm run analyze' to process it.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
