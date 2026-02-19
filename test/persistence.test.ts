import { describe, expect, test } from "bun:test";
import {
  buildPersistedData,
  CURRENT_DATA_VERSION,
  loadPersistedData
} from "../src/plugin/persistence";
import { DEFAULT_SETTINGS } from "../src/plugin/settings";

describe("persistence migration", () => {
  test("migrates legacy shape without version", () => {
    const legacy = {
      settings: {
        dueDateField: "deadline",
        timezone: "UTC"
      },
      activeTimer: {
        projectPath: "Projects/Alpha.md",
        projectName: "Alpha",
        startedAt: 123
      }
    };

    const loaded = loadPersistedData(legacy);
    expect(loaded.migrated).toBe(true);
    expect(loaded.data.version).toBe(CURRENT_DATA_VERSION);
    expect(loaded.data.settings.dueDateField).toBe("deadline");
    expect(loaded.data.activeTimer?.projectName).toBe("Alpha");
  });

  test("keeps valid v2 payload and sanitizes invalid timer", () => {
    const v2 = {
      version: CURRENT_DATA_VERSION,
      settings: {
        exportPath: "config/data.jsonl",
        exportTarget: "backend-refresh",
        exportBackendUrl: "http://localhost:8080"
      },
      activeTimer: {
        projectPath: "Projects/Beta.md",
        projectName: 42,
        startedAt: 456
      }
    };

    const loaded = loadPersistedData(v2);
    expect(loaded.migrated).toBe(false);
    expect(loaded.data.version).toBe(CURRENT_DATA_VERSION);
    expect(loaded.data.settings.exportPath).toBe("config/data.jsonl");
    expect(loaded.data.settings.exportTarget).toBe("backend-refresh");
    expect(loaded.data.settings.exportBackendUrl).toBe("http://localhost:8080");
    expect(loaded.data.activeTimer).toBeNull();
  });

  test("builds persisted data with current version", () => {
    const built = buildPersistedData(DEFAULT_SETTINGS, {
      projectPath: "Projects/Gamma.md",
      projectName: "Gamma",
      startedAt: 789
    });

    expect(built.version).toBe(CURRENT_DATA_VERSION);
    expect(built.settings.exportPath).toBe(DEFAULT_SETTINGS.exportPath);
    expect(built.activeTimer?.projectName).toBe("Gamma");
  });
});
