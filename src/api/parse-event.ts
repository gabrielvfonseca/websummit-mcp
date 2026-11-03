// Parse an event detail page into a Session object.

import { parse as parseHtml } from "node-html-parser";
import { cleanText, parseAmPmTo24, parseScheduleDay } from "./parse.js";
import type { Session, Speaker } from "../domain.js";

export function parseEvent(html: string, baseUrl: string): Session | null {
  const root = parseHtml(html);
  const info = root.querySelector(".event-content, #event-info-card");
  if (!info) return null;

  const title = cleanText(info.querySelector("p.h1, h1, h2, h3, h4, .fw-bold, .fw-semibold"));
  if (!title) return null;

  const idMatch = html.match(/\/events\/([^/?]+)/);
  const id = idMatch ? idMatch[1] : "";

  const muted = [...info.querySelectorAll(".text-muted span, .text-muted, .text-gray-700 span, .text-gray-700, .fs-6, .fw-light")];
  let dayText = "";
  let timeText = "";
  for (const s of muted) {
    const t = cleanText(s);
    if (!t) continue;
    // Day must be a tight match: "Mon, 09 Nov" or "Monday, 09 November"
    if (/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(t)) {
      dayText = t;
    } else if (/\d{1,2}:\d{2}\s*(AM|PM)/.test(t)) {
      timeText = (timeText + " " + t).trim();
    }
  }
  const date = parseScheduleDay(dayText);
  const tm = timeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  let start = "", end = "";
  if (tm) { start = parseAmPmTo24(tm[1]); end = parseAmPmTo24(tm[2]); }

  const badges = [...info.querySelectorAll(".badge-secondary")].map(cleanText);
  let stage = "";
  let track = "";
  for (const b of badges) {
    if (!stage) stage = b;
    else if (!track) track = b;
  }

  const descEl = info.querySelector(".fs-5.fw-light, .fs-5, .line-clamp-3");
  const description = descEl ? cleanText(descEl) : "";

  const speakers: Speaker[] = [];
  for (const sp of info.querySelectorAll(".event-card-speaker, .speaker")) {
    const name = cleanText(sp.querySelector(".speaker-name, .event-card-speaker-name, .fw-medium"));
    if (name) speakers.push({ id: "", name, sessions: [id], url: "" });
  }

  const langEl = [...root.querySelectorAll("p, span")].find(e => /presented in|Language:/.test(e.textContent));
  const language = langEl ? cleanText(langEl) : undefined;

  return {
    id, title, description, date, start, end,
    track: track || undefined, stage: stage || undefined, speakers,
    language: language || undefined,
    url: `/lis26/events/${id}`,
  };
}
