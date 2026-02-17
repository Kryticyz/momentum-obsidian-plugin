import { describe, expect, test } from "bun:test";
import { COMMAND_CATALOG, COMMAND_IDS } from "../src/plugin/commandCatalog";
import { runStartTimerFlowCore } from "../src/timer/startTimerFlowCore";
import { runStopTimerFlowCore } from "../src/timer/stopTimerFlowCore";
import { TimerService } from "../src/timer/timerService";

describe("plugin smoke checks", () => {
  test("command catalog contains expected commands and unique ids", () => {
    const ids = COMMAND_CATALOG.map((command) => command.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
    expect(ids).toContain(COMMAND_IDS.regenerateSnapshot);
    expect(ids).toContain(COMMAND_IDS.startTimer);
    expect(ids).toContain(COMMAND_IDS.stopTimer);
    expect(ids).toContain(COMMAND_IDS.openTimerPanel);
    expect(ids).toContain(COMMAND_IDS.exportTimeEntries);
  });

  test("timer can start and stop through core flows", async () => {
    let now = 1000;
    const service = new TimerService({
      initialTimer: null,
      now: () => now,
      tickMs: 60_000,
      saveActiveTimer: async () => {}
    });

    const notices: string[] = [];
    const appended: string[] = [];

    const started = await runStartTimerFlowCore({
      timerService: service,
      getActiveProjects: async () => [{ path: "P.md", name: "Project Smoke" }],
      openPicker: async (_title, items) => items[0]?.value ?? null,
      openTextPrompt: async () => null,
      notify: (message) => notices.push(message)
    });

    expect(started).toBe(true);
    expect(service.isRunning()).toBe(true);

    now += 7 * 60_000;
    const stopped = await runStopTimerFlowCore({
      timerService: service,
      timezone: "Australia/Sydney",
      noteOverride: "Smoke test",
      appendLogEntry: async (_dateIso, line) => appended.push(line),
      openTextPrompt: async () => null,
      notify: (message) => notices.push(message)
    });

    expect(stopped).toBe(true);
    expect(service.isRunning()).toBe(false);
    expect(appended).toHaveLength(1);
    expect(appended[0]).toContain("Project Smoke");
    service.dispose();
  });
});
