import { availableParallelism } from "os";
import path from "path";
import { expect, test, describe } from "bun:test";
import { getUserEnvVar, getUserEnvVarName } from "../../src/config/userEnvVars";
import { BUN_LOCK_ERRORS } from "../../src/internal/bun";
import { createFileSystemProject, PROJECT_ERRORS } from "../../src/project";
import { getProjectRoot } from "../fixtures/testProjects";
import { withWindowsPath } from "../util/windows";

describe("Test FileSystemProject", () => {
  test("createFileSystemProject: root directory defaults to process.cwd()", async () => {
    if (process.env.IS_BUILD === "true") {
      expect(createFileSystemProject().rootDirectory).toBe(
        withWindowsPath(process.cwd()),
      );
    } else {
      expect(() => createFileSystemProject()).toThrow(
        BUN_LOCK_ERRORS.BunLockNotFound,
      );
      expect(() => createFileSystemProject()).toThrow(
        `No bun.lock found at ${withWindowsPath(process.cwd())}.`,
      );
    }
  });

  test("createFileSystemProject: root directory is relative to process.cwd()  ", async () => {
    if (process.env.IS_BUILD === "true") {
      const project = createFileSystemProject({
        rootDirectory: "../../../",
      });
      expect(project.rootDirectory).toBe(
        withWindowsPath(path.resolve(process.cwd(), "../../..")),
      );
    } else {
      const project = createFileSystemProject({
        rootDirectory: "../..",
      });
      expect(project.rootDirectory).toBe(
        withWindowsPath(path.resolve(process.cwd(), "../..")),
      );
    }
  });

  test("runWorkspaceScript: simple success", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "a-workspaces",
    });

    for await (const chunk of output) {
      expect(chunk.decode().trim()).toMatch("script for a workspaces");
      expect(chunk.decode({ stripAnsi: true }).trim()).toMatch(
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
          path: withWindowsPath("applications/applicationA"),
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      },
    });
  });

  test("runWorkspaceScript: using workspace alias", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("workspaceConfigPackageOnly"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "appA",
      script: "a-workspaces",
    });

    for await (const chunk of output) {
      expect(chunk.decode().trim()).toMatch("script for a workspaces");
      expect(chunk.decode({ stripAnsi: true }).trim()).toMatch(
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
          name: "application-1a",
          isRoot: false,
          path: withWindowsPath("applications/application-a"),
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: ["appA"],
          dependencies: [],
          dependents: [],
        },
      },
    });
  });

  test("runWorkspaceScript: invalid workspace", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    try {
      project.runWorkspaceScript({
        workspaceNameOrAlias: "invalid-workspace",
        script: "a-workspaces",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PROJECT_ERRORS.ProjectWorkspaceNotFound);
    }
  });

  test("runWorkspaceScript: expected output", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithMixedOutput"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "fail1",
      script: "test-exit",
    });

    const expectedOutput = [
      {
        text: "fail1 stdout 1",
        textNoAnsi: "fail1 stdout 1",
        streamName: "stdout",
      },
      {
        text: "fail1 stderr 1",
        textNoAnsi: "fail1 stderr 1",
        streamName: "stderr",
      },
      {
        text: "fail1 stdout 2",
        textNoAnsi: "fail1 stdout 2",
        streamName: "stdout",
      },
    ] as const;

    let i = 0;
    for await (const chunk of output) {
      const expected = expectedOutput[i];
      expect(chunk.decode().trim()).toMatch(expected.text);
      expect(chunk.decode({ stripAnsi: true }).trim()).toMatch(
        expected.textNoAnsi,
      );
      expect(chunk.streamName).toBe(expected.streamName);
      i++;
    }

    const exitResult = await exit;
    expect(exitResult).toEqual({
      exitCode: 1,
      success: false,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: {
          name: "fail1",
          isRoot: false,
          path: withWindowsPath("packages/fail1"),
          matchPattern: "packages/**/*",
          scripts: ["test-exit"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      },
    });
  });

  test("runWorkspaceScript: runtime metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const plainResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "test-echo",
    });

    for await (const chunk of plainResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo`,
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const argsResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "test-echo",
      args: "--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    });

    for await (const chunk of argsResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-a --arg4=${project.rootDirectory}${withWindowsPath("/applications/application-a")} --arg5=${withWindowsPath("applications/application-a")} --arg6=test-echo`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-a --arg4=${project.rootDirectory}${withWindowsPath("/applications/application-a")} --arg5=${withWindowsPath("applications/application-a")} --arg6=test-echo`,
      );
      expect(chunk.streamName).toBe("stdout");
    }
  });

  test("runWorkspaceScript: runtime metadata (inline)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const anonymousScriptResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script:
        "echo <projectPath> <projectName> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: true,
    });

    for await (const chunk of anonymousScriptResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")}`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")}`,
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const namedScriptResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script:
        "echo <projectPath> <projectName> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: { scriptName: "my-named-script" },
    });

    for await (const chunk of namedScriptResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} my-named-script`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} my-named-script`,
      );
      expect(chunk.streamName).toBe("stdout");
    }
  });

  test("runScriptAcrossWorkspaces: simple success", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["library-b"],
      script: "b-workspaces",
    });

    for await (const { outputChunk, scriptMetadata } of output) {
      expect(outputChunk.decode().trim()).toMatch("script for b workspaces");
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toMatch(
        "script for b workspaces",
      );
      expect(outputChunk.streamName).toBe("stdout");
      expect(scriptMetadata.workspace).toEqual({
        name: "library-b",
        isRoot: false,
        path: withWindowsPath("libraries/libraryB"),
        matchPattern: "libraries/**/*",
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: [],
        dependencies: [],
        dependents: [],
      });
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            workspace: {
              name: "library-b",
              isRoot: false,
              path: withWindowsPath("libraries/libraryB"),
              matchPattern: "libraries/**/*",
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
      ],
    });
  });

  test("runScriptAcrossWorkspaces: all workspaces", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("simple1"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      script: "all-workspaces",
    });

    const outputChunk = {
      streamName: "stdout" as const,
      text: "script for all workspaces",
      textNoAnsi: "script for all workspaces",
    };

    const expectedOutput = [
      { outputChunk },
      { outputChunk },
      { outputChunk },
      { outputChunk },
    ];

    let i = 0;
    for await (const { outputChunk } of output) {
      expect(outputChunk.decode().trim()).toBe(
        expectedOutput[i].outputChunk.text,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        expectedOutput[i].outputChunk.textNoAnsi,
      );
      i++;
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual({
      totalCount: 4,
      successCount: 4,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
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
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            workspace: {
              name: "application-1b",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationB"),
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            workspace: {
              name: "library-1a",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryA"),
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
      ],
    });
  });

  test("runScriptAcrossWorkspaces: some workspaces", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("simple1"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-1b", "library*"],
      script: "b-workspaces",
    });

    const expectedOutput = [
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for b workspaces",
          textNoAnsi: "script for b workspaces",
        },
        scriptMetadata: {
          workspace: {
            name: "application-1b",
            isRoot: false,
            matchPattern: "applications/*",
            path: withWindowsPath("applications/applicationB"),
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for b workspaces",
          textNoAnsi: "script for b workspaces",
        },
        scriptMetadata: {
          workspace: {
            name: "library-1b",
            isRoot: false,
            matchPattern: "libraries/*",
            path: withWindowsPath("libraries/libraryB"),
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
    ];

    let i = 0;
    for await (const { outputChunk } of output) {
      expect(outputChunk.decode().trim()).toBe(
        expectedOutput[i].outputChunk.text,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        expectedOutput[i].outputChunk.textNoAnsi,
      );
      expect(outputChunk.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      i++;
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual({
      totalCount: 2,
      successCount: 2,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            workspace: {
              name: "application-1b",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationB"),
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
      ],
    });
  });

  test("runScriptAcrossWorkspaces: no workspaces", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("simple1"),
    });

    expect(() =>
      project.runScriptAcrossWorkspaces({
        workspacePatterns: [],
        script: "all-workspaces",
      }),
    ).toThrow('No matching workspaces found with script "all-workspaces"');
  });

  test("runScriptAcrossWorkspaces: all workspaces", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("simple1"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["*"],
      script: "all-workspaces",
    });

    const expectedOutput = [
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: {
            name: "application-1a",
            isRoot: false,
            matchPattern: "applications/*",
            path: withWindowsPath("applications/applicationA"),
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: {
            name: "application-1b",
            isRoot: false,
            matchPattern: "applications/*",
            path: withWindowsPath("applications/applicationB"),
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: {
            name: "library-1a",
            isRoot: false,
            matchPattern: "libraries/*",
            path: withWindowsPath("libraries/libraryA"),
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: {
            name: "library-1b",
            isRoot: false,
            matchPattern: "libraries/*",
            path: withWindowsPath("libraries/libraryB"),
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
    ];

    let i = 0;
    for await (const { outputChunk } of output) {
      expect(outputChunk.decode().trim()).toBe(
        expectedOutput[i].outputChunk.text,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        expectedOutput[i].outputChunk.textNoAnsi,
      );
      expect(outputChunk.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      i++;
    }

    const summaryResult = await summary;

    expect(summaryResult).toEqual({
      totalCount: 4,
      successCount: 4,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "application-1b",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationB"),
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "library-1a",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryA"),
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
      ],
    });
  });

  test("runScriptAcrossWorkspaces: with args", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithEchoArgs"),
    });

    const { output } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script: "test-echo",
      args: "--arg1=value1 --arg2=value2",
    });

    const expectedOutput = [
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "passed args: --arg1=value1 --arg2=value2",
          textNoAnsi: "passed args: --arg1=value1 --arg2=value2",
        },
        scriptMetadata: {
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
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "passed args: --arg1=value1 --arg2=value2",
          textNoAnsi: "passed args: --arg1=value1 --arg2=value2",
        },
        scriptMetadata: {
          workspace: {
            name: "application-1b",
            isRoot: false,
            matchPattern: "applications/*",
            path: withWindowsPath("applications/applicationB"),
            scripts: ["test-echo"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
    ];

    let i = 0;
    for await (const { outputChunk } of output) {
      expect(outputChunk.decode().trim()).toBe(
        expectedOutput[i].outputChunk.text,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        expectedOutput[i].outputChunk.textNoAnsi,
      );
      expect(outputChunk.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      i++;
    }
  });

  test("runScriptAcrossWorkspaces: runtime metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const plainResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script: "test-echo",
    });

    let i = 0;
    for await (const { outputChunk: chunk } of plainResult.output) {
      const appLetter = i === 0 ? "a" : "b";
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo`,
      );
      expect(chunk.streamName).toBe("stdout");
      i++;
    }

    const argsResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script: "test-echo",
      args: "--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    });

    let j = 0;
    for await (const { outputChunk: chunk } of argsResult.output) {
      const appLetter = j === 0 ? "a" : "b";
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-${appLetter} --arg4=${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} --arg5=${withWindowsPath(`applications/application-${appLetter}`)} --arg6=test-echo`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-${appLetter} --arg4=${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} --arg5=${withWindowsPath(`applications/application-${appLetter}`)} --arg6=test-echo`,
      );
      expect(chunk.streamName).toBe("stdout");
      j++;
    }
  });

  test("runScriptAcrossWorkspaces: runtime metadata (inline)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const anonymousScriptResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script:
        "echo <projectPath> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: true,
    });

    let k = 0;
    for await (const { outputChunk: chunk } of anonymousScriptResult.output) {
      const appLetter = k === 0 ? "a" : "b";
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)}`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)}`,
      );
      expect(chunk.streamName).toBe("stdout");
      k++;
    }

    const namedScriptResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script:
        "echo <projectPath> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: { scriptName: "my-named-script" },
    });

    let l = 0;
    for await (const { outputChunk: chunk } of namedScriptResult.output) {
      const appLetter = l === 0 ? "a" : "b";

      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} my-named-script`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} my-named-script`,
      );
      expect(chunk.streamName).toBe("stdout");
      l++;
    }
  });

  test("Inline script env var metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const singleResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "bun run <projectPath>/../testScriptMetadataEnv.ts",
      inline: { scriptName: "test-script-metadata-env" },
    });

    let output = "";
    for await (const chunk of singleResult.output) {
      output += chunk.decode();
    }

    expect(output).toBe(`${project.rootDirectory}
test-root
application-a
${project.rootDirectory}${withWindowsPath("/applications/applicationA")}
${withWindowsPath("applications/applicationA")}
test-script-metadata-env
`);

    const multiResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-b"],
      script: "bun run <projectPath>/../testScriptMetadataEnv.ts",
      inline: { scriptName: "test-script-metadata-env-b" },
    });

    output = "";
    for await (const { outputChunk: chunk } of multiResult.output) {
      output += chunk.decode();
    }
    expect(output).toBe(`${project.rootDirectory}
test-root
application-b
${project.rootDirectory}${withWindowsPath("/applications/applicationB")}
${withWindowsPath("applications/applicationB")}
test-script-metadata-env-b
`);
  });

  test("runScriptAcrossWorkspaces: with failures", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithFailures"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["*"],
      script: "test-exit",
    });

    const expectedOutput = [
      {
        outputChunk: {
          streamName: "stderr" as const,
          text: "fail1",
          textNoAnsi: "fail1",
        },
        scriptMetadata: {
          workspace: {
            name: "fail1",
            isRoot: false,
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/fail1"),
            scripts: ["test-exit"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stderr" as const,
          text: "fail2",
          textNoAnsi: "fail2",
        },
        scriptMetadata: {
          workspace: {
            name: "fail2",
            isRoot: false,
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/fail2"),
            scripts: ["test-exit"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "success1",
          textNoAnsi: "success1",
        },
        scriptMetadata: {
          workspace: {
            name: "success1",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/success1"),
            scripts: ["test-exit"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "success2",
          textNoAnsi: "success2",
        },
        scriptMetadata: {
          workspace: {
            name: "success2",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/success2"),
            scripts: ["test-exit"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
    ];

    let i = 0;
    for await (const { outputChunk } of output) {
      expect(outputChunk.decode().trim()).toBe(
        expectedOutput[i].outputChunk.text,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        expectedOutput[i].outputChunk.textNoAnsi,
      );
      expect(outputChunk.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      i++;
    }

    const summaryResult = await summary;

    expect(summaryResult).toEqual({
      totalCount: 4,
      successCount: 2,
      failureCount: 2,
      allSuccess: false,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 1,
          signal: null,
          success: false,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "fail1",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fail1"),
              scripts: ["test-exit"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 2,
          signal: null,
          success: false,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "fail2",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fail2"),
              scripts: ["test-exit"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "success1",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/success1"),
              scripts: ["test-exit"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "success2",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/success2"),
              scripts: ["test-exit"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
      ],
    });
  });

  test("runScriptAcrossWorkspaces: parallel", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithDelays"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["*"],
      script: "test-delay",
      parallel: true,
    });

    const expectedOutput = [
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "first",
          textNoAnsi: "first",
        },
        scriptMetadata: {
          workspace: {
            name: "first",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/first"),
            scripts: ["test-delay"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "second",
          textNoAnsi: "second",
        },
        scriptMetadata: {
          workspace: {
            name: "second",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/second"),
            scripts: ["test-delay"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "third",
          textNoAnsi: "third",
        },
        scriptMetadata: {
          workspace: {
            name: "third",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/third"),
            scripts: ["test-delay"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "fourth",
          textNoAnsi: "fourth",
        },
        scriptMetadata: {
          workspace: {
            name: "fourth",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/fourth"),
            scripts: ["test-delay"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "fifth",
          textNoAnsi: "fifth",
        },
        scriptMetadata: {
          workspace: {
            name: "fifth",
            matchPattern: "packages/**/*",
            path: withWindowsPath("packages/fifth"),
            scripts: ["test-delay"],
            aliases: [],
            dependencies: [],
            dependents: [],
          },
        },
      },
    ];

    let i = 0;
    for await (const { outputChunk } of output) {
      expect(outputChunk.decode().trim()).toBe(
        expectedOutput[i].outputChunk.text,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        expectedOutput[i].outputChunk.textNoAnsi,
      );
      expect(outputChunk.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      i++;
    }

    const summaryResult = await summary;

    expect(summaryResult.durationMs).toBeGreaterThan(1000);
    expect(summaryResult.durationMs).toBeLessThan(2000);

    expect(summaryResult).toEqual({
      totalCount: 5,
      successCount: 5,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "fifth",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fifth"),
              scripts: ["test-delay"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "first",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/first"),
              scripts: ["test-delay"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "fourth",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fourth"),
              scripts: ["test-delay"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "second",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/second"),
              scripts: ["test-delay"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
        {
          exitCode: 0,
          signal: null,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          metadata: {
            workspace: {
              name: "third",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/third"),
              scripts: ["test-delay"],
              aliases: [],
              dependencies: [],
              dependents: [],
            },
          },
        },
      ],
    });
  });

  test.each([1, 2, 3, "default", "auto", "unbounded", "100%", "50%"])(
    "runScriptAcrossWorkspaces: parallel with max (%p)",
    async (max) => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("runScriptWithDebugParallelMax"),
      });

      const { output } = project.runScriptAcrossWorkspaces({
        workspacePatterns: ["*"],
        script: "test-debug",
        parallel: { max },
      });

      for await (const { outputChunk } of output) {
        const maxValue = outputChunk.decode().trim();
        if (typeof max === "number") {
          expect(maxValue).toBe(max.toString());
        } else if (max === "default") {
          expect(maxValue).toBe(
            getUserEnvVar("parallelMaxDefault")?.trim() ??
              availableParallelism().toString(),
          );
        } else if (max === "auto") {
          expect(maxValue).toBe(availableParallelism().toString());
        } else if (max === "unbounded") {
          expect(maxValue).toBe("Infinity");
        } else if (max.endsWith("%")) {
          expect(maxValue).toBe(
            Math.max(
              1,
              Math.floor(
                (availableParallelism() * parseFloat(max.slice(0, -1))) / 100,
              ),
            ).toString(),
          );
        }
      }
    },
  );

  test("Include root workspace - explicit", () => {
    const projectExclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
    });

    expect(
      projectExclude.workspaces.find((w) =>
        Bun.deepEquals(w, projectExclude.rootWorkspace),
      ),
    ).toBeFalsy();

    const projectInclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
      includeRootWorkspace: true,
    });

    expect(projectInclude.rootWorkspace).toEqual(projectInclude.workspaces[0]);
  });

  test("Include root workspace - env var", () => {
    process.env[getUserEnvVarName("includeRootWorkspaceDefault")] = "false";

    const projectExclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
    });

    expect(
      projectExclude.workspaces.find((w) =>
        Bun.deepEquals(w, projectExclude.rootWorkspace),
      ),
    ).toBeFalsy();

    process.env[getUserEnvVarName("includeRootWorkspaceDefault")] = "true";

    const projectInclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
    });

    expect(projectInclude.rootWorkspace).toEqual(projectInclude.workspaces[0]);

    const projectExcludeOverride = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
      includeRootWorkspace: false,
    });

    expect(
      projectExcludeOverride.workspaces.find((w) =>
        Bun.deepEquals(w, projectExcludeOverride.rootWorkspace),
      ),
    ).toBeFalsy();

    delete process.env[getUserEnvVarName("includeRootWorkspaceDefault")];
  });

  test("Include root workspace - config file", () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspaceWithConfigFiles"),
    });

    expect(project.rootWorkspace).toEqual(project.workspaces[0]);

    process.env[getUserEnvVarName("includeRootWorkspaceDefault")] = "false";

    const projectNotOverridden = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspaceWithConfigFiles"),
    });

    expect(projectNotOverridden.rootWorkspace).toEqual(
      projectNotOverridden.workspaces[0],
    );

    const projectOverridden = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspaceWithConfigFiles"),
      includeRootWorkspace: false,
    });

    expect(
      projectOverridden.workspaces.find((w) =>
        Bun.deepEquals(w, projectOverridden.rootWorkspace),
      ),
    ).toBeFalsy();

    delete process.env[getUserEnvVarName("includeRootWorkspaceDefault")];
  });
});
