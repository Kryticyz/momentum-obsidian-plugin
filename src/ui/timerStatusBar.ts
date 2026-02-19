import { TimerService } from "../timer/timerService";
import { formatStatusBarLabel } from "../timer/timerDisplay";

interface TimerStatusBarControllerOptions {
  element: HTMLElement;
  timerService: TimerService;
  getTimezone: () => string;
  startTimer: () => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
}

/**
 * Binds timer state to a clickable status bar element.
 */
export class TimerStatusBarController {
  private readonly element: HTMLElement;
  private readonly timerService: TimerService;
  private readonly getTimezone: () => string;
  private readonly startTimer: () => Promise<boolean>;
  private readonly stopTimer: () => Promise<boolean>;
  private unsubscribe: () => void = () => {};

  /**
   * Creates the status bar controller and subscribes to timer updates.
   */
  constructor(options: TimerStatusBarControllerOptions) {
    this.element = options.element;
    this.timerService = options.timerService;
    this.getTimezone = options.getTimezone;
    this.startTimer = options.startTimer;
    this.stopTimer = options.stopTimer;

    this.element.addClass("momentum-status-bar");
    this.element.addEventListener("click", this.onClick);

    this.unsubscribe = this.timerService.subscribe((snapshot) => {
      try {
        this.element.textContent = formatStatusBarLabel(snapshot);
        const timezone = this.getTimezone();
        this.element.setAttribute("aria-label", `Project timer (${timezone})`);
        this.element.title = timezone;
      } catch (error) {
        console.error("Momentum: failed to render status bar timer.", error);
      }
    });
  }

  /**
   * Tears down listeners for plugin unload.
   */
  dispose(): void {
    this.unsubscribe();
    this.element.removeEventListener("click", this.onClick);
  }

  /**
   * Toggles timer start/stop based on the current running state.
   */
  private onClick = (): void => {
    if (this.timerService.isRunning()) {
      void this.stopTimer();
      return;
    }

    void this.startTimer();
  };
}
