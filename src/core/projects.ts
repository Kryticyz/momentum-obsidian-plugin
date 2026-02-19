import { isValidIsoDate } from "./date";

export interface ProjectRecord {
  path: string;
  name: string;
  dueDate?: string;
  parentName?: string;
}

export interface FlattenedProject {
  project: ProjectRecord;
  depth: number;
}

/**
 * Normalizes tag frontmatter values into lowercase tag tokens without `#`.
 */
export function normalizeTags(rawTags: unknown): string[] {
  if (Array.isArray(rawTags)) {
    return rawTags.flatMap((tag) => splitAndNormalizeTag(String(tag)));
  }

  if (typeof rawTags === "string") {
    return splitAndNormalizeTag(rawTags);
  }

  return [];
}

/**
 * Returns true when normalized tags include the `project` marker.
 */
export function hasProjectTag(rawTags: unknown): boolean {
  return normalizeTags(rawTags).includes("project");
}

/**
 * Returns true when the status value is an active marker.
 */
export function isActiveStatus(rawStatus: unknown): boolean {
  if (typeof rawStatus !== "string") {
    return false;
  }

  return rawStatus.trim().toLowerCase() === "active";
}

/**
 * Validates and normalizes due-date frontmatter in ISO date format.
 */
export function normalizeDueDate(rawValue: unknown): string | undefined {
  if (typeof rawValue !== "string") {
    return undefined;
  }

  const value = rawValue.trim();
  if (!isValidIsoDate(value)) {
    return undefined;
  }

  return value;
}

/**
 * Extracts a parent project name from `up` frontmatter entries.
 */
export function extractParentProjectName(rawUp: unknown): string | undefined {
  if (Array.isArray(rawUp)) {
    for (const value of rawUp) {
      const extracted = parseWikiLink(String(value));
      if (extracted) {
        return extracted;
      }
    }
    return undefined;
  }

  if (typeof rawUp === "string") {
    return parseWikiLink(rawUp);
  }

  return undefined;
}

/**
 * Produces a deterministic parent/child flattened ordering for project pickers and tables.
 */
export function buildProjectHierarchy(projects: ProjectRecord[]): FlattenedProject[] {
  const items = [...projects].sort(compareProjectOrder);
  const byName = new Map<string, ProjectRecord>();
  const children = new Map<string, ProjectRecord[]>();

  for (const project of items) {
    byName.set(normalizeProjectKey(project.name), project);
  }

  const roots: ProjectRecord[] = [];

  for (const project of items) {
    const parentKey = project.parentName ? normalizeProjectKey(project.parentName) : "";

    if (parentKey && byName.has(parentKey)) {
      const parentChildren = children.get(parentKey) ?? [];
      parentChildren.push(project);
      children.set(parentKey, parentChildren);
      continue;
    }

    roots.push(project);
  }

  for (const childList of children.values()) {
    childList.sort(compareProjectOrder);
  }

  roots.sort(compareProjectOrder);

  const flattened: FlattenedProject[] = [];
  const visited = new Set<string>();

  const visit = (project: ProjectRecord, depth: number): void => {
    const key = project.path;
    if (visited.has(key)) {
      return;
    }

    visited.add(key);
    flattened.push({ project, depth });

    const childList = children.get(normalizeProjectKey(project.name));
    if (!childList) {
      return;
    }

    for (const child of childList) {
      visit(child, depth + 1);
    }
  };

  for (const root of roots) {
    visit(root, 0);
  }

  for (const project of items) {
    if (!visited.has(project.path)) {
      visit(project, 0);
    }
  }

  return flattened;
}

/**
 * Splits a raw tag string on whitespace/comma boundaries and normalizes each token.
 */
function splitAndNormalizeTag(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^#/, "").toLowerCase())
    .filter((item) => item.length > 0);
}

/**
 * Parses wiki-link-like values and returns the target note basename without `.md`.
 */
function parseWikiLink(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const linkMatch = trimmed.match(/^\[\[([^\]]+)\]\]$/);
  const rawTarget = linkMatch ? linkMatch[1] : trimmed;
  const targetWithoutAlias = rawTarget.split("|")[0].trim();
  const leafName = targetWithoutAlias.split("/").at(-1)?.trim();

  if (!leafName) {
    return undefined;
  }

  return leafName.replace(/\.md$/i, "");
}

/**
 * Builds a case-insensitive lookup key for project names.
 */
function normalizeProjectKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Sorts projects by due date first and then by case-insensitive name.
 */
function compareProjectOrder(a: ProjectRecord, b: ProjectRecord): number {
  const aDue = a.dueDate;
  const bDue = b.dueDate;

  if (aDue && bDue) {
    if (aDue < bDue) {
      return -1;
    }
    if (aDue > bDue) {
      return 1;
    }
  } else if (aDue && !bDue) {
    return -1;
  } else if (!aDue && bDue) {
    return 1;
  }

  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}
