import { TimerService } from "../timer/timerService";
import { formatStatusBarLabel } from "../timer/timerDisplay";

interface TimerStatusBarControllerOptions {
  element: HTMLElement;
  timerService: TimerService;
  getTimezone: () => string;
  startTimer: () => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
}

export class TimerStatusBarController {
  private readonly element: HTMLElement;
  private readonly timerService: TimerService;
  private readonly getTimezone: () => string;
  private readonly startTimer: () => Promise<boolean>;
  private readonly stopTimer: () => Promise<boolean>;
  private unsubscribe: () => void = () => {};

  constructor(options: TimerStatusBarControllerOptions) {
    this.element = options.element;
    this.timerService = options.timerService;
    this.getTimezone = options.getTimezone;
    this.startTimer = options.startTimer;
    this.stopTimer = options.stopTimer;

    this.element.addClass("project-insights-status-bar");
    this.element.addEventListener("click", this.onClick);

    this.unsubscribe = this.timerService.subscribe((snapshot) => {
      try {
        this.element.textContent = formatStatusBarLabel(snapshot);
        const timezone = this.getTimezone();
        this.element.setAttribute("aria-label", `Project timer (${timezone})`);
        this.element.title = timezone;
      } catch (error) {
        console.error("Project Insights: failed to render status bar timer.", error);
      }
    });
  }

  dispose(): void {
    this.unsubscribe();
    this.element.removeEventListener("click", this.onClick);
  }

  private onClick = (): void => {
    if (this.timerService.isRunning()) {
      void this.stopTimer();
      return;
    }

    void this.startTimer();
  };
}
