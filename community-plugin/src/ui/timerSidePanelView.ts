import {
  ButtonComponent,
  ItemView,
  TextAreaComponent,
  WorkspaceLeaf
} from "obsidian";
import {
  formatElapsedClock,
  formatStartedAtLabel
} from "../timer/timerDisplay";
import { TimerService } from "../timer/timerService";
import { TimerSnapshot } from "../timer/timerTypes";

export const TIMER_SIDE_PANEL_VIEW_TYPE = "project-insights-timer-view";

interface TimerSidePanelViewOptions {
  timerService: TimerService;
  getTimezone: () => string;
  startTimer: () => Promise<boolean>;
  stopTimer: (noteOverride?: string) => Promise<boolean>;
  switchTimer: (noteOverride?: string) => Promise<boolean>;
  openTodayDailyNote: () => Promise<void>;
}

export class TimerSidePanelView extends ItemView {
  private readonly options: TimerSidePanelViewOptions;
  private unsubscribe: () => void = () => {};
  private projectEl: HTMLElement | null = null;
  private elapsedEl: HTMLElement | null = null;
  private startedAtEl: HTMLElement | null = null;
  private noteInput: TextAreaComponent | null = null;
  private startButton: ButtonComponent | null = null;
  private stopButton: ButtonComponent | null = null;
  private switchButton: ButtonComponent | null = null;

  constructor(leaf: WorkspaceLeaf, options: TimerSidePanelViewOptions) {
    super(leaf);
    this.options = options;
  }

  getViewType(): string {
    return TIMER_SIDE_PANEL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Project Timer";
  }

  getIcon(): string {
    return "timer";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("project-insights-timer-panel");

    this.contentEl.createEl("h3", { text: "Project Timer" });

    const statusWrap = this.contentEl.createDiv({ cls: "project-insights-timer-status" });
    this.projectEl = statusWrap.createDiv({ cls: "project-insights-timer-project" });
    this.elapsedEl = statusWrap.createDiv({ cls: "project-insights-timer-elapsed" });
    this.startedAtEl = statusWrap.createDiv({ cls: "project-insights-timer-started" });

    const noteSection = this.contentEl.createDiv({ cls: "project-insights-timer-note" });
    noteSection.createEl("label", { text: "Work note for stop/switch" });
    this.noteInput = new TextAreaComponent(noteSection);
    this.noteInput.inputEl.rows = 3;
    this.noteInput.inputEl.addClass("project-insights-note-input");
    this.noteInput.setPlaceholder("Optional note. Leave blank to prompt on stop.");

    const controls = this.contentEl.createDiv({ cls: "project-insights-timer-actions" });

    this.startButton = new ButtonComponent(controls)
      .setButtonText("Start Timer")
      .onClick(() => {
        void this.options.startTimer();
      });

    this.stopButton = new ButtonComponent(controls)
      .setButtonText("Stop & Log")
      .setCta()
      .onClick(() => {
        void this.stopWithOptionalNote();
      });

    this.switchButton = new ButtonComponent(controls)
      .setButtonText("Switch Project")
      .onClick(() => {
        void this.switchWithOptionalNote();
      });

    new ButtonComponent(controls)
      .setButtonText("Open Today")
      .onClick(() => {
        void this.options.openTodayDailyNote();
      });

    this.unsubscribe = this.options.timerService.subscribe((snapshot) => {
      this.renderSnapshot(snapshot);
    });
  }

  async onClose(): Promise<void> {
    this.unsubscribe();
    this.contentEl.empty();
  }

  private renderSnapshot(snapshot: TimerSnapshot): void {
    if (!this.projectEl || !this.elapsedEl || !this.startedAtEl) {
      return;
    }

    if (!snapshot.activeTimer) {
      this.projectEl.setText("No timer running");
      this.elapsedEl.setText(formatElapsedClock(0));
      this.startedAtEl.setText("Started: -");
      this.startButton?.setDisabled(false);
      this.stopButton?.setDisabled(true);
      this.switchButton?.setDisabled(false);
      return;
    }

    this.projectEl.setText(snapshot.activeTimer.projectName);
    this.elapsedEl.setText(formatElapsedClock(snapshot.elapsedMs));
    this.startedAtEl.setText(
      `Started: ${formatStartedAtLabel(snapshot.activeTimer.startedAt, this.options.getTimezone())}`
    );
    this.startButton?.setDisabled(true);
    this.stopButton?.setDisabled(false);
    this.switchButton?.setDisabled(false);
  }

  private async stopWithOptionalNote(): Promise<void> {
    const noteOverride = this.getOptionalNoteOverride();
    const stopped = await this.options.stopTimer(noteOverride);
    if (stopped && this.noteInput) {
      this.noteInput.setValue("");
    }
  }

  private async switchWithOptionalNote(): Promise<void> {
    const noteOverride = this.getOptionalNoteOverride();
    const switched = await this.options.switchTimer(noteOverride);
    if (switched && this.noteInput) {
      this.noteInput.setValue("");
    }
  }

  private getOptionalNoteOverride(): string | undefined {
    if (!this.noteInput) {
      return undefined;
    }

    const value = this.noteInput.getValue().trim();
    return value.length > 0 ? value : undefined;
  }
}
