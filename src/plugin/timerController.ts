import { App } from "obsidian";
import { messages, toErrorMessage } from "./messages";
import { ProjectScanResult } from "./projectRepository";
import { runStartTimerFlow, runStopTimerFlow } from "../timer/timerFlows";
import { TimerService } from "../timer/timerService";

interface TimerControllerOptions {
  app: App;
  timerService: TimerService;
  getTimezone: () => string;
  getTimerProjects: () => Promise<ProjectScanResult>;
  appendLogEntry: (dateIso: string, entryLine: string) => Promise<void>;
  notify: (message: string) => void;
}

export class TimerController {
  private readonly app: App;
  private readonly timerService: TimerService;
  private readonly getTimezone: () => string;
  private readonly getTimerProjects: () => Promise<ProjectScanResult>;
  private readonly appendLogEntry: (dateIso: string, entryLine: string) => Promise<void>;
  private readonly notifyImpl: (message: string) => void;
  private startInProgress = false;
  private stopInProgress = false;

  constructor(options: TimerControllerOptions) {
    this.app = options.app;
    this.timerService = options.timerService;
    this.getTimezone = options.getTimezone;
    this.getTimerProjects = options.getTimerProjects;
    this.appendLogEntry = options.appendLogEntry;
    this.notifyImpl = options.notify;
  }

  async start(): Promise<boolean> {
    if (this.startInProgress) {
      this.notifyImpl(messages.timerStartInProgress);
      return false;
    }

    this.startInProgress = true;
    try {
      return await runStartTimerFlow({
        app: this.app,
        timerService: this.timerService,
        getActiveProjects: async () => {
          const result = await this.getTimerProjects();
          if (result.parseFailures.length > 0) {
            this.notifyImpl(messages.timerScanParseFailures(result.parseFailures.length));
            console.warn("Momentum: timer project parse failures:", result.parseFailures);
          }
          return result.projects;
        },
        ui: {
          notify: (message) => this.notifyImpl(message)
        }
      });
    } catch (error) {
      console.error(error);
      this.notifyImpl(messages.timerStartFailed(toErrorMessage(error)));
      return false;
    } finally {
      this.startInProgress = false;
    }
  }

  async stop(noteOverride?: string): Promise<boolean> {
    if (this.stopInProgress) {
      this.notifyImpl(messages.timerStopInProgress);
      return false;
    }

    this.stopInProgress = true;
    try {
      return await runStopTimerFlow({
        app: this.app,
        timerService: this.timerService,
        timezone: this.getTimezone(),
        noteOverride,
        appendLogEntry: async (dateIso: string, entryLine: string) => {
          await this.appendLogEntry(dateIso, entryLine);
        },
        ui: {
          notify: (message) => this.notifyImpl(message)
        }
      });
    } catch (error) {
      console.error(error);
      this.notifyImpl(messages.timerStopFailed(toErrorMessage(error)));
      return false;
    } finally {
      this.stopInProgress = false;
    }
  }

  async switch(noteOverride?: string): Promise<boolean> {
    if (this.timerService.isRunning()) {
      const stopped = await this.stop(noteOverride);
      if (!stopped) {
        return false;
      }
    }

    return this.start();
  }
}
