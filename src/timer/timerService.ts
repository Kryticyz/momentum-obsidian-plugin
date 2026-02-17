import {
  ActiveTimerState,
  TimerListener,
  TimerSnapshot,
  TimerStartInput
} from "./timerTypes";

interface TimerServiceOptions {
  initialTimer: ActiveTimerState | null;
  saveActiveTimer: (activeTimer: ActiveTimerState | null) => Promise<void>;
  now?: () => number;
  tickMs?: number;
}

export interface TimerStopDetails {
  activeTimer: ActiveTimerState;
  startedAt: Date;
  stoppedAt: Date;
  elapsedMs: number;
  durationMinutes: number;
}

export class TimerService {
  private activeTimer: ActiveTimerState | null;
  private readonly saveActiveTimer: (activeTimer: ActiveTimerState | null) => Promise<void>;
  private readonly now: () => number;
  private readonly tickMs: number;
  private readonly listeners = new Set<TimerListener>();
  private ticker: ReturnType<typeof globalThis.setInterval> | null = null;

  constructor(options: TimerServiceOptions) {
    this.activeTimer = options.initialTimer;
    this.saveActiveTimer = options.saveActiveTimer;
    this.now = options.now ?? (() => Date.now());
    this.tickMs = options.tickMs ?? 1000;
    this.syncTicker();
  }

  getActiveTimer(): ActiveTimerState | null {
    return this.activeTimer;
  }

  isRunning(): boolean {
    return !!this.activeTimer;
  }

  getSnapshot(now = this.now()): TimerSnapshot {
    const activeTimer = this.activeTimer;
    const elapsedMs = activeTimer ? Math.max(0, now - activeTimer.startedAt) : 0;

    return {
      activeTimer,
      now,
      elapsedMs
    };
  }

  subscribe(listener: TimerListener): () => void {
    this.listeners.add(listener);
    this.emitToListener(listener, this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(input: TimerStartInput): Promise<boolean> {
    if (this.activeTimer) {
      return false;
    }

    const next: ActiveTimerState = {
      projectPath: input.projectPath,
      projectName: input.projectName,
      startedAt: this.now()
    };

    this.activeTimer = next;
    this.syncTicker();
    this.notify();

    try {
      await this.saveActiveTimer(next);
      return true;
    } catch (error) {
      this.activeTimer = null;
      this.syncTicker();
      this.notify();
      throw error;
    }
  }

  getStopDetails(stoppedAtMs = this.now()): TimerStopDetails | null {
    const activeTimer = this.activeTimer;
    if (!activeTimer) {
      return null;
    }

    const startedAt = new Date(activeTimer.startedAt);
    const stoppedAt = new Date(stoppedAtMs);
    const elapsedMs = Math.max(0, stoppedAt.getTime() - startedAt.getTime());
    const durationMinutes = Math.max(1, Math.round(elapsedMs / (1000 * 60)));

    return {
      activeTimer,
      startedAt,
      stoppedAt,
      elapsedMs,
      durationMinutes
    };
  }

  async clear(): Promise<ActiveTimerState | null> {
    const previous = this.activeTimer;
    if (!previous) {
      return null;
    }

    this.activeTimer = null;
    this.syncTicker();
    this.notify();

    try {
      await this.saveActiveTimer(null);
      return previous;
    } catch (error) {
      this.activeTimer = previous;
      this.syncTicker();
      this.notify();
      throw error;
    }
  }

  dispose(): void {
    if (this.ticker) {
      globalThis.clearInterval(this.ticker);
      this.ticker = null;
    }
    this.listeners.clear();
  }

  private syncTicker(): void {
    if (this.activeTimer && !this.ticker) {
      this.ticker = globalThis.setInterval(() => {
        this.notify();
      }, this.tickMs);
    }

    if (!this.activeTimer && this.ticker) {
      globalThis.clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      this.emitToListener(listener, snapshot);
    }
  }

  private emitToListener(listener: TimerListener, snapshot: TimerSnapshot): void {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("Momentum: timer listener failed.", error);
    }
  }
}
