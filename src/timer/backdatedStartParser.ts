const MINUTE_MS = 60_000;

export function parseBackdatedStartInput(raw: string, nowMs: number): number | null {
  const durationMinutes = parseDurationMinutes(raw);
  if (durationMinutes !== null) {
    return nowMs - (durationMinutes * MINUTE_MS);
  }

  return parseLocalClockTime(raw, nowMs);
}

export function formatBackdatedStartConfirmation(startedAtMs: number, nowMs: number): string {
  const startedAt = new Date(startedAtMs);
  const now = new Date(nowMs);
  const minutesAgo = Math.max(1, Math.round((nowMs - startedAtMs) / MINUTE_MS));
  const timeLabel = formatLocalClockLabel(startedAt);
  const dateSuffix = isSameLocalDay(startedAt, now) ? "" : ` on ${formatLocalDate(startedAt)}`;
  return `Starting at ${timeLabel}${dateSuffix} (${minutesAgo}m ago).`;
}

function parseDurationMinutes(raw: string): number | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (normalized.length === 0) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    return toPositiveInteger(normalized);
  }

  const hoursAndMinutes = normalized.match(/^(\d+)h(?:(\d+)m)?$/);
  if (hoursAndMinutes) {
    const hours = Number(hoursAndMinutes[1]);
    const minutesPart = Number(hoursAndMinutes[2] ?? "0");
    const minutes = (hours * 60) + minutesPart;
    return Number.isFinite(minutes) && minutes >= 1 ? minutes : null;
  }

  const minutesOnly = normalized.match(/^(\d+)m$/);
  if (minutesOnly) {
    return toPositiveInteger(minutesOnly[1]);
  }

  return null;
}

function parseLocalClockTime(raw: string, nowMs: number): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?$/i);
  if (!match) {
    return null;
  }

  const hourToken = match[1];
  const minuteToken = match[2];
  const ampmToken = match[3]?.toLowerCase() ?? null;
  const hasMinutes = typeof minuteToken === "string";

  // Prevent ambiguity with plain integers, which map to "minutes ago".
  if (!hasMinutes && !ampmToken) {
    return null;
  }

  const minute = hasMinutes ? Number(minuteToken) : 0;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }

  let hour = Number(hourToken);
  if (!Number.isFinite(hour)) {
    return null;
  }

  if (ampmToken) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    hour = ampmToken === "am" ? hour % 12 : (hour % 12) + 12;
  } else {
    if (hour < 0 || hour > 23) {
      return null;
    }
  }

  const candidate = new Date(nowMs);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() >= nowMs) {
    candidate.setDate(candidate.getDate() - 1);
  }

  return candidate.getTime() < nowMs ? candidate.getTime() : null;
}

function toPositiveInteger(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function formatLocalClockLabel(date: Date): string {
  const hour24 = date.getHours();
  const minute = date.getMinutes();
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
