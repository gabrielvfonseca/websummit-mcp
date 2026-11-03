// Clash detection, free slots, .ics export
export interface TimeSlot {
  date: string; // YYYY-MM-DD in Lisbon time
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface Session extends TimeSlot {
  id: string;
  title: string;
}

export function detectClashes(sessions: Session[]): Map<string, Session[]> {
  const clashes = new Map<string, Session[]>();
  for (let i = 0; i < sessions.length; i++) {
    const s1 = sessions[i];
    for (let j = i + 1; j < sessions.length; j++) {
      const s2 = sessions[j];
      if (s1.date !== s2.date) continue;
      if (timesOverlap(s1.start, s1.end, s2.start, s2.end)) {
        if (!clashes.has(s1.id)) clashes.set(s1.id, []);
        if (!clashes.has(s2.id)) clashes.set(s2.id, []);
        clashes.get(s1.id)!.push(s2);
        clashes.get(s2.id)!.push(s1);
      }
    }
  }
  return clashes;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const start1 = toMin(s1);
  const end1 = toMin(e1);
  const start2 = toMin(s2);
  const end2 = toMin(e2);
  return start1 < end2 && start2 < end1;
}

export function freeSlots(sessions: Session[], date: string, dayStart: string = "09:00", dayEnd: string = "19:00"): TimeSlot[] {
  const daySessions = sessions
    .filter((s) => s.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));

  const slots: TimeSlot[] = [];
  let currentTime = dayStart;

  for (const session of daySessions) {
    if (timesOverlap(currentTime, addMinutes(currentTime, 1), currentTime, session.start)) {
      if (currentTime < session.start) {
        slots.push({ date, start: currentTime, end: session.start });
      }
    }
    if (session.end > currentTime) {
      currentTime = session.end;
    }
  }

  if (currentTime < dayEnd) {
    slots.push({ date, start: currentTime, end: dayEnd });
  }

  return slots;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function exportIcs(sessions: Session[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WebSummit MCP//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const session of sessions) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${session.id}@websummit-mcp`);
    lines.push(`SUMMARY:${escapeIcs(session.title)}`);
    // Times are in Lisbon local time (UTC+0 in Nov)
    lines.push(`DTSTART;TZID=Europe/Lisbon:${formatIcsDateTime(session.date, session.start)}`);
    lines.push(`DTEND;TZID=Europe/Lisbon:${formatIcsDateTime(session.date, session.end)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatIcsDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-');
  const [h, min] = time.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
