export interface ActiveTimerState {
  projectPath: string;
  projectName: string;
  startedAt: number;
}

export interface TimerSnapshot {
  activeTimer: ActiveTimerState | null;
  now: number;
  elapsedMs: number;
}

export interface TimerStartInput {
  projectPath: string;
  projectName: string;
  startedAtMs?: number;
}

export type TimerListener = (snapshot: TimerSnapshot) => void;
