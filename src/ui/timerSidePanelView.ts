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

export const TIMER_SIDE_PANEL_VIEW_TYPE = "momentum-timer-view";

interface TimerSidePanelViewOptions {
  timerService: TimerService;
  getTimezone: () => string;
  startTimer: () => Promise<boolean>;
  startTimerInPast: () => Promise<boolean>;
  adjustTimerStart: () => Promise<boolean>;
  stopTimer: (noteOverride?: string) => Promise<boolean>;
  switchTimer: (noteOverride?: string) => Promise<boolean>;
  openTodayDailyNote: () => Promise<void>;
}

/**
 * Side-panel view for starting/stopping timers and reviewing current timer state.
 */
export class TimerSidePanelView extends ItemView {
  private readonly options: TimerSidePanelViewOptions;
  private unsubscribe: () => void = () => {};
  private projectEl: HTMLElement | null = null;
  private elapsedEl: HTMLElement | null = null;
  private startedAtEl: HTMLElement | null = null;
  private noteInput: TextAreaComponent | null = null;
  private startButton: ButtonComponent | null = null;
  private startInPastButton: ButtonComponent | null = null;
  private adjustStartButton: ButtonComponent | null = null;
  private stopButton: ButtonComponent | null = null;
  private switchButton: ButtonComponent | null = null;

  /**
   * Creates the timer side-panel view bound to controller callbacks.
   */
  constructor(leaf: WorkspaceLeaf, options: TimerSidePanelViewOptions) {
    super(leaf);
    this.options = options;
  }

  /**
   * Returns the unique view type id used for workspace registration.
   */
  getViewType(): string {
    return TIMER_SIDE_PANEL_VIEW_TYPE;
  }

  /**
   * Returns the user-visible name of the side panel.
   */
  getDisplayText(): string {
    return "Project timer";
  }

  /**
   * Returns the icon id used in Obsidian UI chrome.
   */
  getIcon(): string {
    return "timer";
  }

  /**
   * Builds the panel layout and subscribes to timer snapshots.
   */
  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("momentum-timer-panel");

    this.contentEl.createEl("h3", { text: "Project timer" });

    const statusWrap = this.contentEl.createDiv({ cls: "momentum-timer-status" });
    this.projectEl = statusWrap.createDiv({ cls: "momentum-timer-project" });
    this.elapsedEl = statusWrap.createDiv({ cls: "momentum-timer-elapsed" });
    this.startedAtEl = statusWrap.createDiv({ cls: "momentum-timer-started" });

    const noteSection = this.contentEl.createDiv({ cls: "momentum-timer-note" });
    noteSection.createEl("label", { text: "Work note for stop/switch" });
    this.noteInput = new TextAreaComponent(noteSection);
    this.noteInput.inputEl.rows = 3;
    this.noteInput.inputEl.addClass("momentum-note-input");
    this.noteInput.setPlaceholder("Optional note. Leave blank to prompt on stop.");

    const controls = this.contentEl.createDiv({ cls: "momentum-timer-actions" });

    this.startButton = new ButtonComponent(controls)
      .setButtonText("Start timer")
      .onClick(() => {
        void this.options.startTimer();
      });

    this.startInPastButton = new ButtonComponent(controls)
      .setButtonText("Start in past")
      .onClick(() => {
        void this.options.startTimerInPast();
      });

    this.adjustStartButton = new ButtonComponent(controls)
      .setButtonText("Adjust start")
      .onClick(() => {
        void this.options.adjustTimerStart();
      });

    this.stopButton = new ButtonComponent(controls)
      .setButtonText("Stop and log")
      .setCta()
      .onClick(() => {
        void this.stopWithOptionalNote();
      });

    this.switchButton = new ButtonComponent(controls)
      .setButtonText("Switch project")
      .onClick(() => {
        void this.switchWithOptionalNote();
      });

    new ButtonComponent(controls)
      .setButtonText("Open today")
      .onClick(() => {
        void this.options.openTodayDailyNote();
      });

    this.unsubscribe = this.options.timerService.subscribe((snapshot) => {
      this.renderSnapshot(snapshot);
    });
  }

  /**
   * Unsubscribes listeners and clears panel DOM.
   */
  onClose(): void {
    this.unsubscribe();
    this.contentEl.empty();
  }

  /**
   * Updates panel labels and button enabled states from the latest timer snapshot.
   */
  private renderSnapshot(snapshot: TimerSnapshot): void {
    if (!this.projectEl || !this.elapsedEl || !this.startedAtEl) {
      return;
    }

    if (!snapshot.activeTimer) {
      this.projectEl.setText("No timer running");
      this.elapsedEl.setText(formatElapsedClock(0));
      this.startedAtEl.setText("Started: -");
      this.startButton?.setDisabled(false);
      this.startInPastButton?.setDisabled(false);
      this.adjustStartButton?.setDisabled(true);
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
    this.startInPastButton?.setDisabled(true);
    this.adjustStartButton?.setDisabled(false);
    this.stopButton?.setDisabled(false);
    this.switchButton?.setDisabled(false);
  }

  /**
   * Stops the timer using an optional note override and clears note input on success.
   */
  private async stopWithOptionalNote(): Promise<void> {
    const noteOverride = this.getOptionalNoteOverride();
    const stopped = await this.options.stopTimer(noteOverride);
    if (stopped && this.noteInput) {
      this.noteInput.setValue("");
    }
  }

  /**
   * Switches to a new timer using an optional note override and clears note input on success.
   */
  private async switchWithOptionalNote(): Promise<void> {
    const noteOverride = this.getOptionalNoteOverride();
    const switched = await this.options.switchTimer(noteOverride);
    if (switched && this.noteInput) {
      this.noteInput.setValue("");
    }
  }

  /**
   * Returns a trimmed note override only when the input contains text.
   */
  private getOptionalNoteOverride(): string | undefined {
    if (!this.noteInput) {
      return undefined;
    }

    const value = this.noteInput.getValue().trim();
    return value.length > 0 ? value : undefined;
  }
}
