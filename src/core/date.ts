export const DAILY_NOTE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const WEEKLY_NOTE_RE = /^Weekly Note (\d{4}-\d{2}-\d{2})$/;

export type NoteKind = "daily" | "weekly";

export interface NoteContext {
  kind: NoteKind;
  date: string;
  weekStart: string;
}

/**
 * Returns true when a string is a valid calendar date in `YYYY-MM-DD` format.
 */
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

/**
 * Detects whether a note basename represents a supported daily or weekly note.
 */
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

/**
 * Computes the Sunday-start week anchor for a given ISO date.
 */
export function getWeekStartSunday(dateIso: string): string {
  const date = isoToUtcDate(dateIso);
  const dayOfWeek = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - dayOfWeek);
  return utcDateToIso(date);
}

/**
 * Adds a day offset to an ISO date and returns a normalized ISO date.
 */
export function addDays(dateIso: string, days: number): string {
  const date = isoToUtcDate(dateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToIso(date);
}

/**
 * Checks whether an ISO date falls within a Sunday-start week window.
 */
export function isDateInWeek(dateIso: string, weekStartIso: string): boolean {
  const date = isoToUtcDate(dateIso).getTime();
  const weekStart = isoToUtcDate(weekStartIso).getTime();
  const weekEnd = isoToUtcDate(addDays(weekStartIso, 6)).getTime();
  return date >= weekStart && date <= weekEnd;
}

/**
 * Formats minute totals as compact human-readable durations.
 */
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

/**
 * Computes elapsed minutes for an `HH:MM-HH:MM` time range.
 */
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

/**
 * Parses a 24-hour clock string and converts it to total minutes.
 */
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

/**
 * Creates a UTC-noon date object from an ISO date to avoid timezone drift.
 */
function isoToUtcDate(dateIso: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Converts a UTC date back to canonical `YYYY-MM-DD` format.
 */
function utcDateToIso(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
