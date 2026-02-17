import { describe, expect, test } from "bun:test";
import {
  formatElapsedClock,
  formatStatusBarLabel
} from "../src/timer/timerDisplay";

describe("timer display", () => {
  test("formats elapsed time as hh:mm:ss", () => {
    expect(formatElapsedClock(0)).toBe("00:00:00");
    expect(formatElapsedClock(1_000)).toBe("00:00:01");
    expect(formatElapsedClock(65_000)).toBe("00:01:05");
    expect(formatElapsedClock(3_726_000)).toBe("01:02:06");
  });

  test("formats status bar label for idle and running states", () => {
    const idle = formatStatusBarLabel({
      activeTimer: null,
      now: 100,
      elapsedMs: 0
    });
    expect(idle).toBe("⏱ Idle");

    const running = formatStatusBarLabel({
      activeTimer: {
        projectPath: "Projects/Alpha.md",
        projectName: "Alpha",
        startedAt: 0
      },
      now: 65_000,
      elapsedMs: 65_000
    });
    expect(running).toBe("⏱ Alpha 00:01:05");
  });
});
