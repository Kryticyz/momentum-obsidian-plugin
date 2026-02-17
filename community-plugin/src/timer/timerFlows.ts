import { App, Notice } from "obsidian";
import { ProjectRecord } from "../core/projects";
import { openPickerModal, openTextPromptModal } from "../ui/modals";
import { PickerItem } from "../ui/pickerTypes";
import { runStartTimerFlowCore } from "./startTimerFlowCore";
import { runStopTimerFlowCore } from "./stopTimerFlowCore";
import { TimerService } from "./timerService";

type PickerOpener = <T>(
  app: App,
  title: string,
  items: PickerItem<T>[]
) => Promise<T | null>;

type TextPromptOpener = (
  app: App,
  title: string,
  placeholder: string,
  initialValue?: string
) => Promise<string | null>;

interface FlowUiDeps {
  notify?: (message: string) => void;
  openPickerModal?: PickerOpener;
  openTextPromptModal?: TextPromptOpener;
}

interface StartTimerFlowInput {
  app: App;
  timerService: TimerService;
  getActiveProjects: () => Promise<ProjectRecord[]>;
  ui?: FlowUiDeps;
}

interface StopTimerFlowInput {
  app: App;
  timerService: TimerService;
  timezone: string;
  noteOverride?: string;
  appendLogEntry: (dateIso: string, entryLine: string) => Promise<void>;
  ui?: FlowUiDeps;
}

export async function runStartTimerFlow(input: StartTimerFlowInput): Promise<boolean> {
  const openPicker = input.ui?.openPickerModal ?? openPickerModal;
  const openPrompt = input.ui?.openTextPromptModal ?? openTextPromptModal;

  return runStartTimerFlowCore({
    timerService: input.timerService,
    getActiveProjects: input.getActiveProjects,
    openPicker: (title, items) => openPicker(input.app, title, items),
    openTextPrompt: (title, placeholder, initialValue = "") =>
      openPrompt(input.app, title, placeholder, initialValue),
    notify: (message) => notify(input.ui, message)
  });
}

export async function runStopTimerFlow(input: StopTimerFlowInput): Promise<boolean> {
  const openPrompt = input.ui?.openTextPromptModal ?? openTextPromptModal;
  return runStopTimerFlowCore({
    timerService: input.timerService,
    timezone: input.timezone,
    noteOverride: input.noteOverride,
    appendLogEntry: input.appendLogEntry,
    openTextPrompt: (title, placeholder, initialValue = "") =>
      openPrompt(input.app, title, placeholder, initialValue),
    notify: (message) => notify(input.ui, message)
  });
}

function notify(ui: FlowUiDeps | undefined, message: string): void {
  if (ui?.notify) {
    ui.notify(message);
    return;
  }

  new Notice(message);
}
