import { describe, expect, test } from "bun:test";
import { buildProjectHierarchy, ProjectRecord } from "../src/core/projects";
import {
  ACTIVE_PROJECTS_HEADING,
  appendTimeLogLine,
  upsertActiveProjectsSection,
  upsertTimeLogsSection
} from "../src/core/sections";

describe("section rendering", () => {
  test("inserts active projects section", () => {
    const projects: ProjectRecord[] = [
      { path: "Project A.md", name: "Project A", dueDate: "2026-02-20" },
      { path: "Project B.md", name: "Project B", dueDate: "2026-02-22", parentName: "Project A" }
    ];

    const weekly = new Map<string, number>([["project a", 30], ["project b", 95]]);
    const result = upsertActiveProjectsSection("# Daily Note\n", buildProjectHierarchy(projects), weekly);

    expect(result).toContain(`## ${ACTIVE_PROJECTS_HEADING}`);
    expect(result).toContain("| [[Project A]] | 2026-02-20 | 30m |");
    expect(result).toContain("↳ [[Project B]]");
  });

  test("replaces existing active projects block", () => {
    const existing = [
      "# Daily",
      "",
      "## Active Projects",
      "Old content",
      "",
      "## Time Logs",
      "- keep"
    ].join("\n");

    const updated = upsertActiveProjectsSection(existing, [], new Map());

    expect(updated).toContain("| No active projects | - | 0m |");
    expect(updated).not.toContain("Old content");
    expect(updated).toContain("## Time Logs");
  });

  test("preserves existing time log entries when refreshing controls", () => {
    const existing = [
      "# Daily",
      "",
      "## Time Logs",
      "- 09:10-09:45 [[Project A]] (35m) \"Worked\"",
      ""
    ].join("\n");

    const updated = upsertTimeLogsSection(existing);

    expect(updated).toContain("project-timer-controls");
    expect(updated).toContain("- 09:10-09:45 [[Project A]] (35m) \"Worked\"");
  });

  test("appends new line under time logs", () => {
    const updated = appendTimeLogLine("# Daily\n", "- 10:00-10:15 [[Project A]] (15m) \"Task\"");
    expect(updated).toContain("## Time Logs");
    expect(updated).toContain("- 10:00-10:15 [[Project A]] (15m) \"Task\"");
  });
});
