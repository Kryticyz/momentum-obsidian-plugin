import type { FlattenedProject } from "./projects";
import { formatMinutes } from "./date";

export const ACTIVE_PROJECTS_HEADING = "Active Projects";
export const TIME_LOGS_HEADING = "Time Logs";
export const CONTROLS_BLOCK_START = "<!-- project-insights:controls:start -->";
export const CONTROLS_BLOCK_END = "<!-- project-insights:controls:end -->";

const TIME_LOG_TEMPLATE_COMMENT =
  "<!-- Format: - 09:10-09:45 [[Project]] (35m) \"what was done\" -->";

interface SectionBounds {
  start: number;
  end: number;
}

export function upsertActiveProjectsSection(
  content: string,
  flattenedProjects: FlattenedProject[],
  weeklyMinutesByProject: Map<string, number>
): string {
  const lines = renderActiveProjectsSectionLines(flattenedProjects, weeklyMinutesByProject);
  return replaceWholeSection(content, ACTIVE_PROJECTS_HEADING, lines);
}

export function upsertTimeLogsSection(content: string): string {
  const existing = getSectionBodyLines(content, TIME_LOGS_HEADING);
  const preservedLines = existing ? removeExistingControls(existing) : [];

  const body: string[] = [...renderControlsBlockLines(), ""];

  if (preservedLines.length > 0) {
    body.push(...trimLeadingBlankLines(preservedLines));
  } else {
    body.push(TIME_LOG_TEMPLATE_COMMENT);
  }

  return replaceWholeSection(content, TIME_LOGS_HEADING, body);
}

export function appendTimeLogLine(content: string, line: string): string {
  const withSection = upsertTimeLogsSection(content);
  const allLines = splitLines(withSection);
  const bounds = findSectionBounds(allLines, TIME_LOGS_HEADING);

  if (!bounds) {
    return withSection;
  }

  const sectionBody = allLines.slice(bounds.start + 1, bounds.end);
  sectionBody.push(line);

  const replacement = [`## ${TIME_LOGS_HEADING}`, ...sectionBody];
  const updated = [...allLines.slice(0, bounds.start), ...replacement, ...allLines.slice(bounds.end)];
  return joinLines(updated);
}

export function getSectionBodyLines(content: string, headingTitle: string): string[] | null {
  const lines = splitLines(content);
  const bounds = findSectionBounds(lines, headingTitle);
  if (!bounds) {
    return null;
  }

  return lines.slice(bounds.start + 1, bounds.end);
}

function replaceWholeSection(content: string, headingTitle: string, sectionBodyLines: string[]): string {
  const lines = splitLines(content);
  const bounds = findSectionBounds(lines, headingTitle);
  const replacementLines = [`## ${headingTitle}`, ...sectionBodyLines];

  if (!bounds) {
    const output = [...trimTrailingBlankLines(lines)];
    if (output.length > 0) {
      output.push("");
    }
    output.push(...replacementLines);
    return joinLines(output);
  }

  const updated = [...lines.slice(0, bounds.start), ...replacementLines, ...lines.slice(bounds.end)];
  return joinLines(updated);
}

function renderActiveProjectsSectionLines(
  flattenedProjects: FlattenedProject[],
  weeklyMinutesByProject: Map<string, number>
): string[] {
  const lines = ["| Project | Due | This Week |", "| --- | --- | --- |"];

  if (flattenedProjects.length === 0) {
    lines.push("| No active projects | - | 0m |");
    return lines;
  }

  for (const item of flattenedProjects) {
    const nameKey = item.project.name.trim().toLowerCase();
    const weeklyMinutes = weeklyMinutesByProject.get(nameKey) ?? 0;
    const due = item.project.dueDate ?? "-";

    let displayName = `[[${item.project.name}]]`;
    if (item.depth > 0) {
      const indent = "&nbsp;".repeat(item.depth * 4);
      displayName = `${indent}↳ [[${item.project.name}]]`;
    }

    lines.push(`| ${displayName} | ${due} | ${formatMinutes(weeklyMinutes)} |`);
  }

  return lines;
}

function removeExistingControls(bodyLines: string[]): string[] {
  const start = bodyLines.findIndex((line) => line.trim() === CONTROLS_BLOCK_START);
  const end = bodyLines.findIndex((line) => line.trim() === CONTROLS_BLOCK_END);

  if (start === -1 || end === -1 || end < start) {
    return bodyLines;
  }

  const before = bodyLines.slice(0, start);
  const after = bodyLines.slice(end + 1);
  return [...before, ...after];
}

function renderControlsBlockLines(): string[] {
  return [
    CONTROLS_BLOCK_START,
    "```project-timer-controls",
    "```",
    CONTROLS_BLOCK_END
  ];
}

function findSectionBounds(lines: string[], headingTitle: string): SectionBounds | null {
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

function parseHeading(line: string): { level: number; title: string } | null {
  const match = line.match(/^(#{1,6})\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    title: match[2].trim()
  };
}

function splitLines(content: string): string[] {
  return content.length === 0 ? [] : content.replace(/\r\n/g, "\n").split("\n");
}

function joinLines(lines: string[]): string {
  return `${lines.join("\n").replace(/\n{3,}$/g, "\n\n")}\n`;
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const cloned = [...lines];
  while (cloned.length > 0 && cloned[cloned.length - 1].trim().length === 0) {
    cloned.pop();
  }
  return cloned;
}

function trimLeadingBlankLines(lines: string[]): string[] {
  const cloned = [...lines];
  while (cloned.length > 0 && cloned[0].trim().length === 0) {
    cloned.shift();
  }
  return cloned;
}
