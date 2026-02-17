import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS, ProjectInsightsSettings } from "./settings";

interface SettingsTabHost {
  settings: ProjectInsightsSettings;
  saveSettings: () => Promise<void>;
}

export class ProjectInsightsSettingTab extends PluginSettingTab {
  private readonly host: SettingsTabHost;

  constructor(app: App, plugin: Plugin, host: SettingsTabHost) {
    super(app, plugin);
    this.host = host;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Project due date field")
      .setDesc("Frontmatter property used for due date sorting.")
      .addText((text) =>
        text.setPlaceholder("end").setValue(this.host.settings.dueDateField).onChange(async (value) => {
          this.host.settings.dueDateField = value.trim() || DEFAULT_SETTINGS.dueDateField;
          await this.host.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Timezone")
      .setDesc("Timezone used for timer date/time formatting.")
      .addText((text) =>
        text
          .setPlaceholder("Australia/Sydney")
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
      .setDesc("Path to JSONL export file, relative to the vault root.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.exportPath)
          .setValue(this.host.settings.exportPath)
          .onChange(async (value) => {
            this.host.settings.exportPath = value.trim() || DEFAULT_SETTINGS.exportPath;
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
