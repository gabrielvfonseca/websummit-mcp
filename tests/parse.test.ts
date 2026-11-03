import { describe, it, expect, vi } from "vitest";
import { parseSchedule } from "../src/api/parse-schedule.js";
import { parseEvent } from "../src/api/parse-event.js";
import { parseProfile } from "../src/api/parse-profile.js";
import { parseCompanies, parseAttendees } from "../src/api/parse-discovery.js";
import { parseAmPmTo24, parseScheduleDay } from "../src/api/parse.js";
import { detectClashes, freeSlots } from "../src/agenda.js";
import * as fs from "fs";

const base = "https://attend.websummit.com";
const fix = (n: string) => fs.readFileSync(`fixtures/${n}`, "utf-8");

describe("parseAmPmTo24", () => {
  it("converts", () => {
    expect(parseAmPmTo24("10:00 AM")).toBe("10:00");
    expect(parseAmPmTo24("6:00 PM")).toBe("18:00");
    expect(parseAmPmTo24("12:00 PM")).toBe("12:00");
    expect(parseAmPmTo24("12:00 AM")).toBe("00:00");
  });
});

describe("parseScheduleDay", () => {
  it("parses full weekday", () => {
    expect(parseScheduleDay("Tuesday, 10 November")).toBe("2026-11-10");
  });
  it("parses abbreviated", () => {
    expect(parseScheduleDay("Mon, 09 Nov")).toBe("2026-11-09");
  });
});

describe("parseSchedule", () => {
  it("extracts sessions", () => {
    const r = parseSchedule(fix("schedule.html"), base);
    expect(r.sessions.length).toBeGreaterThan(0);
    const s = r.sessions[0];
    expect(s.title).toBeTruthy();
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.start).toMatch(/^\d{2}:\d{2}$/);
    expect(s.end).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("parseEvent", () => {
  it("extracts detail", () => {
    const e = parseEvent(fix("event.html"), base);
    expect(e).not.toBeNull();
    expect(e!.title).toContain("Opening Night");
    expect(e!.start).toBe("18:00");
    expect(e!.end).toBe("20:00");
  });
});

describe("parseProfile", () => {
  it("extracts attendee", () => {
    const p = parseProfile(fix("profile.html"), base);
    expect(p).not.toBeNull();
    expect(p!.name).toContain("Dinis");
  });
});

describe("parseDiscovery", () => {
  it("extracts companies", () => {
    expect(parseCompanies(fix("discovery.html"), base).length).toBe(45);
  });
});

describe("clashes + free slots", () => {
  it("detects clashes", () => {
    const clashes = detectClashes([
      { id: "a", title: "A", date: "2026-11-10", start: "10:00", end: "11:00" },
      { id: "b", title: "B", date: "2026-11-10", start: "10:30", end: "11:30" },
    ]);
    expect(clashes.has("a")).toBe(true);
    expect(clashes.has("b")).toBe(true);
  });
  it("finds free slots", () => {
    const slots = freeSlots(
      [{ id: "a", title: "A", date: "2026-11-10", start: "10:00", end: "11:00" }],
      "2026-11-10", "09:00", "12:00"
    );
    expect(slots.some(s => s.start === "09:00" && s.end === "10:00")).toBe(true);
  });
});
