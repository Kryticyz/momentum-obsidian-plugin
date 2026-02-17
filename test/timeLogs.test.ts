import { describe, expect, test } from "bun:test";
import {
  aggregateMinutesByProject,
  entriesToJsonl,
  parseTimeLogLine,
  parseTimeLogsFromContent
} from "../src/core/timeLogs";

describe("time log parsing", () => {
  test("parses a single time log line", () => {
    const parsed = parseTimeLogLine('- 09:10-09:45 [[folder/Project A|Alias]] (35m) "Deep work"');

    expect(parsed).not.toBeNull();
    expect(parsed?.project).toBe("Project A");
    expect(parsed?.minutes).toBe(35);
    expect(parsed?.note).toBe("Deep work");
  });

  test("parses entries from time logs section only", () => {
    const content = [
      "# Daily",
      "",
      "## Time Logs",
      "- 09:10-09:45 [[Project A]] (35m) \"A\"",
      "- 10:00-10:20 [[Project B]] (20m) \"B\"",
      "",
      "## Other",
      "- 12:00-13:00 [[Ignored]] (60m) \"X\""
    ].join("\n");

    const entries = parseTimeLogsFromContent(content, "2026-02-12.md", "2026-02-12");

    expect(entries).toHaveLength(2);
    expect(entries[0].project).toBe("Project A");
    expect(entries[1].project).toBe("Project B");
  });

  test("aggregates and exports jsonl", () => {
    const entries = parseTimeLogsFromContent(
      "## Time Logs\n- 09:00-09:30 [[Project A]] (30m) \"one\"\n- 09:45-10:00 [[Project A]] (15m) \"two\"\n",
      "2026-02-12.md",
      "2026-02-12"
    );

    const totals = aggregateMinutesByProject(entries);
    expect(totals.get("project a")).toBe(45);

    const jsonl = entriesToJsonl(entries);
    expect(jsonl.trim().split("\n")).toHaveLength(2);
    expect(jsonl).toContain('"project":"Project A"');
  });
});
