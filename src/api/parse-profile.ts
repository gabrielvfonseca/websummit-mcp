// Parse an attendee profile page.

import { parse as parseHtml } from "node-html-parser";
import { cleanText } from "./parse.js";
import type { Attendee } from "../domain.js";

export function parseProfile(html: string, baseUrl: string): Attendee | null {
  const root = parseHtml(html);
  const nameEl = root.querySelector(".profile-name");
  const name = nameEl ? cleanText(nameEl) : "";
  if (!name) return null;

  const idMatch = html.match(/\/profiles\/([a-f0-9-]{36})/) || html.match(/attendee\?id=([a-f0-9-]{36})/);
  const id = idMatch ? idMatch[1] : "";

  const companyEl = root.querySelector(".profile-name + * .fw-medium, .fw-medium");
  const company = companyEl ? cleanText(companyEl) : undefined;

  const titleEl = [...root.querySelectorAll("p, span")].find(e => /at|works|student|engineer|manager|director/.test(e.textContent));
  const title = titleEl ? cleanText(titleEl) : undefined;

  const locEl = [...root.querySelectorAll("span")].find(s => /iconoir-map-pin/.test(s.innerHTML));
  const location = locEl ? cleanText(locEl) : undefined;

  const bioEl = root.querySelector(".profile-card--content p");
  const bio = bioEl ? cleanText(bioEl) : undefined;

  return {
    id, name, title, company, bio, location,
    url: `/profiles/${id}`,
  };
}
