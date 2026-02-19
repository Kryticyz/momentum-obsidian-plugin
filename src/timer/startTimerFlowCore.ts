import { buildProjectHierarchy, ProjectRecord } from "../core/projects";
import { messages, toErrorMessage } from "../plugin/messages";
import { PickerItem } from "../ui/pickerTypes";
import { TimerService } from "./timerService";

export interface StartTimerFlowCoreInput {
  timerService: TimerService;
  getActiveProjects: () => Promise<ProjectRecord[]>;
  openPicker: (title: string, items: PickerItem<ProjectRecord>[]) => Promise<ProjectRecord | null>;
  openTextPrompt: (
    title: string,
    placeholder: string,
    initialValue?: string
  ) => Promise<string | null>;
  resolveStartedAtMs?: (project: ProjectRecord) => Promise<number | null>;
  notify: (message: string) => void;
}

/**
 * Shared start flow that validates project selection and starts timer persistence.
 */
export async function runStartTimerFlowCore(input: StartTimerFlowCoreInput): Promise<boolean> {
  const running = input.timerService.getActiveTimer();
  if (running) {
    input.notify(messages.timerAlreadyRunning(running.projectName));
    return false;
  }

  let activeProjects: ProjectRecord[];
  try {
    activeProjects = await input.getActiveProjects();
  } catch (error) {
    console.error("Momentum: failed to load timer projects.", error);
    input.notify(messages.timerProjectsLoadFailed(toErrorMessage(error)));
    return false;
  }

  const flattened = buildProjectHierarchy(activeProjects);
  if (flattened.length === 0) {
    input.notify(messages.timerNoProjects);
    return false;
  }

  const items: PickerItem<ProjectRecord>[] = flattened.map((item) => {
    const prefix = item.depth > 0 ? `${"  ".repeat(item.depth)}↳ ` : "";
    const dueLabel = item.project.dueDate ? `Due ${item.project.dueDate}` : "No due date";

    return {
      value: item.project,
      label: `${prefix}${item.project.name}`,
      detail: dueLabel
    };
  });

  let selected: ProjectRecord | null = null;
  try {
    selected = await input.openPicker("Select active project", items);
  } catch (error) {
    console.error("Momentum: failed to open timer project picker.", error);
    input.notify(messages.timerPickerOpenFailed(toErrorMessage(error)));
    return false;
  }

  if (!selected) {
    selected = await resolveSelectionFallback(activeProjects, input.openTextPrompt, input.notify);
    if (!selected) {
      input.notify(messages.timerNoSelection);
      return false;
    }
  }

  let startedAtMs: number | undefined;
  if (input.resolveStartedAtMs) {
    startedAtMs = await input.resolveStartedAtMs(selected) ?? undefined;
    if (startedAtMs === undefined) {
      return false;
    }
  }

  let started = false;
  try {
    started = await input.timerService.start({
      projectPath: selected.path,
      projectName: selected.name,
      startedAtMs
    });
  } catch (error) {
    console.error("Momentum: failed to persist timer start.", error);
    input.notify(messages.timerPersistFailed(toErrorMessage(error)));
    return false;
  }

  if (!started) {
    const current = input.timerService.getActiveTimer();
    if (current) {
      input.notify(messages.timerAlreadyRunning(current.projectName));
    }
    return false;
  }

  input.notify(messages.timerStarted(selected.name));
  return true;
}

/**
 * Prompts for manual project name selection when picker-based selection is cancelled.
 */
async function resolveSelectionFallback(
  activeProjects: ProjectRecord[],
  openTextPrompt: (
    title: string,
    placeholder: string,
    initialValue?: string
  ) => Promise<string | null>,
  notify: (message: string) => void
): Promise<ProjectRecord | null> {
  const fallbackInput = await openTextPrompt(
    "Select project (fallback)",
    "Type project name exactly",
    ""
  );

  if (fallbackInput === null) {
    return null;
  }

  const target = fallbackInput.trim().toLowerCase();
  if (target.length === 0) {
    return null;
  }

  const match = activeProjects.find((project) => project.name.trim().toLowerCase() === target);
  if (!match) {
    notify(messages.timerProjectNameNotFound);
    return null;
  }

  return match;
}
