// Domain types. Tools only ever work with these — never raw HTML.

export interface Session {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD in Lisbon time
  start: string; // HH:MM
  end: string; // HH:MM
  track?: string;
  stage?: string;
  speakers: Speaker[];
  language?: string;
  format?: string;
  capacity?: number;
  url: string;
}

export interface Speaker {
  id: string;
  name: string;
  bio?: string;
  company?: string;
  sessions: string[]; // session ids
  url: string;
}

export interface Attendee {
  id: string;
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  location?: string;
  url: string;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  industry?: string;
  type?: string; // startup / partner / exhibitor
  description?: string;
  url: string;
}

export interface MyScheduleEntry {
  sessionId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  track?: string;
  stage?: string;
  url: string;
}

export type ResponseKind = "going" | "interested" | "not_going";

export interface MeetingRequest {
  to: string; // attendee id
  message: string;
  duration?: number;
  slot?: string;
}

export interface ConnectionRequest {
  to: string;
  message: string;
}