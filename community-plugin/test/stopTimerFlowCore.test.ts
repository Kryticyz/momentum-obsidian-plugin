import { describe, expect, test } from "bun:test";
import { messages } from "../src/plugin/messages";
import { runStopTimerFlowCore } from "../src/timer/stopTimerFlowCore";
import { TimerService } from "../src/timer/timerService";

function createService(now: () => number): TimerService {
  return new TimerService({
    initialTimer: null,
    now,
    tickMs: 60_000,
    saveActiveTimer: async () => {}
  });
}

describe("stop timer flow core", () => {
  test("stops timer and appends a log entry", async () => {
    let now = 1_000;
    const service = createService(() => now);
    await service.start({
      projectPath: "Projects/Alpha.md",
      projectName: "Alpha"
    });
    now = 1_000 + 32 * 60_000;

    const notices: string[] = [];
    const appended: Array<{ dateIso: string; entryLine: string }> = [];

    const stopped = await runStopTimerFlowCore({
      timerService: service,
      timezone: "Australia/Sydney",
      noteOverride: "Deep work",
      appendLogEntry: async (dateIso, entryLine) => {
        appended.push({ dateIso, entryLine });
      },
      openTextPrompt: async () => null,
      notify: (message) => notices.push(message)
    });

    expect(stopped).toBe(true);
    expect(service.isRunning()).toBe(false);
    expect(appended).toHaveLength(1);
    expect(appended[0]?.entryLine).toContain("[[Alpha]]");
    expect(appended[0]?.entryLine).toContain("\"Deep work\"");
    expect(notices.at(-1)).toContain(messages.timerLogged(32, "Alpha", appended[0]?.dateIso ?? ""));
    service.dispose();
  });

  test("returns false with notice when timer is not running", async () => {
    const service = createService(() => Date.now());
    const notices: string[] = [];

    const stopped = await runStopTimerFlowCore({
      timerService: service,
      timezone: "Australia/Sydney",
      appendLogEntry: async () => {},
      openTextPrompt: async () => null,
      notify: (message) => notices.push(message)
    });

    expect(stopped).toBe(false);
    expect(notices.at(-1)).toBe(messages.timerNoRunning);
    service.dispose();
  });

  test("uses prompt note when no override is supplied", async () => {
    let now = 2_000;
    const service = createService(() => now);
    await service.start({
      projectPath: "Projects/Beta.md",
      projectName: "Beta"
    });
    now += 5 * 60_000;

    const appended: string[] = [];
    const stopped = await runStopTimerFlowCore({
      timerService: service,
      timezone: "Australia/Sydney",
      appendLogEntry: async (_dateIso, entryLine) => {
        appended.push(entryLine);
      },
      openTextPrompt: async () => "Prompt note",
      notify: () => {}
    });

    expect(stopped).toBe(true);
    expect(appended[0]).toContain("\"Prompt note\"");
    service.dispose();
  });
});
