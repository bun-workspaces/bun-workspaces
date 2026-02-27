import { describe, test, expect } from "bun:test";
import { findWorkspaces } from "../../../src/workspaces";
import { preventDependencyCycles } from "../../../src/workspaces/dependencyGraph";
import { getProjectRoot } from "../../fixtures/testProjects";
import { makeTestWorkspace } from "../../util/testData";

describe("findWorkspaces with dependencies", () => {
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

describe("preventDependencyCycles", () => {
  test("returns workspaces and empty cycles when no cycles exist", () => {
    const workspaces = [
      makeTestWorkspace({ name: "a", dependencies: ["b"] }),
      makeTestWorkspace({ name: "b", dependents: ["a"] }),
      makeTestWorkspace({ name: "c" }),
    ];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([]);
    expect(result).toEqual(workspaces);
  });

  test("detects and removes a mutual two-workspace cycle", () => {
    const workspaces = [
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: ["b"] }),
      makeTestWorkspace({ name: "b", dependencies: ["a"], dependents: ["a"] }),
    ];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([{ dependency: "a", dependent: "b" }]);
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: [], dependents: ["b"] }),
      makeTestWorkspace({ name: "b", dependencies: ["a"], dependents: [] }),
    ]);
  });

  test("detects a three-workspace chain cycle", () => {
    // The cycle back-edge is c→a. The removal targets a direct a→c edge which
    // doesn't exist in a pure chain, so workspace data is unchanged.
    const workspaces = [
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: ["c"] }),
      makeTestWorkspace({ name: "b", dependencies: ["c"], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: ["a"], dependents: ["b"] }),
    ];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([{ dependency: "a", dependent: "c" }]);
    expect(result).toEqual(workspaces);
  });

  test("detects and removes a self-referencing cycle", () => {
    const workspaces = [makeTestWorkspace({ name: "a", dependencies: ["a"] })];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([{ dependency: "a", dependent: "a" }]);
    expect(result).toEqual([makeTestWorkspace({ name: "a", dependencies: [] })]);
  });

  test("detects and removes multiple independent cycles", () => {
    const workspaces = [
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: ["b"] }),
      makeTestWorkspace({ name: "b", dependencies: ["a"], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: ["d"], dependents: ["d"] }),
      makeTestWorkspace({ name: "d", dependencies: ["c"], dependents: ["c"] }),
    ];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([
      { dependency: "a", dependent: "b" },
      { dependency: "c", dependent: "d" },
    ]);
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: [], dependents: ["b"] }),
      makeTestWorkspace({ name: "b", dependencies: ["a"], dependents: [] }),
      makeTestWorkspace({ name: "c", dependencies: [], dependents: ["d"] }),
      makeTestWorkspace({ name: "d", dependencies: ["c"], dependents: [] }),
    ]);
  });
});
