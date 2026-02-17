export interface ZonedParts {
  date: string;
  time: string;
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const entries = formatter.formatToParts(date);
  const map = new Map(entries.map((part) => [part.type, part.value]));

  const year = map.get("year") ?? "0000";
  const month = map.get("month") ?? "01";
  const day = map.get("day") ?? "01";
  const hour = map.get("hour") ?? "00";
  const minute = map.get("minute") ?? "00";

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`
  };
}

export function formatDateInTimezone(date: Date, timezone: string): string {
  return getZonedParts(date, timezone).date;
}

export function formatTimeInTimezone(date: Date, timezone: string): string {
  return getZonedParts(date, timezone).time;
}

export function formatDateTimeInTimezone(date: Date, timezone: string): string {
  const parts = getZonedParts(date, timezone);
  return `${parts.date} ${parts.time}`;
}
