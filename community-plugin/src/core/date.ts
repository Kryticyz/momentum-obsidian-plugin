export const DAILY_NOTE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const WEEKLY_NOTE_RE = /^Weekly Note (\d{4}-\d{2}-\d{2})$/;

export type NoteKind = "daily" | "weekly";

export interface NoteContext {
  kind: NoteKind;
  date: string;
  weekStart: string;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function getNoteContextFromBasename(basename: string): NoteContext | null {
  if (DAILY_NOTE_RE.test(basename) && isValidIsoDate(basename)) {
    return {
      kind: "daily",
      date: basename,
      weekStart: getWeekStartSunday(basename)
    };
  }

  const weeklyMatch = basename.match(WEEKLY_NOTE_RE);
  if (weeklyMatch && isValidIsoDate(weeklyMatch[1])) {
    return {
      kind: "weekly",
      date: weeklyMatch[1],
      weekStart: weeklyMatch[1]
    };
  }

  return null;
}

export function getWeekStartSunday(dateIso: string): string {
  const date = isoToUtcDate(dateIso);
  const dayOfWeek = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - dayOfWeek);
  return utcDateToIso(date);
}

export function addDays(dateIso: string, days: number): string {
  const date = isoToUtcDate(dateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToIso(date);
}

export function isDateInWeek(dateIso: string, weekStartIso: string): boolean {
  const date = isoToUtcDate(dateIso).getTime();
  const weekStart = isoToUtcDate(weekStartIso).getTime();
  const weekEnd = isoToUtcDate(addDays(weekStartIso, 6)).getTime();
  return date >= weekStart && date <= weekEnd;
}

export function formatMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function minutesFromTimeRange(start: string, end: string): number {
  const startMinutes = parseClockMinutes(start);
  const endMinutes = parseClockMinutes(end);
  if (startMinutes === null || endMinutes === null) {
    return 0;
  }

  const raw = endMinutes - startMinutes;
  if (raw >= 0) {
    return raw;
  }

  // Handle ranges crossing midnight.
  return raw + 24 * 60;
}

function parseClockMinutes(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function isoToUtcDate(dateIso: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function utcDateToIso(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
