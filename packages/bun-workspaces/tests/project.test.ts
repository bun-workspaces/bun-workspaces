import path from "path";
import { expect, test, describe } from "bun:test";
import type { Workspace, WorkspaceScriptMetadata } from "../src";
import { createFileSystemProject, createMemoryProject } from "../src/project";
import { PROJECT_ERRORS } from "../src/project/errors";
import { WORKSPACE_ERRORS } from "../src/workspaces";
import { getProjectRoot } from "./testProjects";
import { withWindowsPath } from "./util/windows";

const createDefaultProject = () =>
  createFileSystemProject({
    rootDirectory: getProjectRoot("fullProject"),
  });

const stripToName = (workspace: Workspace) => workspace.name;

describe("Test Project utilities", () => {
  test("Project properties", async () => {
    const project = createDefaultProject();

    expect(project.rootDirectory).toEqual(getProjectRoot("fullProject"));
    expect(project.sourceType).toEqual("fileSystem");
    expect(project.workspaces).toEqual([
      {
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "application-b",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationB"),
        scripts: ["all-workspaces", "application-b", "b-workspaces"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-a",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/libraryA"),
        scripts: ["a-workspaces", "all-workspaces", "library-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-b",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/libraryB"),
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-c",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/nested/libraryC"),
        scripts: ["all-workspaces", "c-workspaces", "library-c"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    ]);
  });

  test("Project.prototype.findWorkspaceByName", async () => {
    const project = createDefaultProject();

    expect(project.findWorkspaceByName("not-a-workspace")).toBeNull();

    const deprecated_appA = project.findWorkspaceByName("application-a");
    expect(deprecated_appA?.name).toEqual("application-a");
    expect(deprecated_appA?.path).toEqual(
      withWindowsPath("applications/applicationA"),
    );
    expect(deprecated_appA?.scripts).toEqual([
      "a-workspaces",
      "all-workspaces",
      "application-a",
    ]);
    expect(deprecated_appA?.matchPattern).toEqual("applications/*");

    const deprecated_libC = project.findWorkspaceByName("library-c");
    expect(deprecated_libC?.name).toEqual("library-c");
    expect(deprecated_libC?.path).toEqual(
      withWindowsPath("libraries/nested/libraryC"),
    );
    expect(deprecated_libC?.scripts).toEqual([
      "all-workspaces",
      "c-workspaces",
      "library-c",
    ]);
    expect(deprecated_libC?.matchPattern).toEqual("libraries/**/*");
  });

  test("Project.prototype.findWorkspacesByPattern", async () => {
    const project = createDefaultProject();

    expect(project.findWorkspacesByPattern("not-a-workspace")).toEqual([]);

    expect(project.findWorkspacesByPattern("").map(stripToName)).toEqual([]);
    expect(project.findWorkspacesByPattern("*").map(stripToName)).toEqual([
      "application-a",
      "application-b",
      "library-a",
      "library-b",
      "library-c",
    ]);

    expect(
      project.findWorkspacesByPattern("application-*").map(stripToName),
    ).toEqual(["application-a", "application-b"]);

    expect(
      project.findWorkspacesByPattern("library-*").map(stripToName),
    ).toEqual(["library-a", "library-b", "library-c"]);

    expect(
      project.findWorkspacesByPattern("library-c").map(stripToName),
    ).toEqual(["library-c"]);

    expect(
      project.findWorkspacesByPattern("library-c*").map(stripToName),
    ).toEqual(["library-c"]);

    expect(project.findWorkspacesByPattern("*-c").map(stripToName)).toEqual([
      "library-c",
    ]);

    expect(project.findWorkspacesByPattern("*-b").map(stripToName)).toEqual([
      "application-b",
      "library-b",
    ]);

    expect(project.findWorkspacesByPattern("*a*-a*").map(stripToName)).toEqual([
      "application-a",
      "library-a",
    ]);

    expect(
      project.findWorkspacesByPattern("**b****-*b**").map(stripToName),
    ).toEqual(["library-b"]);

    expect(
      project
        .findWorkspacesByPattern("path:libraries/*", "name:*-a")
        .map(stripToName),
    ).toEqual(["application-a", "library-a", "library-b"]);

    expect(
      project
        .findWorkspacesByPattern("path:libraries/**/*", "alias:does-not-exist")
        .map(stripToName),
    ).toEqual(["library-a", "library-b", "library-c"]);

    const projectWithAliases = createFileSystemProject({
      rootDirectory: getProjectRoot("workspaceConfigFileOnly"),
    });

    expect(
      projectWithAliases
        .findWorkspacesByPattern(
          "alias:libA",
          "name:library-1b",
          "path:applications/*a",
        )
        .map(stripToName),
    ).toEqual(["application-1a", "library-1a", "library-1b"]);
  });

  test("Project.prototype.listWorkspacesWithScript", async () => {
    const project = createDefaultProject();

    expect(project.listWorkspacesWithScript("all-workspaces")).toEqual([
      {
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "application-b",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationB"),
        scripts: ["all-workspaces", "application-b", "b-workspaces"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-a",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/libraryA"),
        scripts: ["a-workspaces", "all-workspaces", "library-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-b",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/libraryB"),
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-c",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/nested/libraryC"),
        scripts: ["all-workspaces", "c-workspaces", "library-c"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    ]);

    expect(
      project.listWorkspacesWithScript("a-workspaces").map(stripToName),
    ).toEqual(["application-a", "library-a"]);

    expect(
      project.listWorkspacesWithScript("b-workspaces").map(stripToName),
    ).toEqual(["application-b", "library-b"]);

    expect(
      project.listWorkspacesWithScript("c-workspaces").map(stripToName),
    ).toEqual(["library-c"]);

    expect(project.listWorkspacesWithScript("not-a-script")).toEqual([]);

    expect(
      project.listWorkspacesWithScript("application-a").map(stripToName),
    ).toEqual(["application-a"]);

    expect(
      project.listWorkspacesWithScript("application-b").map(stripToName),
    ).toEqual(["application-b"]);

    expect(
      project.listWorkspacesWithScript("library-a").map(stripToName),
    ).toEqual(["library-a"]);

    expect(
      project.listWorkspacesWithScript("library-b").map(stripToName),
    ).toEqual(["library-b"]);

    expect(
      project.listWorkspacesWithScript("library-c").map(stripToName),
    ).toEqual(["library-c"]);
  });

  const stripMetadataToWorkspaceNames = (
    metadata: Record<string, WorkspaceScriptMetadata>,
  ) =>
    Object.values(metadata).reduce(
      (acc, { name, workspaces }) => ({
        ...acc,
        [name]: {
          name,
          workspaces: workspaces.map(stripToName),
        },
      }),
      {},
    );

  test("Project.prototype.mapScriptsToWorkspaces", async () => {
    const project = createDefaultProject();

    expect(
      stripMetadataToWorkspaceNames(project.mapScriptsToWorkspaces()),
    ).toEqual({
      "all-workspaces": {
        name: "all-workspaces",
        workspaces: [
          "application-a",
          "application-b",
          "library-a",
          "library-b",
          "library-c",
        ],
      },
      "a-workspaces": {
        name: "a-workspaces",
        workspaces: ["application-a", "library-a"],
      },
      "b-workspaces": {
        name: "b-workspaces",
        workspaces: ["application-b", "library-b"],
      },
      "c-workspaces": {
        name: "c-workspaces",
        workspaces: ["library-c"],
      },
      "application-a": {
        name: "application-a",
        workspaces: ["application-a"],
      },
      "application-b": {
        name: "application-b",
        workspaces: ["application-b"],
      },
      "library-a": {
        name: "library-a",
        workspaces: ["library-a"],
      },
      "library-b": {
        name: "library-b",
        workspaces: ["library-b"],
      },
      "library-c": {
        name: "library-c",
        workspaces: ["library-c"],
      },
    });
  });

  test("Project.prototype.createScriptCommand", async () => {
    const project = createDefaultProject();

    expect(
      project.createScriptCommand({
        args: "",
        method: "cd",
        scriptName: "all-workspaces",
        workspaceNameOrAlias: "application-a",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: path.resolve(
          project.rootDirectory,
          withWindowsPath("applications/applicationA"),
        ),
        command: `bun --silent run all-workspaces`,
      },
      scriptName: "all-workspaces",
      workspace: {
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    });

    expect(
      project.createScriptCommand({
        args: "--watch",
        method: "cd",
        scriptName: "all-workspaces",
        workspaceNameOrAlias: "application-a",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: path.resolve(
          project.rootDirectory,
          withWindowsPath("applications/applicationA"),
        ),
        command: `bun --silent run all-workspaces --watch`,
      },
      scriptName: "all-workspaces",
      workspace: {
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    });

    expect(
      project.createScriptCommand({
        args: "--watch",
        method: "filter",
        scriptName: "all-workspaces",
        workspaceNameOrAlias: "application-a",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: project.rootDirectory,
        command: `bun --silent run --filter="application-a" all-workspaces --watch`,
      },
      scriptName: "all-workspaces",
      workspace: {
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    });

    expect(
      project.createScriptCommand({
        args: " --stuff --hello=there123",
        method: "filter",
        scriptName: "all-workspaces",
        workspaceNameOrAlias: "application-a",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: project.rootDirectory,
        command: `bun --silent run --filter="application-a" all-workspaces --stuff --hello=there123`,
      },
      scriptName: "all-workspaces",
      workspace: {
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    });

    expect(
      project.createScriptCommand({
        args: "",
        method: "cd",
        scriptName: "b-workspaces",
        workspaceNameOrAlias: "library-b",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: path.resolve(
          project.rootDirectory,
          withWindowsPath("libraries/libraryB"),
        ),
        command: `bun --silent run b-workspaces`,
      },
      scriptName: "b-workspaces",
      workspace: {
        name: "library-b",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/libraryB"),
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    });

    expect(
      project.createScriptCommand({
        args: "",
        method: "filter",
        scriptName: "b-workspaces",
        workspaceNameOrAlias: "library-b",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: project.rootDirectory,
        command: `bun --silent run --filter="library-b" b-workspaces`,
      },
      scriptName: "b-workspaces",
      workspace: {
        name: "library-b",
        isRoot: false,
        matchPattern: "libraries/**/*",
        path: withWindowsPath("libraries/libraryB"),
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    });

    expect(() =>
      project.createScriptCommand({
        args: "",
        method: "cd",
        scriptName: "not-a-script",
        workspaceNameOrAlias: "library-b",
      }),
    ).toThrow(PROJECT_ERRORS.WorkspaceScriptDoesNotExist);

    expect(() =>
      project.createScriptCommand({
        args: "",
        method: "cd",
        scriptName: "all-workspaces",
        workspaceNameOrAlias: "not-a-workspace",
      }),
    ).toThrow(PROJECT_ERRORS.ProjectWorkspaceNotFound);
  });

  test("MemoryProject", async () => {
    // Mainly a sanity test, as almost all functionality comes from ProjectBase and constructor logic is dead simple.

    const plainProject = createMemoryProject({
      workspaces: [],
    });

    expect(plainProject.sourceType).toEqual("memory");
    expect(plainProject.rootDirectory).toEqual("");
    expect(plainProject.workspaces).toEqual([]);
    expect(plainProject.name).toEqual("");

    const testWs1 = {
      name: "test-1",
      isRoot: false,
      matchPattern: "test/*",
      scripts: ["test-script"],
      aliases: [],
      dependencies: [],
      dependents: [],
      path: withWindowsPath("test/test-1"),
    };
    const testWs2 = {
      name: "test-2",
      isRoot: false,
      matchPattern: "test/*",
      scripts: ["test-script"],
      aliases: ["test-2-alias"],
      path: withWindowsPath("test/test-2"),
      dependencies: [],
      dependents: [],
    };
    const projectWithData = createMemoryProject({
      name: "test-project",
      rootDirectory: "test-project-directory",
      workspaces: [testWs1, testWs2],
    });

    expect(projectWithData.sourceType).toEqual("memory");
    expect(projectWithData.rootDirectory).toEqual(
      withWindowsPath("test-project-directory"),
    );
    expect(projectWithData.workspaces).toEqual([testWs1, testWs2]);
    expect(projectWithData.name).toEqual("test-project");

    expect(
      projectWithData.createScriptCommand({
        args: "",
        method: "cd",
        scriptName: "test-script",
        workspaceNameOrAlias: "test-1",
      }),
    ).toEqual({
      commandDetails: {
        workingDirectory: path.resolve(
          projectWithData.rootDirectory,
          withWindowsPath("test/test-1"),
        ),
        command: `bun --silent run test-script`,
      },
      scriptName: "test-script",
      workspace: testWs1,
    });

    expect(projectWithData.mapScriptsToWorkspaces()).toEqual({
      "test-script": {
        name: "test-script",
        workspaces: [testWs1, testWs2],
      },
    });

    expect(projectWithData.findWorkspaceByName("test-1")).toEqual(testWs1);
    expect(projectWithData.findWorkspaceByName("test-2")).toEqual(testWs2);
    expect(projectWithData.findWorkspaceByName("not-a-workspace")).toBeNull();

    expect(projectWithData.findWorkspaceByAlias("test-1-alias")).toBeNull();
    expect(projectWithData.findWorkspaceByAlias("test-2-alias")).toEqual(
      testWs2,
    );
    expect(projectWithData.findWorkspaceByAlias("not-a-alias")).toBeNull();

    expect(projectWithData.findWorkspaceByNameOrAlias("test-1")).toEqual(
      testWs1,
    );
    expect(projectWithData.findWorkspaceByNameOrAlias("test-2")).toEqual(
      testWs2,
    );
    expect(
      projectWithData.findWorkspaceByNameOrAlias("not-a-workspace"),
    ).toBeNull();

    expect(
      projectWithData.findWorkspaceByNameOrAlias("test-1-alias"),
    ).toBeNull();
    expect(projectWithData.findWorkspaceByNameOrAlias("test-2-alias")).toEqual(
      testWs2,
    );
    expect(
      projectWithData.findWorkspaceByNameOrAlias("not-a-alias"),
    ).toBeNull();

    expect(projectWithData.findWorkspacesByPattern("test-*")).toEqual([
      testWs1,
      testWs2,
    ]);

    expect(projectWithData.findWorkspacesByPattern("*-2")).toEqual([testWs2]);
    expect(projectWithData.findWorkspacesByPattern("not-a-pattern")).toEqual(
      [],
    );
  });

  // Note that a lot more tests around running scripts are present in other files
  // These are mainly sanity tests that the glue code is correct and options are followed

  test("FileSystemProject.runWorkspaceScript - simple", async () => {
    const project = createDefaultProject();

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "a-workspaces",
    });

    for await (const chunk of output) {
      expect(chunk.decode().trim()).toBe("script for a workspaces");
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        "script for a workspaces",
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const exitResult = await exit;
    expect(exitResult).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: {
          name: "application-a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      },
    });
  });

  test("FileSystemProject.runWorkspaceScript - inline", async () => {
    const project = createDefaultProject();

    const echo = `this is my inline script ${Math.round(Math.random() * 1000000)}`;

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: `echo ${echo}`,
      inline: true,
    });

    for await (const chunk of output) {
      expect(chunk.decode().trim()).toBe(`${echo}`);
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(`${echo}`);
      expect(chunk.streamName).toBe("stdout");
    }

    const exitResult = await exit;
    expect(exitResult).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: {
          name: "application-a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      },
    });
  });

  test("FileSystemProject.runWorkspaceScript - with args", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithEchoArgs"),
    });

    const packageScript = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-1a",
      script: "test-echo",
      args: "--arg1=value1 --arg2=value2",
    });

    for await (const chunk of packageScript.output) {
      expect(chunk.decode().trim()).toBe(
        "passed args: --arg1=value1 --arg2=value2",
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        "passed args: --arg1=value1 --arg2=value2",
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const exitResult = await packageScript.exit;
    expect(exitResult).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: {
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["test-echo"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      },
    });

    const inline = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-1a",
      script: `echo inline passed args: `,
      inline: true,
      args: "--arg1=value1 --arg2=value2",
    });

    for await (const chunk of inline.output) {
      expect(chunk.decode().trim().replace(/\s+/g, " ")).toBe(
        "inline passed args: --arg1=value1 --arg2=value2",
      );
      expect(
        chunk.decode({ stripAnsi: true }).trim().replace(/\s+/g, " "),
      ).toBe("inline passed args: --arg1=value1 --arg2=value2");
      expect(chunk.streamName).toBe("stdout");
    }

    const inlineExitResult = await inline.exit;
    expect(inlineExitResult).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: {
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["test-echo"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      },
    });
  });

  test("MemoryProject validates workspace names and aliases", () => {
    expect(() =>
      createMemoryProject({
        workspaces: [
          {
            name: "test-1",
            isRoot: false,
            matchPattern: "test/*",
            scripts: ["test-script"],
            aliases: [],
            dependencies: [],
            dependents: [],
            path: withWindowsPath("test/test-1"),
          },
          {
            name: "test-1",
            isRoot: false,
            matchPattern: "test/*",
            scripts: ["test-script"],
            aliases: [],
            dependencies: [],
            dependents: [],
            path: withWindowsPath("test/test-1"),
          },
        ],
      }),
    ).toThrow(WORKSPACE_ERRORS.DuplicateWorkspaceName);

    expect(() =>
      createMemoryProject({
        workspaces: [
          {
            name: "test-1",
            isRoot: false,
            matchPattern: "test/*",
            scripts: ["test-script"],
            aliases: ["test-1-alias"],
            path: withWindowsPath("test/test-1"),
            dependencies: [],
            dependents: [],
          },
          {
            name: "test-2",
            isRoot: false,
            matchPattern: "test/*",
            scripts: ["test-script"],
            aliases: ["test-1-alias"],
            path: withWindowsPath("test/test-2"),
            dependencies: [],
            dependents: [],
          },
        ],
      }),
    ).toThrow(WORKSPACE_ERRORS.AliasConflict);
  });
});
