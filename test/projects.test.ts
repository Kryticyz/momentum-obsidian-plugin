import { describe, expect, test } from "bun:test";
import {
  buildProjectHierarchy,
  extractParentProjectName,
  hasProjectTag,
  normalizeTags,
  ProjectRecord
} from "../src/core/projects";

describe("project helpers", () => {
  test("normalizes tags and detects project tags", () => {
    expect(normalizeTags(["#project", "focus"])).toEqual(["project", "focus"]);
    expect(normalizeTags("project, writing")).toEqual(["project", "writing"]);
    expect(normalizeTags("#project writing")).toEqual(["project", "writing"]);
    expect(normalizeTags("project\nwriting")).toEqual(["project", "writing"]);
    expect(hasProjectTag(["#project"])).toBe(true);
    expect(hasProjectTag(["journal"])).toBe(false);
  });

  test("extracts parent project names from wiki links", () => {
    expect(extractParentProjectName("[[Parent Project]]")).toBe("Parent Project");
    expect(extractParentProjectName("[[folder/Parent Project|Alias]]")).toBe("Parent Project");
    expect(extractParentProjectName(undefined)).toBeUndefined();
  });

  test("builds hierarchy sorted by due date", () => {
    const projects: ProjectRecord[] = [
      { path: "A.md", name: "A", dueDate: "2026-02-20" },
      { path: "B.md", name: "B", dueDate: "2026-02-10" },
      { path: "C.md", name: "C" },
      { path: "B-child-1.md", name: "B child 1", dueDate: "2026-02-15", parentName: "B" },
      { path: "B-child-2.md", name: "B child 2", parentName: "B" }
    ];

    const flattened = buildProjectHierarchy(projects);

    expect(flattened.map((item) => `${item.depth}:${item.project.name}`)).toEqual([
      "0:B",
      "1:B child 1",
      "1:B child 2",
      "0:A",
      "0:C"
    ]);
  });
});
