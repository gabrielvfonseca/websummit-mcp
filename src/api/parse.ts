// HTML parser for the Web Summit attendee app.

import { parse as parseHtml, HTMLElement } from "node-html-parser";

export function cleanText(el: HTMLElement | null | undefined): string {
  if (!el) return "";
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

export function parseAmPmTo24(time: string): string {
  const m = time.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export function parseScheduleDay(text: string): string {
  // Full weekday name: "Tuesday, 10 November"
  let m = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  // Abbreviated weekday: "Mon, 09 Nov"
  if (!m) m = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (!m) return "";
  const monthMap: Record<string, number> = { January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11, Jan:0,Feb:1,Mar:2,Apr:3,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const month = monthMap[m[3]];
  const day = parseInt(m[2], 10);
  // Web Summit Lisbon 2026: 9-12 November. Jan-Jun => 2027.
  const year = (month >= 0 && month <= 5) ? 2027 : 2026;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
