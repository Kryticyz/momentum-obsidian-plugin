import { ActiveTimerState } from "../timer/timerTypes";
import { ExportTarget, MomentumSettings } from "./settings";

export const CURRENT_DATA_VERSION = 2;

export interface PersistedDataV2 {
  version: typeof CURRENT_DATA_VERSION;
  settings: Partial<MomentumSettings>;
  activeTimer: ActiveTimerState | null;
}

export interface PersistenceLoadResult {
  data: PersistedDataV2;
  migrated: boolean;
}

export function loadPersistedData(raw: unknown): PersistenceLoadResult {
  const record = asRecord(raw);
  const version = typeof record?.version === "number" ? record.version : null;
  const settings = sanitizeSettings(record?.settings);
  const activeTimer = sanitizeActiveTimer(record?.activeTimer);

  const data: PersistedDataV2 = {
    version: CURRENT_DATA_VERSION,
    settings,
    activeTimer
  };

  return {
    data,
    migrated: version !== CURRENT_DATA_VERSION
  };
}

export function buildPersistedData(
  settings: MomentumSettings,
  activeTimer: ActiveTimerState | null
): PersistedDataV2 {
  return {
    version: CURRENT_DATA_VERSION,
    settings,
    activeTimer: sanitizeActiveTimer(activeTimer)
  };
}

function sanitizeSettings(raw: unknown): Partial<MomentumSettings> {
  const record = asRecord(raw);
  if (!record) {
    return {};
  }

  const settings: Partial<MomentumSettings> = {};

  if (typeof record.dueDateField === "string") {
    settings.dueDateField = record.dueDateField;
  }
  if (typeof record.timezone === "string") {
    settings.timezone = record.timezone;
  }
  if (typeof record.exportPath === "string") {
    settings.exportPath = record.exportPath;
  }
  if (isExportTarget(record.exportTarget)) {
    settings.exportTarget = record.exportTarget;
  }
  if (typeof record.exportBackendUrl === "string") {
    settings.exportBackendUrl = record.exportBackendUrl;
  }
  if (typeof record.autoInsertOnCreate === "boolean") {
    settings.autoInsertOnCreate = record.autoInsertOnCreate;
  }
  if (typeof record.createDelayMs === "number" && Number.isFinite(record.createDelayMs)) {
    settings.createDelayMs = Math.max(0, Math.floor(record.createDelayMs));
  }
  if (typeof record.dailyNoteFolder === "string") {
    settings.dailyNoteFolder = record.dailyNoteFolder;
  }

  return settings;
}

function isExportTarget(value: unknown): value is ExportTarget {
  return value === "jsonl" || value === "backend-refresh";
}

function sanitizeActiveTimer(raw: unknown): ActiveTimerState | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const projectPath = typeof record.projectPath === "string" ? record.projectPath : null;
  const projectName = typeof record.projectName === "string" ? record.projectName : null;
  const startedAt = typeof record.startedAt === "number" && Number.isFinite(record.startedAt)
    ? record.startedAt
    : null;

  if (!projectPath || !projectName || startedAt === null) {
    return null;
  }

  return { projectPath, projectName, startedAt };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}
