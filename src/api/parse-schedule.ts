// Parse the schedule page into Session objects and my-schedule entries.

import { parse as parseHtml, HTMLElement } from "node-html-parser";
import { cleanText, parseAmPmTo24, parseScheduleDay } from "./parse.js";
import type { Session, Speaker } from "../domain.js";

export interface ParseResult {
  sessions: Session[];
  mySchedule: { sessionId: string; title: string; date: string; start: string; end: string; track?: string; stage?: string; url: string }[];
  hasMore: boolean;
}

function extractCard(card: HTMLElement, baseUrl: string): Session | null {
  const link = card.querySelector(".event-content, a.event-content, a[href*=\"/events/\"]");
  const href = link?.getAttribute("href") || "";
  const idMatch = href.match(/\/events\/([^/?]+)/);
  const id = idMatch ? idMatch[1] : "";
  if (!id) return null;

  const title = cleanText(card.querySelector("h4") || card.querySelector(".fw-bold") || card.querySelector(".fw-semibold"));
  if (!title) return null;

  // Date + time: may be in one span ("Tuesday, 10 November ... 10:00 AM - 10:25 AM")
  // or split across spans.
  const mutedSpans = card.querySelectorAll(".text-muted span, .text-muted");
  let dayText = "";
  let timeText = "";
  for (const s of mutedSpans) {
    const t = cleanText(s);
    if (!t) continue;
    if (/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/.test(t)) {
      dayText = (dayText + " " + t).trim();
    }
    if (/\d{1,2}:\d{2}\s*(AM|PM)/.test(t)) {
      timeText = (timeText + " " + t).trim();
    }
  }
  // Fallback: whole muted block
  if (!timeText) {
    const allText = cleanText(card.querySelector(".text-muted"));
    const tm = allText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (tm) timeText = tm[0];
  }
  if (!dayText) {
    const allText = cleanText(card.querySelector(".text-muted"));
    const dm = allText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
    if (dm) dayText = dm[0];
  }

  const date = parseScheduleDay(dayText);
  const tm = timeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  let start = "";
  let end = "";
  if (tm) { start = parseAmPmTo24(tm[1]); end = parseAmPmTo24(tm[2]); }

  // Stage / track: the icon's parent span
  let stage = "";
  let track = "";
  for (const icon of card.querySelectorAll("i.bi-geo-alt, i.bi-list")) {
    const span = icon.closest("span");
    const t = span ? cleanText(span) : "";
    if (icon.classList.contains("bi-geo-alt") && t) stage = t;
    else if (icon.classList.contains("bi-list") && t) track = t;
  }

  const descEl = card.querySelector(".line-clamp-3, .line-clamp-2");
  const description = descEl ? cleanText(descEl) : "";

  const speakers: Speaker[] = [];
  for (const sp of card.querySelectorAll(".event-card-speaker")) {
    const name = cleanText(sp.querySelector(".event-card-speaker-name, .speaker-name"));
    if (name) speakers.push({ id: "", name, sessions: [id], url: "" });
  }

  return {
    id, title, description, date, start, end,
    track: track || undefined, stage: stage || undefined, speakers,
    url: href.startsWith("http") ? href : `${baseUrl}${href}`,
  };
}

export function parseSchedule(html: string, baseUrl: string): ParseResult {
  const root = parseHtml(html);
  const sessions: Session[] = [];
  const mySchedule: ParseResult["mySchedule"] = [];

  // Available events
  for (const card of root.querySelectorAll(".event-card")) {
    const s = extractCard(card, baseUrl);
    if (s) sessions.push(s);
  }

  // My schedule: cards inside the my-schedule box
  const myBox = root.querySelector("#my-schedule-events-content");
  if (myBox) {
    for (const card of myBox.querySelectorAll("[id^=\"my-schedule-event-\"] .event-card, [id^=\"my-schedule-event-\"]")) {
      const s = extractCard(card, baseUrl);
      if (s) {
        mySchedule.push({
          sessionId: s.id, title: s.title, date: s.date, start: s.start, end: s.end,
          track: s.track, stage: s.stage, url: s.url,
        });
      }
    }
  }

  return { sessions, mySchedule, hasMore: false };
}
