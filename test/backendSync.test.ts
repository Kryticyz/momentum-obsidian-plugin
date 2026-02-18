import { describe, expect, test } from "bun:test";
import { buildBackendRefreshUrl } from "../src/plugin/backendSync";

describe("backend sync", () => {
  test("builds refresh URL from base host", () => {
    expect(buildBackendRefreshUrl("http://localhost:8080")).toBe("http://localhost:8080/refresh");
  });

  test("keeps explicit refresh URL", () => {
    expect(buildBackendRefreshUrl("http://localhost:8080/refresh")).toBe(
      "http://localhost:8080/refresh"
    );
  });

  test("appends refresh to non-root path", () => {
    expect(buildBackendRefreshUrl("http://localhost:8080/backend")).toBe(
      "http://localhost:8080/backend/refresh"
    );
  });

  test("throws on empty URL", () => {
    expect(() => buildBackendRefreshUrl("   ")).toThrow("backend refresh URL is empty");
  });

  test("throws on invalid URL", () => {
    expect(() => buildBackendRefreshUrl("not-a-url")).toThrow("backend refresh URL is invalid");
  });
});
