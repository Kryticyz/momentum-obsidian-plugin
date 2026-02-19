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

/**
 * Owns active timer state, persistence, and subscriber notifications.
 */
export class TimerService {
  private activeTimer: ActiveTimerState | null;
  private readonly saveActiveTimer: (activeTimer: ActiveTimerState | null) => Promise<void>;
  private readonly now: () => number;
  private readonly tickMs: number;
  private readonly listeners = new Set<TimerListener>();
  private ticker: ReturnType<typeof globalThis.setInterval> | null = null;

  /**
   * Creates a timer service using persisted state and storage callbacks.
   */
  constructor(options: TimerServiceOptions) {
    this.activeTimer = options.initialTimer;
    this.saveActiveTimer = options.saveActiveTimer;
    this.now = options.now ?? (() => Date.now());
    this.tickMs = options.tickMs ?? 1000;
    this.syncTicker();
  }

  /**
   * Returns the active timer state, or null when idle.
   */
  getActiveTimer(): ActiveTimerState | null {
    return this.activeTimer;
  }

  /**
   * Returns true when a timer is currently running.
   */
  isRunning(): boolean {
    return !!this.activeTimer;
  }

  /**
   * Returns a snapshot containing active timer and elapsed milliseconds.
   */
  getSnapshot(now = this.now()): TimerSnapshot {
    const activeTimer = this.activeTimer;
    const elapsedMs = activeTimer ? Math.max(0, now - activeTimer.startedAt) : 0;

    return {
      activeTimer,
      now,
      elapsedMs
    };
  }

  /**
   * Subscribes to timer updates and immediately emits the current snapshot.
   */
  subscribe(listener: TimerListener): () => void {
    this.listeners.add(listener);
    this.emitToListener(listener, this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Starts a new timer and persists it, rolling back on persistence failure.
   */
  async start(input: TimerStartInput): Promise<boolean> {
    if (this.activeTimer) {
      return false;
    }

    const now = this.now();
    const startedAt = typeof input.startedAtMs === "number" && Number.isFinite(input.startedAtMs)
      ? Math.min(now, input.startedAtMs)
      : now;

    const next: ActiveTimerState = {
      projectPath: input.projectPath,
      projectName: input.projectName,
      startedAt
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

  /**
   * Computes derived stop details for the active timer without mutating state.
   */
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

  /**
   * Adjusts the active timer start timestamp and persists the change.
   */
  async adjustStart(startedAtMs: number): Promise<boolean> {
    const previous = this.activeTimer;
    if (!previous) {
      return false;
    }

    const now = this.now();
    const next: ActiveTimerState = {
      ...previous,
      startedAt: Number.isFinite(startedAtMs)
        ? Math.min(now, startedAtMs)
        : now
    };

    this.activeTimer = next;
    this.syncTicker();
    this.notify();

    try {
      await this.saveActiveTimer(next);
      return true;
    } catch (error) {
      this.activeTimer = previous;
      this.syncTicker();
      this.notify();
      throw error;
    }
  }

  /**
   * Clears the active timer and persists null state.
   */
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

  /**
   * Cleans up ticker and subscribers.
   */
  dispose(): void {
    if (this.ticker) {
      globalThis.clearInterval(this.ticker);
      this.ticker = null;
    }
    this.listeners.clear();
  }

  /**
   * Starts/stops the tick interval based on whether a timer is active.
   */
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

  /**
   * Broadcasts the latest snapshot to all listeners.
   */
  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      this.emitToListener(listener, snapshot);
    }
  }

  /**
   * Invokes a listener with isolation so one failing listener does not break others.
   */
  private emitToListener(listener: TimerListener, snapshot: TimerSnapshot): void {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("Momentum: timer listener failed.", error);
    }
  }
}
