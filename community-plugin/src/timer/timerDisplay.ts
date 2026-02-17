import { formatDateTimeInTimezone } from "../core/timezone";
import { TimerSnapshot } from "./timerTypes";

export function formatElapsedClock(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatStartedAtLabel(startedAtMs: number, timezone: string): string {
  return formatDateTimeInTimezone(new Date(startedAtMs), timezone);
}

export function formatStatusBarLabel(snapshot: TimerSnapshot): string {
  if (!snapshot.activeTimer) {
    return "⏱ Idle";
  }

  return `⏱ ${snapshot.activeTimer.projectName} ${formatElapsedClock(snapshot.elapsedMs)}`;
}
