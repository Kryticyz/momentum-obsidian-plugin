import { describe, expect, test } from "bun:test";
import { createSingleResolver } from "../src/ui/singleResolver";

describe("modal resolver guard", () => {
  test("keeps the first resolved value when choose is followed by close", () => {
    const resolved: Array<string | null> = [];
    const resolveOnce = createSingleResolver<string>((value) => {
      resolved.push(value);
    });

    expect(resolveOnce("Project A")).toBe(true);
    expect(resolveOnce(null)).toBe(false);
    expect(resolved).toEqual(["Project A"]);
  });

  test("keeps cancellation when close happens before choose", () => {
    const resolved: Array<string | null> = [];
    const resolveOnce = createSingleResolver<string>((value) => {
      resolved.push(value);
    });

    expect(resolveOnce(null)).toBe(true);
    expect(resolveOnce("Project A")).toBe(false);
    expect(resolved).toEqual([null]);
  });
});
