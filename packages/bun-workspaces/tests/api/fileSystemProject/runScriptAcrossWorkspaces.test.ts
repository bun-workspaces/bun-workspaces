import { availableParallelism } from "os";
import { expect, test, describe } from "bun:test";
import { getUserEnvVar } from "../../../src/config/userEnvVars";
import { createFileSystemProject } from "../../../src/project";
import { getProjectRoot } from "../../fixtures/testProjects";
import { makeTestWorkspace } from "../../util/testData";
import { withWindowsPath } from "../../util/windows";

describe("FileSystemProject runScriptAcrossWorkspaces", () => {
  test("simple success", async () => {
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
      expect(scriptMetadata.workspace).toEqual(
        makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
      );
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
            workspace: makeTestWorkspace({
              name: "library-b",
              path: "libraries/libraryB",
              matchPattern: "libraries/**/*",
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
            }),
          },
        },
      ],
    });
  });

  test("all workspaces", async () => {
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
            workspace: makeTestWorkspace({
              name: "application-1a",
              matchPattern: "applications/*",
              path: "applications/applicationA",
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
            }),
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
            workspace: makeTestWorkspace({
              name: "application-1b",
              matchPattern: "applications/*",
              path: "applications/applicationB",
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
            }),
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
            workspace: makeTestWorkspace({
              name: "library-1a",
              matchPattern: "libraries/*",
              path: "libraries/libraryA",
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
            }),
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
            workspace: makeTestWorkspace({
              name: "library-1b",
              matchPattern: "libraries/*",
              path: "libraries/libraryB",
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
            }),
          },
        },
      ],
    });
  });

  test("some workspaces", async () => {
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
          workspace: makeTestWorkspace({
            name: "application-1b",
            matchPattern: "applications/*",
            path: "applications/applicationB",
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for b workspaces",
          textNoAnsi: "script for b workspaces",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "library-1b",
            matchPattern: "libraries/*",
            path: "libraries/libraryB",
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
          }),
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
            workspace: makeTestWorkspace({
              name: "application-1b",
              matchPattern: "applications/*",
              path: "applications/applicationB",
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
            }),
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
            workspace: makeTestWorkspace({
              name: "library-1b",
              matchPattern: "libraries/*",
              path: "libraries/libraryB",
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
            }),
          },
        },
      ],
    });
  });

  test("no workspaces", async () => {
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

  test("all workspaces with wildcard pattern", async () => {
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
          workspace: makeTestWorkspace({
            name: "application-1a",
            matchPattern: "applications/*",
            path: "applications/applicationA",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "application-1b",
            matchPattern: "applications/*",
            path: "applications/applicationB",
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "library-1a",
            matchPattern: "libraries/*",
            path: "libraries/libraryA",
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "script for all workspaces",
          textNoAnsi: "script for all workspaces",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "library-1b",
            matchPattern: "libraries/*",
            path: "libraries/libraryB",
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
          }),
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
            workspace: makeTestWorkspace({
              name: "application-1a",
              matchPattern: "applications/*",
              path: "applications/applicationA",
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
            }),
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
            workspace: makeTestWorkspace({
              name: "application-1b",
              matchPattern: "applications/*",
              path: "applications/applicationB",
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
            }),
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
            workspace: makeTestWorkspace({
              name: "library-1a",
              matchPattern: "libraries/*",
              path: "libraries/libraryA",
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
            }),
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
            workspace: makeTestWorkspace({
              name: "library-1b",
              matchPattern: "libraries/*",
              path: "libraries/libraryB",
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
            }),
          },
        },
      ],
    });
  });

  test("with args", async () => {
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
          workspace: makeTestWorkspace({
            name: "application-1a",
            matchPattern: "applications/*",
            path: "applications/applicationA",
            scripts: ["test-echo"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "passed args: --arg1=value1 --arg2=value2",
          textNoAnsi: "passed args: --arg1=value1 --arg2=value2",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "application-1b",
            matchPattern: "applications/*",
            path: "applications/applicationB",
            scripts: ["test-echo"],
          }),
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

  test("runtime metadata", async () => {
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

  test("runtime metadata (inline)", async () => {
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

  test("with failures", async () => {
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
          workspace: makeTestWorkspace({
            name: "fail1",
            matchPattern: "packages/**/*",
            path: "packages/fail1",
            scripts: ["test-exit"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stderr" as const,
          text: "fail2",
          textNoAnsi: "fail2",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "fail2",
            matchPattern: "packages/**/*",
            path: "packages/fail2",
            scripts: ["test-exit"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "success1",
          textNoAnsi: "success1",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "success1",
            matchPattern: "packages/**/*",
            path: "packages/success1",
            scripts: ["test-exit"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "success2",
          textNoAnsi: "success2",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "success2",
            matchPattern: "packages/**/*",
            path: "packages/success2",
            scripts: ["test-exit"],
          }),
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
            workspace: makeTestWorkspace({
              name: "fail1",
              matchPattern: "packages/**/*",
              path: "packages/fail1",
              scripts: ["test-exit"],
            }),
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
            workspace: makeTestWorkspace({
              name: "fail2",
              matchPattern: "packages/**/*",
              path: "packages/fail2",
              scripts: ["test-exit"],
            }),
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
            workspace: makeTestWorkspace({
              name: "success1",
              matchPattern: "packages/**/*",
              path: "packages/success1",
              scripts: ["test-exit"],
            }),
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
            workspace: makeTestWorkspace({
              name: "success2",
              matchPattern: "packages/**/*",
              path: "packages/success2",
              scripts: ["test-exit"],
            }),
          },
        },
      ],
    });
  });

  test("parallel", async () => {
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
          workspace: makeTestWorkspace({
            name: "first",
            matchPattern: "packages/**/*",
            path: "packages/first",
            scripts: ["test-delay"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "second",
          textNoAnsi: "second",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "second",
            matchPattern: "packages/**/*",
            path: "packages/second",
            scripts: ["test-delay"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "third",
          textNoAnsi: "third",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "third",
            matchPattern: "packages/**/*",
            path: "packages/third",
            scripts: ["test-delay"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "fourth",
          textNoAnsi: "fourth",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "fourth",
            matchPattern: "packages/**/*",
            path: "packages/fourth",
            scripts: ["test-delay"],
          }),
        },
      },
      {
        outputChunk: {
          streamName: "stdout" as const,
          text: "fifth",
          textNoAnsi: "fifth",
        },
        scriptMetadata: {
          workspace: makeTestWorkspace({
            name: "fifth",
            matchPattern: "packages/**/*",
            path: "packages/fifth",
            scripts: ["test-delay"],
          }),
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
            workspace: makeTestWorkspace({
              name: "fifth",
              matchPattern: "packages/**/*",
              path: "packages/fifth",
              scripts: ["test-delay"],
            }),
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
            workspace: makeTestWorkspace({
              name: "first",
              matchPattern: "packages/**/*",
              path: "packages/first",
              scripts: ["test-delay"],
            }),
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
            workspace: makeTestWorkspace({
              name: "fourth",
              matchPattern: "packages/**/*",
              path: "packages/fourth",
              scripts: ["test-delay"],
            }),
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
            workspace: makeTestWorkspace({
              name: "second",
              matchPattern: "packages/**/*",
              path: "packages/second",
              scripts: ["test-delay"],
            }),
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
            workspace: makeTestWorkspace({
              name: "third",
              matchPattern: "packages/**/*",
              path: "packages/third",
              scripts: ["test-delay"],
            }),
          },
        },
      ],
    });
  });

  test.each([1, 2, 3, "default", "auto", "unbounded", "100%", "50%"])(
    "parallel with max (%p)",
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
});
