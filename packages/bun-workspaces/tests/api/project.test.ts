import path from "path";
import { expect, test, describe } from "bun:test";
import type { Workspace, WorkspaceScriptMetadata } from "../../src";
import {
  createFileSystemProject,
  createMemoryProject,
} from "../../src/project";
import { PROJECT_ERRORS } from "../../src/project/errors";
import { WORKSPACE_ERRORS } from "../../src/workspaces";
import { getProjectRoot } from "../fixtures/testProjects";
import { makeTestWorkspace } from "../util/testData";
import { withWindowsPath } from "../util/windows";

const createDefaultProject = () =>
  createFileSystemProject({
    rootDirectory: getProjectRoot("fullProject"),
  });

const stripToName = (workspace: Workspace) => workspace.name;

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

describe("Test Project utilities", () => {
  describe("properties", () => {
    test("exposes rootDirectory", () => {
      const project = createDefaultProject();
      expect(project.rootDirectory).toEqual(getProjectRoot("fullProject"));
    });

    test("exposes sourceType", () => {
      const project = createDefaultProject();
      expect(project.sourceType).toEqual("fileSystem");
    });

    test("exposes workspaces", () => {
      const project = createDefaultProject();
      expect(project.workspaces).toEqual([
        makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
        makeTestWorkspace({
          name: "application-b",
          path: "applications/applicationB",
          matchPattern: "applications/*",
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
        }),
        makeTestWorkspace({
          name: "library-a",
          path: "libraries/libraryA",
          matchPattern: "libraries/**/*",
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
        }),
        makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
        makeTestWorkspace({
          name: "library-c",
          path: "libraries/nested/libraryC",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
        }),
      ]);
    });
  });

  describe("findWorkspaceByName", () => {
    test("returns null for unknown workspace", () => {
      const project = createDefaultProject();
      expect(project.findWorkspaceByName("not-a-workspace")).toBeNull();
    });

    test("finds application workspace by name", () => {
      const project = createDefaultProject();
      const workspace = project.findWorkspaceByName("application-a");
      expect(workspace?.name).toEqual("application-a");
      expect(workspace?.path).toEqual(
        withWindowsPath("applications/applicationA"),
      );
      expect(workspace?.scripts).toEqual([
        "a-workspaces",
        "all-workspaces",
        "application-a",
      ]);
      expect(workspace?.matchPattern).toEqual("applications/*");
    });

    test("finds nested library workspace by name", () => {
      const project = createDefaultProject();
      const workspace = project.findWorkspaceByName("library-c");
      expect(workspace?.name).toEqual("library-c");
      expect(workspace?.path).toEqual(
        withWindowsPath("libraries/nested/libraryC"),
      );
      expect(workspace?.scripts).toEqual([
        "all-workspaces",
        "c-workspaces",
        "library-c",
      ]);
      expect(workspace?.matchPattern).toEqual("libraries/**/*");
    });
  });

  describe("findWorkspacesByPattern", () => {
    test("returns empty for unknown workspace", () => {
      const project = createDefaultProject();
      expect(project.findWorkspacesByPattern("not-a-workspace")).toEqual([]);
    });

    test("returns empty for empty pattern", () => {
      const project = createDefaultProject();
      expect(project.findWorkspacesByPattern("").map(stripToName)).toEqual([]);
    });

    test("matches all with wildcard", () => {
      const project = createDefaultProject();
      expect(project.findWorkspacesByPattern("*").map(stripToName)).toEqual([
        "application-a",
        "application-b",
        "library-a",
        "library-b",
        "library-c",
      ]);
    });

    test("matches by name prefix", () => {
      const project = createDefaultProject();
      expect(
        project.findWorkspacesByPattern("application-*").map(stripToName),
      ).toEqual(["application-a", "application-b"]);

      expect(
        project.findWorkspacesByPattern("library-*").map(stripToName),
      ).toEqual(["library-a", "library-b", "library-c"]);
    });

    test("matches exact name", () => {
      const project = createDefaultProject();
      expect(
        project.findWorkspacesByPattern("library-c").map(stripToName),
      ).toEqual(["library-c"]);
    });

    test("matches exact name with trailing wildcard", () => {
      const project = createDefaultProject();
      expect(
        project.findWorkspacesByPattern("library-c*").map(stripToName),
      ).toEqual(["library-c"]);
    });

    test("matches by name suffix", () => {
      const project = createDefaultProject();
      expect(project.findWorkspacesByPattern("*-c").map(stripToName)).toEqual([
        "library-c",
      ]);

      expect(project.findWorkspacesByPattern("*-b").map(stripToName)).toEqual([
        "application-b",
        "library-b",
      ]);
    });

    test("matches complex infix pattern", () => {
      const project = createDefaultProject();
      expect(
        project.findWorkspacesByPattern("*a*-a*").map(stripToName),
      ).toEqual(["application-a", "library-a"]);
    });

    test("matches multi-wildcard pattern", () => {
      const project = createDefaultProject();
      expect(
        project.findWorkspacesByPattern("**b****-*b**").map(stripToName),
      ).toEqual(["library-b"]);
    });

    test("combines path and name specifiers", () => {
      const project = createDefaultProject();
      expect(
        project
          .findWorkspacesByPattern("path:libraries/*", "name:*-a")
          .map(stripToName),
      ).toEqual(["application-a", "library-a", "library-b"]);
    });

    test("combines path and alias specifiers", () => {
      const project = createDefaultProject();
      expect(
        project
          .findWorkspacesByPattern(
            "path:libraries/**/*",
            "alias:does-not-exist",
          )
          .map(stripToName),
      ).toEqual(["library-a", "library-b", "library-c"]);
    });

    test("combines alias, name, and path specifiers with aliases project", () => {
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
  });

  describe("listWorkspacesWithScript", () => {
    test("lists all workspaces for shared script", () => {
      const project = createDefaultProject();
      expect(project.listWorkspacesWithScript("all-workspaces")).toEqual([
        makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
        makeTestWorkspace({
          name: "application-b",
          path: "applications/applicationB",
          matchPattern: "applications/*",
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
        }),
        makeTestWorkspace({
          name: "library-a",
          path: "libraries/libraryA",
          matchPattern: "libraries/**/*",
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
        }),
        makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
        makeTestWorkspace({
          name: "library-c",
          path: "libraries/nested/libraryC",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
        }),
      ]);
    });

    test("lists workspaces for group scripts", () => {
      const project = createDefaultProject();
      expect(
        project.listWorkspacesWithScript("a-workspaces").map(stripToName),
      ).toEqual(["application-a", "library-a"]);

      expect(
        project.listWorkspacesWithScript("b-workspaces").map(stripToName),
      ).toEqual(["application-b", "library-b"]);

      expect(
        project.listWorkspacesWithScript("c-workspaces").map(stripToName),
      ).toEqual(["library-c"]);
    });

    test("returns empty for unknown script", () => {
      const project = createDefaultProject();
      expect(project.listWorkspacesWithScript("not-a-script")).toEqual([]);
    });

    test("lists single workspace for workspace-specific scripts", () => {
      const project = createDefaultProject();
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
  });

  describe("mapScriptsToWorkspaces", () => {
    test("maps all scripts to their workspaces", () => {
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
  });

  describe("createScriptCommand", () => {
    test("creates cd command without args", () => {
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
        workspace: makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
      });
    });

    test("creates cd command with args", () => {
      const project = createDefaultProject();
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
        workspace: makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
      });
    });

    test("creates filter command with args", () => {
      const project = createDefaultProject();
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
        workspace: makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
      });
    });

    test("creates filter command with multiple args", () => {
      const project = createDefaultProject();
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
        workspace: makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
      });
    });

    test("creates cd command for different workspace", () => {
      const project = createDefaultProject();
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
        workspace: makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
      });
    });

    test("creates filter command for different workspace", () => {
      const project = createDefaultProject();
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
        workspace: makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
      });
    });

    test("throws for nonexistent script", () => {
      const project = createDefaultProject();
      expect(() =>
        project.createScriptCommand({
          args: "",
          method: "cd",
          scriptName: "not-a-script",
          workspaceNameOrAlias: "library-b",
        }),
      ).toThrow(PROJECT_ERRORS.WorkspaceScriptDoesNotExist);
    });

    test("throws for nonexistent workspace", () => {
      const project = createDefaultProject();
      expect(() =>
        project.createScriptCommand({
          args: "",
          method: "cd",
          scriptName: "all-workspaces",
          workspaceNameOrAlias: "not-a-workspace",
        }),
      ).toThrow(PROJECT_ERRORS.ProjectWorkspaceNotFound);
    });
  });

  describe("runWorkspaceScript", () => {
    test("runs simple package script", async () => {
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
          workspace: makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
        },
      });
    });

    test("runs inline script", async () => {
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
          workspace: makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
        },
      });
    });

    test("runs package script with args", async () => {
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
          workspace: makeTestWorkspace({
            name: "application-1a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["test-echo"],
          }),
        },
      });
    });

    test("runs inline script with args", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("runScriptWithEchoArgs"),
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
          workspace: makeTestWorkspace({
            name: "application-1a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["test-echo"],
          }),
        },
      });
    });
  });

  describe("MemoryProject", () => {
    test("creates empty project with defaults", () => {
      const plainProject = createMemoryProject({
        workspaces: [],
      });

      expect(plainProject.sourceType).toEqual("memory");
      expect(plainProject.rootDirectory).toEqual("");
      expect(plainProject.workspaces).toEqual([]);
      expect(plainProject.name).toEqual("");
    });

    const testWs1 = makeTestWorkspace({
      name: "test-1",
      path: "test/test-1",
      matchPattern: "test/*",
      scripts: ["test-script"],
    });
    const testWs2 = makeTestWorkspace({
      name: "test-2",
      path: "test/test-2",
      matchPattern: "test/*",
      scripts: ["test-script"],
      aliases: ["test-2-alias"],
    });

    const createTestProject = () =>
      createMemoryProject({
        name: "test-project",
        rootDirectory: "test-project-directory",
        workspaces: [testWs1, testWs2],
      });

    test("creates project with workspaces and properties", () => {
      const projectWithData = createTestProject();
      expect(projectWithData.sourceType).toEqual("memory");
      expect(projectWithData.rootDirectory).toEqual(
        withWindowsPath("test-project-directory"),
      );
      expect(projectWithData.workspaces).toEqual([testWs1, testWs2]);
      expect(projectWithData.name).toEqual("test-project");
    });

    test("createScriptCommand works", () => {
      const projectWithData = createTestProject();
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
    });

    test("mapScriptsToWorkspaces works", () => {
      const projectWithData = createTestProject();
      expect(projectWithData.mapScriptsToWorkspaces()).toEqual({
        "test-script": {
          name: "test-script",
          workspaces: [testWs1, testWs2],
        },
      });
    });

    test("findWorkspaceByName finds or returns null", () => {
      const projectWithData = createTestProject();
      expect(projectWithData.findWorkspaceByName("test-1")).toEqual(testWs1);
      expect(projectWithData.findWorkspaceByName("test-2")).toEqual(testWs2);
      expect(projectWithData.findWorkspaceByName("not-a-workspace")).toBeNull();
    });

    test("findWorkspaceByAlias finds or returns null", () => {
      const projectWithData = createTestProject();
      expect(projectWithData.findWorkspaceByAlias("test-1-alias")).toBeNull();
      expect(projectWithData.findWorkspaceByAlias("test-2-alias")).toEqual(
        testWs2,
      );
      expect(projectWithData.findWorkspaceByAlias("not-a-alias")).toBeNull();
    });

    test("findWorkspaceByNameOrAlias finds by name or alias", () => {
      const projectWithData = createTestProject();
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
      expect(
        projectWithData.findWorkspaceByNameOrAlias("test-2-alias"),
      ).toEqual(testWs2);
      expect(
        projectWithData.findWorkspaceByNameOrAlias("not-a-alias"),
      ).toBeNull();
    });

    test("findWorkspacesByPattern matches patterns", () => {
      const projectWithData = createTestProject();
      expect(projectWithData.findWorkspacesByPattern("test-*")).toEqual([
        testWs1,
        testWs2,
      ]);

      expect(projectWithData.findWorkspacesByPattern("*-2")).toEqual([testWs2]);
      expect(projectWithData.findWorkspacesByPattern("not-a-pattern")).toEqual(
        [],
      );
    });

    test("throws for duplicate workspace name", () => {
      expect(() =>
        createMemoryProject({
          workspaces: [
            makeTestWorkspace({
              name: "test-1",
              path: "test/test-1",
              matchPattern: "test/*",
              scripts: ["test-script"],
            }),
            makeTestWorkspace({
              name: "test-1",
              path: "test/test-1",
              matchPattern: "test/*",
              scripts: ["test-script"],
            }),
          ],
        }),
      ).toThrow(WORKSPACE_ERRORS.DuplicateWorkspaceName);
    });

    test("throws for duplicate alias", () => {
      expect(() =>
        createMemoryProject({
          workspaces: [
            makeTestWorkspace({
              name: "test-1",
              path: "test/test-1",
              matchPattern: "test/*",
              scripts: ["test-script"],
              aliases: ["test-1-alias"],
            }),
            makeTestWorkspace({
              name: "test-2",
              path: "test/test-2",
              matchPattern: "test/*",
              scripts: ["test-script"],
              aliases: ["test-1-alias"],
            }),
          ],
        }),
      ).toThrow(WORKSPACE_ERRORS.AliasConflict);
    });
  });
});
