import { minutesFromTimeRange } from "./date";

export interface TimeLogEntry {
  filePath: string;
  date: string;
  project: string;
  start: string;
  end: string;
  minutes: number;
  note: string;
  lineNumber: number;
}

interface ParsedHeading {
  level: number;
  title: string;
}

const TIME_LOG_LINE_RE =
  /^\s*-\s*(\d{2}:\d{2})-(\d{2}:\d{2})\s+\[\[([^\]]+)\]\](?:\s+\((\d+)m\))?(?:\s+"([^"]*)")?\s*$/;

/**
 * Parses a single time-log markdown list item into structured fields.
 */
export function parseTimeLogLine(line: string): Omit<TimeLogEntry, "filePath" | "date" | "lineNumber"> | null {
  const match = line.match(TIME_LOG_LINE_RE);
  if (!match) {
    return null;
  }

  const start = match[1];
  const end = match[2];
  const rawLink = match[3] ?? "";
  const parsedProject = normalizeProjectFromLink(rawLink);
  if (!parsedProject) {
    return null;
  }

  const explicitMinutes = match[4] ? Number(match[4]) : NaN;
  const minutes = Number.isFinite(explicitMinutes) ? explicitMinutes : minutesFromTimeRange(start, end);
  const note = (match[5] ?? "").trim();

  return {
    project: parsedProject,
    start,
    end,
    minutes: Math.max(0, minutes),
    note
  };
}

/**
 * Extracts all time-log entries from a named level-2 section in a note.
 */
export function parseTimeLogsFromContent(
  content: string,
  filePath: string,
  dateIso: string,
  headingTitle = "Time Logs"
): TimeLogEntry[] {
  const lines = splitLines(content);
  const section = findSectionBounds(lines, headingTitle);
  if (!section) {
    return [];
  }

  const entries: TimeLogEntry[] = [];

  for (let index = section.start + 1; index < section.end; index += 1) {
    const parsed = parseTimeLogLine(lines[index]);
    if (!parsed) {
      continue;
    }

    entries.push({
      ...parsed,
      filePath,
      date: dateIso,
      lineNumber: index + 1
    });
  }

  return entries;
}

/**
 * Aggregates minutes by normalized project name.
 */
export function aggregateMinutesByProject(entries: TimeLogEntry[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const key = entry.project.trim().toLowerCase();
    totals.set(key, (totals.get(key) ?? 0) + entry.minutes);
  }

  return totals;
}

/**
 * Encodes time-log entries to newline-delimited JSON.
 */
export function entriesToJsonl(entries: TimeLogEntry[]): string {
  const lines = entries
    .map((entry) =>
      JSON.stringify({
        source: "daily-note",
        filePath: entry.filePath,
        date: entry.date,
        project: entry.project,
        start: entry.start,
        end: entry.end,
        minutes: entry.minutes,
        note: entry.note,
        lineNumber: entry.lineNumber
      })
    )
    .join("\n");

  return lines.length > 0 ? `${lines}\n` : "";
}

/**
 * Normalizes a wiki-link target into a project name token.
 */
function normalizeProjectFromLink(rawLink: string): string | null {
  const target = rawLink.split("|")[0].trim();
  if (!target) {
    return null;
  }

  const leaf = target.split("/").at(-1)?.trim();
  if (!leaf) {
    return null;
  }

  return leaf.replace(/\.md$/i, "");
}

/**
 * Splits content into normalized LF-delimited lines.
 */
function splitLines(content: string): string[] {
  return content.length === 0 ? [] : content.replace(/\r\n/g, "\n").split("\n");
}

/**
 * Finds the line bounds for a level-2 section title.
 */
function findSectionBounds(lines: string[], headingTitle: string): { start: number; end: number } | null {
  const title = headingTitle.trim();
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const heading = parseHeading(lines[i]);
    if (heading && heading.level === 2 && heading.title === title) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const heading = parseHeading(lines[i]);
    if (heading && heading.level <= 2) {
      end = i;
      break;
    }
  }

  return { start, end };
}

/**
 * Parses a markdown heading line into level and title components.
 */
function parseHeading(line: string): ParsedHeading | null {
  const match = line.match(/^(#{1,6})\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    title: match[2].trim()
  };
}
