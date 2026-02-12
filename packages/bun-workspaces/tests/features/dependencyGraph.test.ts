import { describe, test, expect } from "bun:test";
import { findWorkspaces } from "../../src/workspaces";
import { getProjectRoot } from "../fixtures/testProjects";
import { makeTestWorkspace } from "../util/testData";

describe("Test dependency graph", () => {
  test("findWorkspaces has expected dependencies and dependents", () => {
    const { workspaces } = findWorkspaces({
      rootDirectory: getProjectRoot("withDependenciesSimple"),
    });

    expect(workspaces).toEqual([
      makeTestWorkspace({
        name: "a-depends-e",
        path: "packages/a-depends-e",
        matchPattern: "packages/*",
        dependencies: ["e"],
      }),
      makeTestWorkspace({
        name: "b-depends-cd",
        path: "packages/b-depends-cd",
        matchPattern: "packages/*",
        dependencies: ["c-depends-e", "d-depends-e"],
      }),
      makeTestWorkspace({
        name: "c-depends-e",
        path: "packages/c-depends-e",
        matchPattern: "packages/*",
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      }),
      makeTestWorkspace({
        name: "d-depends-e",
        path: "packages/d-depends-e",
        matchPattern: "packages/*",
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      }),
      makeTestWorkspace({
        name: "e",
        path: "packages/e",
        matchPattern: "packages/*",
        dependents: ["a-depends-e", "c-depends-e", "d-depends-e"],
      }),
    ]);
  });
});
