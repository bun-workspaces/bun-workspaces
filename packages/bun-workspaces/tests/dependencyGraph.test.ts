import { describe, test, expect } from "bun:test";
import { findWorkspaces } from "../src/workspaces";
import { getProjectRoot } from "./testProjects";
import { withWindowsPath } from "./util/windows";

describe("Test dependency graph", () => {
  test("findWorkspaces has expected dependencies and dependents", () => {
    const { workspaces } = findWorkspaces({
      rootDirectory: getProjectRoot("withDependenciesSimple"),
    });

    expect(workspaces).toEqual([
      {
        name: "a-depends-e",
        isRoot: false,
        path: withWindowsPath("packages/a-depends-e"),
        matchPattern: "packages/*",
        scripts: [],
        aliases: [],
        dependencies: ["e"],
        dependents: [],
      },
      {
        name: "b-depends-cd",
        isRoot: false,
        path: withWindowsPath("packages/b-depends-cd"),
        matchPattern: "packages/*",
        scripts: [],
        aliases: [],
        dependencies: ["c-depends-e", "d-depends-e"],
        dependents: [],
      },
      {
        name: "c-depends-e",
        isRoot: false,
        path: withWindowsPath("packages/c-depends-e"),
        matchPattern: "packages/*",
        scripts: [],
        aliases: [],
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      },
      {
        name: "d-depends-e",
        isRoot: false,
        path: withWindowsPath("packages/d-depends-e"),
        matchPattern: "packages/*",
        scripts: [],
        aliases: [],
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      },
      {
        name: "e",
        isRoot: false,
        path: withWindowsPath("packages/e"),
        matchPattern: "packages/*",
        scripts: [],
        aliases: [],
        dependencies: [],
        dependents: ["a-depends-e", "c-depends-e", "d-depends-e"],
      },
    ]);
  });
});
