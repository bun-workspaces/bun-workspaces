import { describe, expect, test } from "bun:test";
import { createFileSystemProject } from "../../src/project";
import { getProjectRoot } from "../fixtures/testProjects";
import { makeTestWorkspace } from "../util/testData";

const makeProject = () =>
  createFileSystemProject({ rootDirectory: getProjectRoot("workspaceTags") });

const appA = makeTestWorkspace({
  name: "application-1a",
  aliases: ["appA"],
  path: "applications/applicationA",
  matchPattern: "applications/*",
  scripts: ["a-workspaces", "all-workspaces", "application-a"],
  tags: ["app", "workspace"],
});

const appB = makeTestWorkspace({
  name: "application-1b",
  aliases: ["appB"],
  path: "applications/applicationB",
  matchPattern: "applications/*",
  scripts: ["all-workspaces", "application-b", "b-workspaces"],
  tags: ["workspace", "app"],
});

const libA = makeTestWorkspace({
  name: "library-1a",
  aliases: ["libA"],
  path: "libraries/libraryA",
  matchPattern: "libraries/*",
  scripts: ["a-workspaces", "all-workspaces", "library-a"],
  tags: ["lib", "workspace"],
});

const libB = makeTestWorkspace({
  name: "library-1b",
  aliases: ["libB"],
  path: "libraries/libraryB",
  matchPattern: "libraries/*",
  scripts: ["all-workspaces", "b-workspaces", "library-b"],
  tags: ["workspace", "lib"],
});

describe("Workspace tags - API", () => {
  describe("listWorkspacesWithTag", () => {
    test("returns all workspaces with the given tag", () => {
      const project = makeProject();
      expect(project.listWorkspacesWithTag("workspace")).toEqual([
        appA,
        appB,
        libA,
        libB,
      ]);
    });

    test("returns subset of workspaces sharing a tag", () => {
      const project = makeProject();
      expect(project.listWorkspacesWithTag("app")).toEqual([appA, appB]);
      expect(project.listWorkspacesWithTag("lib")).toEqual([libA, libB]);
    });

    test("returns empty array for unknown tag", () => {
      const project = makeProject();
      expect(project.listWorkspacesWithTag("nonexistent")).toEqual([]);
    });
  });

  describe("mapTagsToWorkspaces", () => {
    test("returns a map of all tags to their workspaces", () => {
      const project = makeProject();
      expect(project.mapTagsToWorkspaces()).toEqual({
        app: [appA, appB],
        lib: [libA, libB],
        workspace: [appA, appB, libA, libB],
      });
    });

    test("tags are sorted alphabetically in the map", () => {
      const project = makeProject();
      expect(Object.keys(project.mapTagsToWorkspaces())).toEqual([
        "app",
        "lib",
        "workspace",
      ]);
    });
  });

  describe("tags on workspace objects", () => {
    test("workspace tags are present on workspace objects", () => {
      const project = makeProject();
      expect(project.workspaces.map((w) => w.tags)).toEqual([
        ["app", "workspace"],
        ["workspace", "app"],
        ["lib", "workspace"],
        ["workspace", "lib"],
      ]);
    });
  });
});
