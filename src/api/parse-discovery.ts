// Parse the discovery page (companies / attendees).

import { parse as parseHtml } from "node-html-parser";
import { cleanText } from "./parse.js";
import type { Company, Attendee } from "../domain.js";

export function parseCompanies(html: string, baseUrl: string): Company[] {
  const root = parseHtml(html);
  const out: Company[] = [];
  for (const card of root.querySelectorAll(".company-card")) {
    const link = card.querySelector("a[href*=\"/company/\"]");
    const href = link?.getAttribute("href") || "";
    const idMatch = href.match(/\/company\/(\d+)/);
    const id = idMatch ? idMatch[1] : "";
    if (!id) continue;
    const name = cleanText(card.querySelector(".company-name, .fw-medium, span.fw-medium")) || cleanText(link);
    if (!name) continue;
    const img = card.querySelector("img");
    out.push({
      id, name,
      logo: img?.getAttribute("src") || undefined,
      url: href.startsWith("http") ? href : `${baseUrl}${href}`,
    });
  }
  return out;
}

export function parseAttendees(html: string, baseUrl: string): Attendee[] {
  const root = parseHtml(html);
  const out: Attendee[] = [];
  for (const card of root.querySelectorAll("[class*=\"attendee\"], .profile-card, [class*=\"card\"]")) {
    const link = card.querySelector("a[href*=\"/profiles/\"]");
    const href = link?.getAttribute("href") || "";
    const idMatch = href.match(/\/profiles\/([a-f0-9-]{36})/);
    const id = idMatch ? idMatch[1] : "";
    if (!id) continue;
    const name = cleanText(card.querySelector(".profile-name, .fw-medium, .fw-semibold"));
    if (!name) continue;
    out.push({ id, name, url: href.startsWith("http") ? href : `${baseUrl}${href}` });
  }
  return out;
}
