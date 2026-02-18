import { describe, expect, test } from "bun:test";
import {
  formatBackdatedStartConfirmation,
  parseBackdatedStartInput
} from "../src/timer/backdatedStartParser";

describe("backdated start parser", () => {
  test("parses plain number as minutes ago", () => {
    const now = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
    const startedAt = parseBackdatedStartInput("45", now);
    expect(startedAt).toBe(now - (45 * 60_000));
  });

  test("parses duration formats with hours and minutes", () => {
    const now = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
    const startedAt = parseBackdatedStartInput("1h30m", now);
    expect(startedAt).toBe(now - (90 * 60_000));
  });

  test("parses exact local 24h time on current day when in the past", () => {
    const now = new Date(2026, 0, 15, 14, 20, 0, 0).getTime();
    const startedAt = parseBackdatedStartInput("09:40", now);

    const expected = new Date(now);
    expected.setHours(9, 40, 0, 0);

    expect(startedAt).toBe(expected.getTime());
  });

  test("rolls exact local time to previous day when today would be future", () => {
    const now = new Date(2026, 0, 15, 1, 10, 0, 0).getTime();
    const startedAt = parseBackdatedStartInput("23:30", now);

    const expected = new Date(now);
    expected.setHours(23, 30, 0, 0);
    expected.setDate(expected.getDate() - 1);

    expect(startedAt).toBe(expected.getTime());
  });

  test("parses exact local 12h time with am/pm", () => {
    const now = new Date(2026, 0, 15, 20, 0, 0, 0).getTime();
    const startedAt = parseBackdatedStartInput("9:15am", now);

    const expected = new Date(now);
    expected.setHours(9, 15, 0, 0);

    expect(startedAt).toBe(expected.getTime());
  });

  test("rejects invalid input", () => {
    const now = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
    const invalidInputs = ["", "0", "tomorrow", "25:00", "13pm", "9:61"];

    for (const input of invalidInputs) {
      expect(parseBackdatedStartInput(input, now)).toBeNull();
    }
  });

  test("formats parse confirmation summary for same day", () => {
    const now = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
    const startedAt = new Date(2026, 0, 15, 9, 40, 0, 0).getTime();
    expect(formatBackdatedStartConfirmation(startedAt, now)).toBe(
      "Starting at 9:40 AM (20m ago)."
    );
  });

  test("formats parse confirmation summary with date when previous day", () => {
    const now = new Date(2026, 0, 15, 1, 5, 0, 0).getTime();
    const startedAt = new Date(2026, 0, 14, 23, 55, 0, 0).getTime();
    expect(formatBackdatedStartConfirmation(startedAt, now)).toBe(
      "Starting at 11:55 PM on 2026-01-14 (70m ago)."
    );
  });
});
