import {
  App,
  ButtonComponent,
  FuzzySuggestModal,
  Modal,
  TextComponent
} from "obsidian";
import type { FuzzyMatch } from "obsidian";
import { PickerItem } from "./pickerTypes";
import { createSingleResolver } from "./singleResolver";

export type { PickerItem } from "./pickerTypes";
export { createSingleResolver } from "./singleResolver";

/**
 * Opens a picker modal and resolves the selected value, or null on cancel/failure.
 */
export function openPickerModal<T>(app: App, title: string, items: PickerItem<T>[]): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const modal = new PickerModal(app, title, items, resolve);
      modal.open();
    } catch (error) {
      console.error("Momentum: failed to open picker modal.", error);
      resolve(null);
    }
  });
}

/**
 * Opens a text prompt modal and resolves entered text, or null on cancel/failure.
 */
export function openTextPromptModal(
  app: App,
  title: string,
  placeholder: string,
  initialValue = ""
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const modal = new TextPromptModal(app, title, placeholder, initialValue, resolve);
      modal.open();
    } catch (error) {
      console.error("Momentum: failed to open text prompt modal.", error);
      resolve(null);
    }
  });
}

/**
 * Opens a confirmation modal and resolves true/false based on user choice.
 */
export function openConfirmModal(
  app: App,
  title: string,
  message: string,
  confirmText = "Confirm",
  cancelText = "Cancel"
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const modal = new ConfirmModal(app, title, message, confirmText, cancelText, resolve);
      modal.open();
    } catch (error) {
      console.error("Momentum: failed to open confirm modal.", error);
      resolve(false);
    }
  });
}

/**
 * Generic fuzzy picker modal used by timer/project selection flows.
 */
class PickerModal<T> extends FuzzySuggestModal<PickerItem<T>> {
  private readonly items: PickerItem<T>[];
  private readonly resolveOnce: (value: T | null) => boolean;

  /**
   * Creates the picker modal and wires a single-fire resolver callback.
   */
  constructor(app: App, title: string, items: PickerItem<T>[], onResolve: (value: T | null) => void) {
    super(app);
    this.items = items;
    this.resolveOnce = createSingleResolver(onResolve);
    this.setPlaceholder(title);
  }

  /**
   * Returns all picker candidates for fuzzy matching.
   */
  getItems(): PickerItem<T>[] {
    return this.items;
  }

  /**
   * Returns the text label used for matching and display.
   */
  getItemText(item: PickerItem<T>): string {
    return item.label;
  }

  /**
   * Renders each picker suggestion with optional detail text.
   */
  renderSuggestion(match: FuzzyMatch<PickerItem<T>>, el: HTMLElement): void {
    try {
      const item = match.item;
      el.empty();
      el.createDiv({ text: item.label });
      if (item.detail) {
        el.createEl("small", { text: item.detail });
      }
    } catch (error) {
      console.error("Momentum: failed to render picker suggestion.", error);
      el.empty();
      el.createDiv({ text: match.item.label });
    }
  }

  /**
   * Resolves selection and closes the modal on the next tick.
   */
  onChooseItem(item: PickerItem<T>, _evt: MouseEvent | KeyboardEvent): void {
    this.resolveOnce(item.value);
    window.setTimeout(() => {
      this.close();
    }, 0);
  }

  /**
   * Resolves cancellation if no selection has already been committed.
   */
  onClose(): void {
    // Allow choose callbacks to settle before treating close as cancellation.
    window.setTimeout(() => {
      this.resolveOnce(null);
    }, 120);
  }
}

/**
 * Modal prompting for short freeform text input.
 */
class TextPromptModal extends Modal {
  private readonly title: string;
  private readonly placeholder: string;
  private readonly initialValue: string;
  private readonly onResolve: (value: string | null) => void;
  private resolved = false;

  /**
   * Creates a prompt modal with title, placeholder, and initial input value.
   */
  constructor(
    app: App,
    title: string,
    placeholder: string,
    initialValue: string,
    onResolve: (value: string | null) => void
  ) {
    super(app);
    this.title = title;
    this.placeholder = placeholder;
    this.initialValue = initialValue;
    this.onResolve = onResolve;
  }

  /**
   * Renders prompt controls and keyboard handlers.
   */
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: this.title });

    const input = new TextComponent(contentEl);
    input.setPlaceholder(this.placeholder);
    input.setValue(this.initialValue);
    input.inputEl.addClass("momentum-note-input");
    input.inputEl.focus();

    const actions = contentEl.createDiv({ cls: "momentum-modal-actions" });

    new ButtonComponent(actions)
      .setButtonText("Cancel")
      .onClick(() => {
        this.resolved = true;
        this.onResolve(null);
        this.close();
      });

    new ButtonComponent(actions)
      .setButtonText("Save")
      .setCta()
      .onClick(() => {
        this.resolved = true;
        this.onResolve(input.getValue());
        this.close();
      });

    input.inputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      this.resolved = true;
      this.onResolve(input.getValue());
      this.close();
    });
  }

  /**
   * Resolves cancellation when the modal closes without explicit save.
   */
  onClose(): void {
    if (!this.resolved) {
      this.onResolve(null);
    }

    this.contentEl.empty();
  }
}

/**
 * Modal presenting a binary confirm/cancel action.
 */
class ConfirmModal extends Modal {
  private readonly title: string;
  private readonly message: string;
  private readonly confirmText: string;
  private readonly cancelText: string;
  private readonly onResolve: (confirmed: boolean) => void;
  private resolved = false;

  /**
   * Creates a confirmation modal with custom button labels.
   */
  constructor(
    app: App,
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
    onResolve: (confirmed: boolean) => void
  ) {
    super(app);
    this.title = title;
    this.message = message;
    this.confirmText = confirmText;
    this.cancelText = cancelText;
    this.onResolve = onResolve;
  }

  /**
   * Renders confirmation message and action buttons.
   */
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: this.title });
    contentEl.createEl("p", { text: this.message });

    const actions = contentEl.createDiv({ cls: "momentum-modal-actions" });
    new ButtonComponent(actions)
      .setButtonText(this.cancelText)
      .onClick(() => {
        this.resolved = true;
        this.onResolve(false);
        this.close();
      });

    new ButtonComponent(actions)
      .setButtonText(this.confirmText)
      .setCta()
      .onClick(() => {
        this.resolved = true;
        this.onResolve(true);
        this.close();
      });
  }

  /**
   * Resolves `false` when the modal closes without explicit confirmation.
   */
  onClose(): void {
    if (!this.resolved) {
      this.onResolve(false);
    }

    this.contentEl.empty();
  }
}
