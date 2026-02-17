import { describe, expect, test } from "bun:test";
import {
  formatMinutes,
  getNoteContextFromBasename,
  getWeekStartSunday,
  isDateInWeek,
  minutesFromTimeRange
} from "../src/core/date";

describe("date helpers", () => {
  test("detects daily and weekly note names", () => {
    expect(getNoteContextFromBasename("2026-02-12")).toEqual({
      kind: "daily",
      date: "2026-02-12",
      weekStart: "2026-02-08"
    });

    expect(getNoteContextFromBasename("Weekly Note 2026-02-08")).toEqual({
      kind: "weekly",
      date: "2026-02-08",
      weekStart: "2026-02-08"
    });

    expect(getNoteContextFromBasename("Project Alpha")).toBeNull();
  });

  test("computes Sunday week starts", () => {
    expect(getWeekStartSunday("2026-02-12")).toBe("2026-02-08");
    expect(getWeekStartSunday("2026-02-08")).toBe("2026-02-08");
  });

  test("checks if date belongs to week", () => {
    expect(isDateInWeek("2026-02-08", "2026-02-08")).toBe(true);
    expect(isDateInWeek("2026-02-14", "2026-02-08")).toBe(true);
    expect(isDateInWeek("2026-02-15", "2026-02-08")).toBe(false);
  });

  test("formats durations and parses ranges", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(75)).toBe("1h 15m");
    expect(minutesFromTimeRange("09:10", "09:45")).toBe(35);
    expect(minutesFromTimeRange("23:30", "00:15")).toBe(45);
  });
});
