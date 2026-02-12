import { describe, test, expect } from "bun:test";
import { findWorkspaces } from "../../src/workspaces";
import { getProjectRoot } from "../fixtures/testProjects";
import { createTestWorkspace } from "../util/testData";

describe("Test dependency graph", () => {
  test("findWorkspaces has expected dependencies and dependents", () => {
    const { workspaces } = findWorkspaces({
      rootDirectory: getProjectRoot("withDependenciesSimple"),
    });

    expect(workspaces).toEqual([
      createTestWorkspace({
        name: "a-depends-e",
        path: "packages/a-depends-e",
        matchPattern: "packages/*",
        dependencies: ["e"],
      }),
      createTestWorkspace({
        name: "b-depends-cd",
        path: "packages/b-depends-cd",
        matchPattern: "packages/*",
        dependencies: ["c-depends-e", "d-depends-e"],
      }),
      createTestWorkspace({
        name: "c-depends-e",
        path: "packages/c-depends-e",
        matchPattern: "packages/*",
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      }),
      createTestWorkspace({
        name: "d-depends-e",
        path: "packages/d-depends-e",
        matchPattern: "packages/*",
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      }),
      createTestWorkspace({
        name: "e",
        path: "packages/e",
        matchPattern: "packages/*",
        dependents: ["a-depends-e", "c-depends-e", "d-depends-e"],
      }),
    ]);
  });
});
