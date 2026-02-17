import { describe, expect, test } from "bun:test";
import { TimerService } from "../src/timer/timerService";
import { ActiveTimerState } from "../src/timer/timerTypes";

describe("timer service", () => {
  test("starts, reports stop details, and clears", async () => {
    const persisted: Array<ActiveTimerState | null> = [];
    let now = 1_000;

    const service = new TimerService({
      initialTimer: null,
      now: () => now,
      tickMs: 60_000,
      saveActiveTimer: async (activeTimer) => {
        persisted.push(activeTimer ? { ...activeTimer } : null);
      }
    });

    expect(service.isRunning()).toBe(false);

    const started = await service.start({
      projectPath: "Projects/Alpha.md",
      projectName: "Alpha"
    });

    expect(started).toBe(true);
    expect(service.isRunning()).toBe(true);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.projectName).toBe("Alpha");

    now = 62_000;
    const stopDetails = service.getStopDetails();
    expect(stopDetails).not.toBeNull();
    expect(stopDetails?.activeTimer.projectName).toBe("Alpha");
    expect(stopDetails?.durationMinutes).toBe(1);

    await service.clear();
    expect(service.isRunning()).toBe(false);
    expect(persisted).toHaveLength(2);
    expect(persisted[1]).toBeNull();

    service.dispose();
  });

  test("returns false when starting while already running", async () => {
    const service = new TimerService({
      initialTimer: null,
      tickMs: 60_000,
      saveActiveTimer: async () => {}
    });

    const first = await service.start({
      projectPath: "Projects/Alpha.md",
      projectName: "Alpha"
    });
    const second = await service.start({
      projectPath: "Projects/Beta.md",
      projectName: "Beta"
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(service.getActiveTimer()?.projectName).toBe("Alpha");

    service.dispose();
  });

  test("rolls back state when persistence fails on start", async () => {
    const service = new TimerService({
      initialTimer: null,
      tickMs: 60_000,
      saveActiveTimer: async () => {
        throw new Error("persist failed");
      }
    });

    await expect(
      service.start({
        projectPath: "Projects/Alpha.md",
        projectName: "Alpha"
      })
    ).rejects.toThrow("persist failed");

    expect(service.isRunning()).toBe(false);
    expect(service.getActiveTimer()).toBeNull();
    service.dispose();
  });

  test("restores timer when clearing fails to persist", async () => {
    const initialTimer: ActiveTimerState = {
      projectPath: "Projects/Alpha.md",
      projectName: "Alpha",
      startedAt: Date.now() - 60_000
    };

    const service = new TimerService({
      initialTimer,
      tickMs: 60_000,
      saveActiveTimer: async (activeTimer) => {
        if (!activeTimer) {
          throw new Error("persist failed");
        }
      }
    });

    await expect(service.clear()).rejects.toThrow("persist failed");
    expect(service.isRunning()).toBe(true);
    expect(service.getActiveTimer()?.projectName).toBe("Alpha");
    service.dispose();
  });

  test("isolates listener exceptions from timer state changes", async () => {
    const service = new TimerService({
      initialTimer: null,
      tickMs: 60_000,
      saveActiveTimer: async () => {}
    });

    service.subscribe(() => {
      throw new Error("listener failed");
    });

    const started = await service.start({
      projectPath: "Projects/Alpha.md",
      projectName: "Alpha"
    });
    expect(started).toBe(true);
    expect(service.isRunning()).toBe(true);

    const cleared = await service.clear();
    expect(cleared?.projectName).toBe("Alpha");
    expect(service.isRunning()).toBe(false);
    service.dispose();
  });
});
