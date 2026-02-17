import { describe, expect, test } from "bun:test";
import { ProjectRecord } from "../src/core/projects";
import { runStartTimerFlowCore } from "../src/timer/startTimerFlowCore";
import { TimerService } from "../src/timer/timerService";

function createService(): TimerService {
  return new TimerService({
    initialTimer: null,
    tickMs: 60_000,
    saveActiveTimer: async () => {}
  });
}

describe("timer start flow", () => {
  test("starts timer from picker selection", async () => {
    const notices: string[] = [];
    const service = createService();
    const projects: ProjectRecord[] = [{ path: "Project A.md", name: "Project A" }];

    const started = await runStartTimerFlowCore({
      timerService: service,
      getActiveProjects: async () => projects,
      notify: (message) => notices.push(message),
      openPicker: async (_title, items) => items[0]?.value ?? null,
      openTextPrompt: async () => null
    });

    expect(started).toBe(true);
    expect(service.getActiveTimer()?.projectName).toBe("Project A");
    expect(notices.at(-1)).toBe("Momentum: timer started for Project A.");
    service.dispose();
  });

  test("starts timer using fallback text selection when picker returns null", async () => {
    const notices: string[] = [];
    const service = createService();
    const projects: ProjectRecord[] = [
      { path: "Project A.md", name: "Project A" },
      { path: "Project B.md", name: "Project B" }
    ];

    const started = await runStartTimerFlowCore({
      timerService: service,
      getActiveProjects: async () => projects,
      notify: (message) => notices.push(message),
      openPicker: async () => null,
      openTextPrompt: async () => "Project B"
    });

    expect(started).toBe(true);
    expect(service.getActiveTimer()?.projectName).toBe("Project B");
    expect(notices.at(-1)).toBe("Momentum: timer started for Project B.");
    service.dispose();
  });

  test("returns false when picker and fallback both cancel", async () => {
    const notices: string[] = [];
    const service = createService();
    const projects: ProjectRecord[] = [{ path: "Project A.md", name: "Project A" }];

    const started = await runStartTimerFlowCore({
      timerService: service,
      getActiveProjects: async () => projects,
      notify: (message) => notices.push(message),
      openPicker: async () => null,
      openTextPrompt: async () => null
    });

    expect(started).toBe(false);
    expect(service.getActiveTimer()).toBeNull();
    expect(notices.at(-1)).toBe("Momentum: no project was selected.");
    service.dispose();
  });

  test("returns false with explicit notice when fallback project name is unknown", async () => {
    const notices: string[] = [];
    const service = createService();
    const projects: ProjectRecord[] = [{ path: "Project A.md", name: "Project A" }];

    const started = await runStartTimerFlowCore({
      timerService: service,
      getActiveProjects: async () => projects,
      notify: (message) => notices.push(message),
      openPicker: async () => null,
      openTextPrompt: async () => "Not A Project"
    });

    expect(started).toBe(false);
    expect(service.getActiveTimer()).toBeNull();
    expect(notices).toContain("Momentum: project name not found.");
    expect(notices.at(-1)).toBe("Momentum: no project was selected.");
    service.dispose();
  });

  test("returns false when project loading throws", async () => {
    const notices: string[] = [];
    const service = createService();

    const started = await runStartTimerFlowCore({
      timerService: service,
      getActiveProjects: async () => {
        throw new Error("metadata read failed");
      },
      notify: (message) => notices.push(message),
      openPicker: async () => null,
      openTextPrompt: async () => null
    });

    expect(started).toBe(false);
    expect(service.getActiveTimer()).toBeNull();
    expect(notices.at(-1)).toBe(
      "Momentum: could not load active projects (metadata read failed)."
    );
    service.dispose();
  });
});
