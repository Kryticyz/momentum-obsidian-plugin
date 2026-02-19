import { App, getFrontMatterInfo, parseYaml, TFile } from "obsidian";
import { DAILY_NOTE_RE, WEEKLY_NOTE_RE } from "../core/date";
import {
  extractParentProjectName,
  hasProjectTag,
  isActiveStatus,
  normalizeDueDate,
  ProjectRecord
} from "../core/projects";

export const TIMER_TERMINAL_STATUSES = [
  "done",
  "complete",
  "completed",
  "cancelled",
  "canceled",
  "archived",
  "inactive",
  "closed"
] as const;

type ScanMode = "timer" | "snapshot";

export interface ProjectScanResult {
  projects: ProjectRecord[];
  parseFailures: string[];
  scannedMarkdownCount: number;
}

interface ProjectRepositoryOptions {
  app: App;
  getDueDateField: () => string;
  timerTerminalStatuses?: readonly string[];
}

/**
 * Scans vault markdown files and returns project records for snapshot/timer flows.
 */
export class ProjectRepository {
  private readonly app: App;
  private readonly getDueDateField: () => string;
  private readonly timerTerminalStatuses: ReadonlySet<string>;

  /**
   * Creates a repository configured with due-date key and terminal status rules.
   */
  constructor(options: ProjectRepositoryOptions) {
    this.app = options.app;
    this.getDueDateField = options.getDueDateField;
    this.timerTerminalStatuses = new Set(options.timerTerminalStatuses ?? TIMER_TERMINAL_STATUSES);
  }

  /**
   * Returns active projects for snapshot rendering.
   */
  async getSnapshotProjects(): Promise<ProjectRecord[]> {
    const result = await this.scan("snapshot");
    return result.projects;
  }

  /**
   * Returns timer-eligible project candidates with scan diagnostics.
   */
  async getTimerCandidateProjects(): Promise<ProjectScanResult> {
    return this.scan("timer");
  }

  /**
   * Performs a full vault scan for projects, filtering according to scan mode.
   */
  async scan(mode: ScanMode): Promise<ProjectScanResult> {
    const projects: ProjectRecord[] = [];
    const parseFailures: string[] = [];
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      if (DAILY_NOTE_RE.test(file.basename) || WEEKLY_NOTE_RE.test(file.basename)) {
        continue;
      }

      try {
        const frontmatter = await this.readFrontmatter(file);
        if (!frontmatter) {
          continue;
        }

        if (!this.hasProjectMarker(frontmatter)) {
          continue;
        }

        const rawStatus = this.getProjectStatus(frontmatter);
        if (mode === "snapshot" && !isActiveStatus(rawStatus)) {
          continue;
        }

        if (mode === "timer" && !this.isTimerEligibleStatus(rawStatus)) {
          continue;
        }

        const dueDateField = this.getDueDateField();
        projects.push({
          path: file.path,
          name: file.basename,
          dueDate: normalizeDueDate(frontmatter[dueDateField]),
          parentName: extractParentProjectName(frontmatter.up)
        });
      } catch (error) {
        parseFailures.push(file.path);
        console.error(`Momentum: skipping project scan for ${file.path}.`, error);
      }
    }

    return {
      projects,
      parseFailures,
      scannedMarkdownCount: files.length
    };
  }

  /**
   * Reads frontmatter from metadata cache or note content.
   */
  private async readFrontmatter(file: TFile): Promise<Record<string, unknown> | null> {
    const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (cached && typeof cached === "object") {
      return cached as Record<string, unknown>;
    }

    const content = await this.app.vault.cachedRead(file);
    const info = getFrontMatterInfo(content);
    if (!info.exists) {
      return null;
    }

    const parsed: unknown = parseYaml(info.frontmatter);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Frontmatter is not an object in ${file.path}`);
    }

    return parsed as Record<string, unknown>;
  }

  /**
   * Detects project markers across common frontmatter conventions.
   */
  private hasProjectMarker(frontmatter: Record<string, unknown>): boolean {
    if (hasProjectTag(frontmatter.tags) || hasProjectTag(frontmatter.tag)) {
      return true;
    }

    if (this.normalizeFrontmatterString(frontmatter.type) === "project") {
      return true;
    }

    if (this.normalizeFrontmatterString(frontmatter.kind) === "project") {
      return true;
    }

    const projectFlag = frontmatter.project;
    if (typeof projectFlag === "boolean") {
      return projectFlag;
    }

    if (typeof projectFlag === "string") {
      const normalized = projectFlag.trim().toLowerCase();
      return normalized === "true" || normalized === "yes" || normalized === "project";
    }

    return false;
  }

  /**
   * Returns the raw project status value from known status keys.
   */
  private getProjectStatus(frontmatter: Record<string, unknown>): unknown {
    return frontmatter.status ?? frontmatter.state;
  }

  /**
   * Returns true when a status should be shown in timer project pickers.
   */
  private isTimerEligibleStatus(rawStatus: unknown): boolean {
    if (typeof rawStatus !== "string") {
      return true;
    }

    const normalized = rawStatus.trim().toLowerCase().replace(/[_\s]+/g, "-");
    if (normalized.length === 0) {
      return true;
    }

    return !this.timerTerminalStatuses.has(normalized);
  }

  /**
   * Normalizes unknown frontmatter values to lowercase strings.
   */
  private normalizeFrontmatterString(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().toLowerCase();
  }
}
