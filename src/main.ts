import {
  ButtonComponent,
  normalizePath,
  Notice,
  Plugin,
  requestUrl,
  TAbstractFile,
  TFile
} from "obsidian";
import { getNoteContextFromBasename, isDateInWeek } from "./core/date";
import { buildProjectHierarchy } from "./core/projects";
import {
  appendTimeLogLine,
  upsertActiveProjectsSection,
  upsertTimeLogsSection,
  TIME_LOGS_HEADING
} from "./core/sections";
import {
  aggregateMinutesByProject,
  entriesToJsonl,
  parseTimeLogsFromContent,
  TimeLogEntry
} from "./core/timeLogs";
import { formatDateInTimezone } from "./core/timezone";
import { commandName, COMMAND_IDS } from "./plugin/commandCatalog";
import { messages, toErrorMessage } from "./plugin/messages";
import { postBackendRefresh } from "./plugin/backendSync";
import { buildPersistedData, loadPersistedData } from "./plugin/persistence";
import { ProjectRepository } from "./plugin/projectRepository";
import { defaultExportPath, DEFAULT_SETTINGS, MomentumSettings } from "./plugin/settings";
import { MomentumSettingTab } from "./plugin/settingsTab";
import { TimerController } from "./plugin/timerController";
import { formatElapsedClock, formatStartedAtLabel } from "./timer/timerDisplay";
import { TimerService } from "./timer/timerService";
import { ActiveTimerState } from "./timer/timerTypes";
import { TIMER_SIDE_PANEL_VIEW_TYPE, TimerSidePanelView } from "./ui/timerSidePanelView";
import { TimerStatusBarController } from "./ui/timerStatusBar";

/**
 * Main Obsidian plugin entry point that wires settings, timer flows, and note updates.
 */
export default class MomentumPlugin extends Plugin {
  settings: MomentumSettings = DEFAULT_SETTINGS;

  private persistedActiveTimer: ActiveTimerState | null = null;
  private timerService: TimerService | null = null;
  private projectRepository: ProjectRepository | null = null;
  private timerController: TimerController | null = null;
  private timerStatusBarController: TimerStatusBarController | null = null;

  /**
   * Loads persisted state and registers all plugin integrations.
   */
  async onload(): Promise<void> {
    await this.loadPluginData();
    this.initializeServices();

    this.addSettingTab(new MomentumSettingTab(this.app, this, this));
    this.registerCommands();
    this.registerTimerControlsCodeBlock();
    this.registerTimerView();
    this.registerTimerStatusBar();
    this.registerNoteCreateHook();
    this.checkOptionalDependencies();

    this.register(() => {
      this.timerStatusBarController?.dispose();
      this.timerStatusBarController = null;
      this.timerService?.dispose();
      this.timerService = null;
      this.projectRepository = null;
      this.timerController = null;
    });
  }

  /**
   * Persists current settings to plugin storage.
   */
  async saveSettings(): Promise<void> {
    await this.savePluginData();
  }

  /**
   * Rebuilds snapshot sections for a supported daily or weekly note.
   */
  async regenerateSnapshotForFile(file: TFile, withNotice: boolean): Promise<void> {
    const noteContext = getNoteContextFromBasename(file.basename);
    if (!noteContext) {
      return;
    }

    const snapshotProjects = await this.requireProjectRepository().getSnapshotProjects();
    const flattenedProjects = buildProjectHierarchy(snapshotProjects);
    const weekEntries = await this.getEntriesForWeek(noteContext.weekStart);
    const weeklyMinutes = aggregateMinutesByProject(weekEntries);

    await this.app.vault.process(file, (content) => {
      let updated = upsertActiveProjectsSection(content, flattenedProjects, weeklyMinutes);
      updated = upsertTimeLogsSection(updated);
      return updated;
    });

    if (withNotice) {
      const noteLabel = noteContext.kind === "daily" ? "daily" : "weekly";
      new Notice(messages.snapshotRegenerated(noteLabel, flattenedProjects.length));
    }
  }

  /**
   * Initializes service instances that back commands, views, and status bar UI.
   */
  private initializeServices(): void {
    this.timerService = new TimerService({
      initialTimer: this.persistedActiveTimer,
      saveActiveTimer: async (activeTimer) => {
        this.persistedActiveTimer = activeTimer;
        await this.savePluginData();
      }
    });

    this.projectRepository = new ProjectRepository({
      app: this.app,
      getDueDateField: () => this.settings.dueDateField
    });

    this.timerController = new TimerController({
      app: this.app,
      timerService: this.requireTimerService(),
      getTimezone: () => this.settings.timezone,
      getTimerProjects: () => this.requireProjectRepository().getTimerCandidateProjects(),
      appendLogEntry: async (dateIso, entryLine) => {
        await this.appendLogEntryToDailyNote(dateIso, entryLine);
      },
      notify: (message) => {
        new Notice(message);
      }
    });
  }

  /**
   * Registers command palette actions exposed by the plugin.
   */
  private registerCommands(): void {
    this.addCommand({
      id: COMMAND_IDS.regenerateSnapshot,
      name: commandName(COMMAND_IDS.regenerateSnapshot),
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        const isSupported = !!file && !!getNoteContextFromBasename(file.basename);

        if (!isSupported) {
          return false;
        }

        if (!checking && file) {
          void this.regenerateSnapshotForFile(file, true);
        }

        return true;
      }
    });

    this.addCommand({
      id: COMMAND_IDS.startTimer,
      name: commandName(COMMAND_IDS.startTimer),
      callback: () => {
        void this.requireTimerController().start();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.startTimerInPast,
      name: commandName(COMMAND_IDS.startTimerInPast),
      callback: () => {
        void this.requireTimerController().startInPast();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.adjustTimerStart,
      name: commandName(COMMAND_IDS.adjustTimerStart),
      callback: () => {
        void this.requireTimerController().adjustStart();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.stopTimer,
      name: commandName(COMMAND_IDS.stopTimer),
      callback: () => {
        void this.requireTimerController().stop();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.openTimerPanel,
      name: commandName(COMMAND_IDS.openTimerPanel),
      callback: () => {
        void this.openTimerSidePanel();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.debugTimerProjects,
      name: commandName(COMMAND_IDS.debugTimerProjects),
      callback: () => {
        void this.debugTimerProjectScan();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.debugTimerState,
      name: commandName(COMMAND_IDS.debugTimerState),
      callback: () => {
        this.debugTimerState();
      }
    });

    this.addCommand({
      id: COMMAND_IDS.exportTimeEntries,
      name: commandName(COMMAND_IDS.exportTimeEntries),
      callback: () => {
        void this.exportTimeEntries();
      }
    });
  }

  /**
   * Registers the `project-timer-controls` markdown code block renderer.
   */
  private registerTimerControlsCodeBlock(): void {
    this.registerMarkdownCodeBlockProcessor("project-timer-controls", (_source, el) => {
      const controls = el.createDiv({ cls: "momentum-controls" });

      this.addControlButton(controls, "Start timer", COMMAND_IDS.startTimer);
      this.addControlButton(controls, "Start in past", COMMAND_IDS.startTimerInPast);
      this.addControlButton(controls, "Adjust start", COMMAND_IDS.adjustTimerStart);
      this.addControlButton(controls, "Stop timer", COMMAND_IDS.stopTimer);
      this.addControlButton(controls, "Timer panel", COMMAND_IDS.openTimerPanel);
      this.addControlButton(controls, "Regenerate", COMMAND_IDS.regenerateSnapshot);
      this.addControlButton(controls, "Export", COMMAND_IDS.exportTimeEntries);

      const snapshot = this.requireTimerService().getSnapshot();
      if (!snapshot.activeTimer) {
        return;
      }

      const startedLabel = formatStartedAtLabel(
        snapshot.activeTimer.startedAt,
        this.settings.timezone
      );
      const elapsedLabel = formatElapsedClock(snapshot.elapsedMs);
      el.createEl("small", {
        text: `Running: ${snapshot.activeTimer.projectName} (${elapsedLabel}, started ${startedLabel})`
      });
    });
  }

  /**
   * Registers the timer side panel custom view type.
   */
  private registerTimerView(): void {
    this.registerView(TIMER_SIDE_PANEL_VIEW_TYPE, (leaf) => {
      return new TimerSidePanelView(leaf, {
        timerService: this.requireTimerService(),
        getTimezone: () => this.settings.timezone,
        startTimer: () => this.requireTimerController().start(),
        startTimerInPast: () => this.requireTimerController().startInPast(),
        adjustTimerStart: () => this.requireTimerController().adjustStart(),
        stopTimer: (noteOverride?: string) => this.requireTimerController().stop(noteOverride),
        switchTimer: (noteOverride?: string) => this.requireTimerController().switch(noteOverride),
        openTodayDailyNote: () => this.openTodayDailyNote()
      });
    });
  }

  /**
   * Creates and wires the status bar timer controller.
   */
  private registerTimerStatusBar(): void {
    const element = this.addStatusBarItem();
    this.timerStatusBarController = new TimerStatusBarController({
      element,
      timerService: this.requireTimerService(),
      getTimezone: () => this.settings.timezone,
      startTimer: () => this.requireTimerController().start(),
      stopTimer: () => this.requireTimerController().stop()
    });
  }

  /**
   * Adds a command-backed control button to a rendered controls container.
   */
  private addControlButton(container: HTMLElement, label: string, commandId: string): void {
    new ButtonComponent(container)
      .setButtonText(label)
      .onClick(() => {
        this.executeCommandById(this.getCommandId(commandId));
      });
  }

  /**
   * Executes a full command id through Obsidian's command manager.
   */
  private executeCommandById(commandId: string): void {
    const commandManager = this.app.commands as unknown as {
      executeCommandById: (id: string) => boolean;
    };
    commandManager.executeCommandById(commandId);
  }

  /**
   * Hooks markdown note creation to optionally auto-regenerate snapshot sections.
   */
  private registerNoteCreateHook(): void {
    this.registerEvent(
      this.app.vault.on("create", (file: TAbstractFile) => {
        if (!this.settings.autoInsertOnCreate) {
          return;
        }

        if (!(file instanceof TFile) || file.extension !== "md") {
          return;
        }

        const noteContext = getNoteContextFromBasename(file.basename);
        if (!noteContext) {
          return;
        }

        window.setTimeout(() => {
          void this.regenerateSnapshotForFile(file, false);
        }, this.settings.createDelayMs);
      })
    );
  }

  /**
   * Warns when optional companion plugins are unavailable.
   */
  private checkOptionalDependencies(): void {
    const plugins = (this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins;

    if (plugins?.dataview && plugins?.["obsidian-tasks-plugin"]) {
      return;
    }

    if (!plugins?.dataview) {
      new Notice(messages.optionalDataviewMissing);
    }

    if (!plugins?.["obsidian-tasks-plugin"]) {
      new Notice(messages.optionalTasksMissing);
    }
  }

  /**
   * Opens or creates the timer side panel and reveals its leaf.
   */
  private async openTimerSidePanel(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(TIMER_SIDE_PANEL_VIEW_TYPE).at(0);
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(true) ?? undefined;
    }

    if (!leaf) {
      new Notice(messages.timerPanelOpenFailed);
      return;
    }

    await leaf.setViewState({
      type: TIMER_SIDE_PANEL_VIEW_TYPE,
      active: true
    });
    void this.app.workspace.revealLeaf(leaf);
  }

  /**
   * Logs timer project scan diagnostics and shows a summary notice.
   */
  private async debugTimerProjectScan(): Promise<void> {
    const result = await this.requireProjectRepository().getTimerCandidateProjects();
    const summary = [
      `scanned=${result.scannedMarkdownCount}`,
      `candidates=${result.projects.length}`,
      `parseFailures=${result.parseFailures.length}`
    ].join(" ");

    console.debug("Momentum: timer project scan summary", summary);
    if (result.projects.length > 0) {
      console.debug(
        "Momentum: timer project candidates",
        result.projects.map((project) => ({
          name: project.name,
          path: project.path,
          dueDate: project.dueDate ?? "",
          parentName: project.parentName ?? ""
        }))
      );
    }
    if (result.parseFailures.length > 0) {
      console.warn("Momentum: timer project scan parse failures", result.parseFailures);
    }

    new Notice(messages.timerScanSummary(summary));
  }

  /**
   * Shows a debug snapshot of the current timer state.
   */
  private debugTimerState(): void {
    const snapshot = this.requireTimerService().getSnapshot();
    if (!snapshot.activeTimer) {
      new Notice(messages.timerStateIdle);
      console.debug("Momentum: timer state", {
        running: false,
        elapsedMs: snapshot.elapsedMs
      });
      return;
    }

    const summary =
      `running project=${snapshot.activeTimer.projectName} ` +
      `elapsed=${snapshot.elapsedMs}ms startedAt=${snapshot.activeTimer.startedAt}`;
    new Notice(messages.timerStateRunning(summary));
    console.debug("Momentum: timer state", {
      running: true,
      project: snapshot.activeTimer.projectName,
      path: snapshot.activeTimer.projectPath,
      startedAt: snapshot.activeTimer.startedAt,
      elapsedMs: snapshot.elapsedMs
    });
  }

  /**
   * Ensures the target daily note exists and appends a new time-log entry.
   */
  private async appendLogEntryToDailyNote(dateIso: string, entryLine: string): Promise<void> {
    const relativePath = this.getDailyNotePath(dateIso);
    await this.ensureDirectoryForPath(relativePath);

    let file = this.app.vault.getAbstractFileByPath(relativePath);
    if (!(file instanceof TFile)) {
      file = await this.app.vault.create(relativePath, "");
    }

    await this.regenerateSnapshotForFile(file, false);

    await this.app.vault.process(file, (content) => appendTimeLogLine(content, entryLine));
  }

  /**
   * Opens today's daily note in the configured timezone, creating it when needed.
   */
  private async openTodayDailyNote(): Promise<void> {
    const dateIso = formatDateInTimezone(new Date(), this.settings.timezone);
    const relativePath = this.getDailyNotePath(dateIso);
    await this.ensureDirectoryForPath(relativePath);

    let file = this.app.vault.getAbstractFileByPath(relativePath);
    if (!(file instanceof TFile)) {
      file = await this.app.vault.create(relativePath, "");
    }

    await this.regenerateSnapshotForFile(file, false);
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  /**
   * Builds the vault-relative path for a daily note date.
   */
  private getDailyNotePath(dateIso: string): string {
    const folder = this.settings.dailyNoteFolder.trim();
    const rawPath = folder.length > 0 ? `${folder}/${dateIso}.md` : `${dateIso}.md`;
    return normalizePath(rawPath);
  }

  /**
   * Exports all daily time logs to JSONL and optionally triggers backend refresh.
   */
  private async exportTimeEntries(): Promise<void> {
    const entries = await this.getAllDailyEntries();
    entries.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.start.localeCompare(b.start);
    });

    const jsonl = entriesToJsonl(entries);
    const exportPath = normalizePath(
      this.settings.exportPath || defaultExportPath(this.app.vault.configDir)
    );
    await this.ensureDirectoryForPath(exportPath);
    const existing = this.app.vault.getAbstractFileByPath(exportPath);
    if (existing instanceof TFile) {
      await this.app.vault.process(existing, () => jsonl);
    } else if (existing) {
      new Notice(messages.exportPathIsFolder);
      return;
    } else {
      await this.app.vault.create(exportPath, jsonl);
    }

    if (this.settings.exportTarget === "backend-refresh") {
      try {
        const refreshUrl = await postBackendRefresh(
          this.settings.exportBackendUrl,
          async (url) => {
            const response = await requestUrl({
              url,
              method: "POST",
              headers: {
                Accept: "application/json"
              }
            });

            return {
              status: response.status,
              body: typeof response.text === "string" ? response.text : ""
            };
          }
        );
        new Notice(messages.exportedEntriesAndRefreshedBackend(entries.length, exportPath, refreshUrl));
      } catch (error) {
        console.error("Momentum: backend refresh failed.", error);
        new Notice(
          messages.exportedEntriesBackendRefreshFailed(
            entries.length,
            exportPath,
            toErrorMessage(error)
          )
        );
      }
      return;
    }

    new Notice(messages.exportedEntries(entries.length, exportPath));
  }

  /**
   * Collects all time-log entries from every daily note in the vault.
   */
  private async getAllDailyEntries(): Promise<TimeLogEntry[]> {
    const candidates = this.app.vault
      .getMarkdownFiles()
      .map((file) => ({ file, context: getNoteContextFromBasename(file.basename) }))
      .filter((item): item is { file: TFile; context: { kind: "daily"; date: string; weekStart: string } } =>
        item.context?.kind === "daily"
      );

    const batches = await Promise.all(
      candidates.map(async ({ file, context }) => {
        const content = await this.app.vault.cachedRead(file);
        return parseTimeLogsFromContent(content, file.path, context.date, TIME_LOGS_HEADING);
      })
    );

    return batches.flat();
  }

  /**
   * Collects time-log entries only for dates in a target week.
   */
  private async getEntriesForWeek(weekStartIso: string): Promise<TimeLogEntry[]> {
    const candidates = this.app.vault
      .getMarkdownFiles()
      .map((file) => ({ file, context: getNoteContextFromBasename(file.basename) }))
      .filter((item): item is { file: TFile; context: { kind: "daily"; date: string; weekStart: string } } => {
        if (item.context?.kind !== "daily") {
          return false;
        }

        return isDateInWeek(item.context.date, weekStartIso);
      });

    const batches = await Promise.all(
      candidates.map(async ({ file, context }) => {
        const content = await this.app.vault.cachedRead(file);
        return parseTimeLogsFromContent(content, file.path, context.date, TIME_LOGS_HEADING);
      })
    );

    return batches.flat();
  }

  /**
   * Creates missing folder segments for a vault-relative file path.
   */
  private async ensureDirectoryForPath(path: string): Promise<void> {
    const parts = normalizePath(path).split("/");
    parts.pop();

    let current = "";

    for (const segment of parts) {
      if (!segment) {
        continue;
      }

      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  /**
   * Loads persisted plugin data and applies defaults/migrations.
   */
  private async loadPluginData(): Promise<void> {
    const raw = (await this.loadData()) as unknown;
    const { data, migrated } = loadPersistedData(raw);
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data.settings
    };
    if (
      this.settings.exportPath.trim().length === 0 ||
      this.settings.exportPath === DEFAULT_SETTINGS.exportPath
    ) {
      this.settings.exportPath = defaultExportPath(this.app.vault.configDir);
    }
    this.persistedActiveTimer = data.activeTimer;

    if (migrated) {
      await this.saveData(data);
    }
  }

  /**
   * Saves current settings and active timer state to plugin storage.
   */
  private async savePluginData(): Promise<void> {
    await this.saveData(buildPersistedData(this.settings, this.persistedActiveTimer));
  }

  /**
   * Builds a fully-qualified plugin command id.
   */
  private getCommandId(localId: string): string {
    return `${this.manifest.id}:${localId}`;
  }

  /**
   * Returns the timer service instance or throws when uninitialized.
   */
  private requireTimerService(): TimerService {
    if (!this.timerService) {
      throw new Error("Timer service not initialized.");
    }
    return this.timerService;
  }

  /**
   * Returns the project repository instance or throws when uninitialized.
   */
  private requireProjectRepository(): ProjectRepository {
    if (!this.projectRepository) {
      throw new Error("Project repository not initialized.");
    }
    return this.projectRepository;
  }

  /**
   * Returns the timer controller instance or throws when uninitialized.
   */
  private requireTimerController(): TimerController {
    if (!this.timerController) {
      throw new Error("Timer controller not initialized.");
    }
    return this.timerController;
  }
}
