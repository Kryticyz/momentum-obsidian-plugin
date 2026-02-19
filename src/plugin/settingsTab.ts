import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import {
  defaultExportPath,
  DEFAULT_SETTINGS,
  MomentumSettings
} from "./settings";

interface SettingsTabHost {
  settings: MomentumSettings;
  saveSettings: () => Promise<void>;
}

/**
 * Renders and persists plugin settings inside Obsidian's settings UI.
 */
export class MomentumSettingTab extends PluginSettingTab {
  private readonly host: SettingsTabHost;

  /**
   * Creates a settings tab bound to the plugin host save/settings methods.
   */
  constructor(app: App, plugin: Plugin, host: SettingsTabHost) {
    super(app, plugin);
    this.host = host;
  }

  /**
   * Rebuilds the settings tab UI from current in-memory settings.
   */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const defaultExportPathValue = defaultExportPath(this.app.vault.configDir);

    new Setting(containerEl)
      .setName("Project due date field")
      .setDesc("Frontmatter property used for due date sorting.")
      .addText((text) =>
        text.setPlaceholder("End").setValue(this.host.settings.dueDateField).onChange(async (value) => {
          this.host.settings.dueDateField = value.trim() || DEFAULT_SETTINGS.dueDateField;
          await this.host.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Timezone")
      .setDesc("Timezone used for timer date/time formatting.")
      .addText((text) =>
        text
          .setPlaceholder("Region/city")
          .setValue(this.host.settings.timezone)
          .onChange(async (value) => {
            this.host.settings.timezone = value.trim() || DEFAULT_SETTINGS.timezone;
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Daily note folder")
      .setDesc("Optional folder for daily notes. Leave blank for vault root.")
      .addText((text) =>
        text.setPlaceholder("").setValue(this.host.settings.dailyNoteFolder).onChange(async (value) => {
          this.host.settings.dailyNoteFolder = value.trim();
          await this.host.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Export path")
      .setDesc("Path to jsonl export file, relative to the vault root.")
      .addText((text) =>
        text
          .setPlaceholder(defaultExportPathValue)
          .setValue(this.host.settings.exportPath)
          .onChange(async (value) => {
            this.host.settings.exportPath = value.trim() || defaultExportPathValue;
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Export target")
      .setDesc("Export jsonl only, or export jsonl and trigger backend refresh.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("jsonl", "Jsonl file")
          .addOption("backend-refresh", "Backend refresh URL")
          .setValue(this.host.settings.exportTarget)
          .onChange(async (value) => {
            this.host.settings.exportTarget = value === "backend-refresh"
              ? "backend-refresh"
              : "jsonl";
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Backend refresh URL")
      .setDesc("Base URL for backend refresh endpoint. Uses post /refresh.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.exportBackendUrl)
          .setValue(this.host.settings.exportBackendUrl)
          .onChange(async (value) => {
            this.host.settings.exportBackendUrl = value.trim() || DEFAULT_SETTINGS.exportBackendUrl;
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto insert snapshots on note creation")
      .setDesc("Automatically insert or refresh sections in new daily/weekly notes.")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.autoInsertOnCreate).onChange(async (value) => {
          this.host.settings.autoInsertOnCreate = value;
          await this.host.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Create hook delay (ms)")
      .setDesc("Delay before generating sections for new notes (helps with templater write timing).")
      .addText((text) =>
        text.setValue(String(this.host.settings.createDelayMs)).onChange(async (value) => {
          const parsed = Number(value);
          this.host.settings.createDelayMs = Number.isFinite(parsed)
            ? Math.max(0, Math.floor(parsed))
            : DEFAULT_SETTINGS.createDelayMs;
          await this.host.saveSettings();
        })
      );
  }
}
