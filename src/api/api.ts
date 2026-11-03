// High-level API facade. Tools call these; they never touch HTML directly.

import { AttendeeClient, AuthRequired, NotFound, RateLimited, Upstream } from "./client.js";
import { get, set, invalidatePrefix, clear } from "./cache.js";
import { parseSchedule } from "./parse-schedule.js";
import { parseEvent } from "./parse-event.js";
import { parseProfile } from "./parse-profile.js";
import { parseCompanies, parseAttendees } from "./parse-discovery.js";
import type { Session, Attendee, Company, MyScheduleEntry } from "../domain.js";

const SCHEDULE_TTL = 600_000;
const DETAIL_TTL = 300_000;
const MY_TTL = 30_000;

export class Api {
  constructor(public readonly client: AttendeeClient) {}

  private async html(path: string): Promise<string> {
    return this.client.get(path);
  }

  async searchSessions(query: string, opts: { day?: string; track?: string; limit?: number } = {}): Promise<Session[]> {
    const params = new URLSearchParams();
    params.set("active_tab", "available-events");
    if (query) params.set("search", query);
    if (opts.day) params.set("day", opts.day);
    if (opts.track) params.set("tracks[]", opts.track);
    const path = `/lis26/schedule?${params}`;
    const html = await this.html(path);
    const { sessions } = parseSchedule(html, this.client.baseUrl);
    return sessions.slice(0, opts.limit ?? 50);
  }

  async getSession(id: string): Promise<Session> {
    const cached = get<Session>(`event:${id}`);
    if (cached) return cached;
    const html = await this.html(`/lis26/events/${id}?active_tab=available-events`);
    const s = parseEvent(html, this.client.baseUrl);
    if (!s || !s.id) throw new NotFound(`session ${id}`);
    set(`event:${id}`, s, DETAIL_TTL);
    return s;
  }

  async mySchedule(): Promise<MyScheduleEntry[]> {
    const cached = get<MyScheduleEntry[]>(`myschedule`);
    if (cached) return cached;
    const html = await this.html(`/lis26/schedule?active_tab=my-schedule`);
    const { mySchedule } = parseSchedule(html, this.client.baseUrl);
    set(`myschedule`, mySchedule, MY_TTL);
    return mySchedule;
  }

  async searchAttendees(query: string, limit = 25): Promise<Attendee[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    const html = await this.html(`/lis26/discovery?${params}`);
    const attendees = parseAttendees(html, this.client.baseUrl);
    return attendees.slice(0, limit);
  }

  async searchCompanies(query: string, limit = 25): Promise<Company[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    const html = await this.html(`/lis26/discovery?${params}`);
    const companies = parseCompanies(html, this.client.baseUrl);
    return companies.slice(0, limit);
  }

  async getAttendee(id: string): Promise<Attendee> {
    const cached = get<Attendee>(`attendee:${id}`);
    if (cached) return cached;
    const html = await this.html(`/lis26/profiles/${id}`);
    const a = parseProfile(html, this.client.baseUrl);
    if (!a || !a.id) throw new NotFound(`attendee ${id}`);
    set(`attendee:${id}`, a, DETAIL_TTL);
    return a;
  }

  async getCompany(id: string): Promise<Company> {
    const cached = get<Company>(`company:${id}`);
    if (cached) return cached;
    const html = await this.html(`/lis26/company/${id}`);
    const companies = parseCompanies(html, this.client.baseUrl);
    const c = companies[0];
    if (!c) throw new NotFound(`company ${id}`);
    set(`company:${id}`, c, DETAIL_TTL);
    return c;
  }

  invalidateWrites() {
    invalidatePrefix("myschedule");
  }
}

export { AuthRequired, NotFound, RateLimited, Upstream };
