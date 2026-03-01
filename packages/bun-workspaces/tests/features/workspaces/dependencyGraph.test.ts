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
        scripts: ["test-script"],
        dependencies: ["e"],
      }),
      makeTestWorkspace({
        name: "b-depends-cd",
        path: "packages/b-depends-cd",
        matchPattern: "packages/*",
        scripts: ["test-script"],
        dependencies: ["c-depends-e", "d-depends-e"],
      }),
      makeTestWorkspace({
        name: "c-depends-e",
        path: "packages/c-depends-e",
        matchPattern: "packages/*",
        scripts: ["test-script"],
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      }),
      makeTestWorkspace({
        name: "d-depends-e",
        path: "packages/d-depends-e",
        matchPattern: "packages/*",
        scripts: ["test-script"],
        dependencies: ["e"],
        dependents: ["b-depends-cd"],
      }),
      makeTestWorkspace({
        name: "e",
        path: "packages/e",
        matchPattern: "packages/*",
        scripts: ["test-script"],
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
    // Back-edge b→a is removed: "a" dropped from b.dependencies, "b" dropped from a.dependents
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: [] }),
      makeTestWorkspace({ name: "b", dependencies: [], dependents: ["a"] }),
    ]);
  });

  test("detects and removes a three-workspace chain cycle", () => {
    const workspaces = [
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: ["c"] }),
      makeTestWorkspace({ name: "b", dependencies: ["c"], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: ["a"], dependents: ["b"] }),
    ];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([{ dependency: "a", dependent: "c" }]);
    // Back-edge c→a is removed: "a" dropped from c.dependencies, "c" dropped from a.dependents
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: [] }),
      makeTestWorkspace({ name: "b", dependencies: ["c"], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: [], dependents: ["b"] }),
    ]);
  });

  test("detects and removes a four-workspace chain cycle", () => {
    const workspaces = [
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: ["d"] }),
      makeTestWorkspace({ name: "b", dependencies: ["c"], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: ["d"], dependents: ["b"] }),
      makeTestWorkspace({ name: "d", dependencies: ["a"], dependents: ["c"] }),
    ];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([{ dependency: "a", dependent: "d" }]);
    // Back-edge d→a is removed: "a" dropped from d.dependencies, "d" dropped from a.dependents
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: [] }),
      makeTestWorkspace({ name: "b", dependencies: ["c"], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: ["d"], dependents: ["b"] }),
      makeTestWorkspace({ name: "d", dependencies: [], dependents: ["c"] }),
    ]);
  });

  test("detects and removes a self-referencing cycle", () => {
    const workspaces = [makeTestWorkspace({ name: "a", dependencies: ["a"] })];
    const { workspaces: result, cycles } = preventDependencyCycles(workspaces);
    expect(cycles).toEqual([{ dependency: "a", dependent: "a" }]);
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: [] }),
    ]);
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
    // Back-edges b→a and d→c are removed
    expect(result).toEqual([
      makeTestWorkspace({ name: "a", dependencies: ["b"], dependents: [] }),
      makeTestWorkspace({ name: "b", dependencies: [], dependents: ["a"] }),
      makeTestWorkspace({ name: "c", dependencies: ["d"], dependents: [] }),
      makeTestWorkspace({ name: "d", dependencies: [], dependents: ["c"] }),
    ]);
  });
});
