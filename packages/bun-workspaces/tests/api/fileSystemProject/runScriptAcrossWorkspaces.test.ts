import { availableParallelism } from "os";
import { expect, test, describe } from "bun:test";
import { getUserEnvVar } from "../../../src/config/userEnvVars";
import {
  createFileSystemProject,
  type RunScriptAcrossWorkspacesSummary,
  type RunWorkspaceScriptMetadata,
} from "../../../src/project";
import type { RunScriptExit } from "../../../src/runScript";
import { getProjectRoot } from "../../fixtures/testProjects";
import { makeTestWorkspace } from "../../util/testData";
import { withWindowsPath } from "../../util/windows";

const makeSummaryResult = (
  overrides: Partial<RunScriptAcrossWorkspacesSummary>,
): RunScriptAcrossWorkspacesSummary => ({
  totalCount: 1,
  successCount: 1,
  failureCount: 0,
  allSuccess: true,
  startTimeISO: expect.any(String),
  endTimeISO: expect.any(String),
  durationMs: expect.any(Number),
  scriptResults: [],
  ...overrides,
});

const makeScriptResult = (
  overrides: Partial<RunScriptExit<RunWorkspaceScriptMetadata>>,
): RunScriptExit<RunWorkspaceScriptMetadata> => ({
  exitCode: 0,
  success: true,
  startTimeISO: expect.any(String),
  endTimeISO: expect.any(String),
  durationMs: expect.any(Number),
  signal: null,
  metadata: {
    workspace: makeTestWorkspace({
      name: "test",
      path: "test",
      matchPattern: "test",
      scripts: ["test"],
    }),
  },
  ...overrides,
});

describe("FileSystemProject runScriptAcrossWorkspaces", () => {
  test("simple success", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["library-b"],
      script: "b-workspaces",
    });

    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toMatch("script for b workspaces");
      expect(metadata.workspace).toEqual(
        makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
      );
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual(
      makeSummaryResult({
        scriptResults: [
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "library-b",
                path: "libraries/libraryB",
                matchPattern: "libraries/**/*",
                scripts: ["all-workspaces", "b-workspaces", "library-b"],
              }),
            },
          }),
        ],
      }),
    );
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
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(expectedOutput[i].outputChunk.text);
      i++;
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 4,
        successCount: 4,
        scriptResults: [
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "application-1a",
                matchPattern: "applications/*",
                path: "applications/applicationA",
                scripts: ["a-workspaces", "all-workspaces", "application-a"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "application-1b",
                matchPattern: "applications/*",
                path: "applications/applicationB",
                scripts: ["all-workspaces", "application-b", "b-workspaces"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "library-1a",
                matchPattern: "libraries/*",
                path: "libraries/libraryA",
                scripts: ["a-workspaces", "all-workspaces", "library-a"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "library-1b",
                matchPattern: "libraries/*",
                path: "libraries/libraryB",
                scripts: ["all-workspaces", "b-workspaces", "library-b"],
              }),
            },
          }),
        ],
      }),
    );
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
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      expect(chunk.trim()).toBe(expectedOutput[i].outputChunk.text);
      i++;
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 2,
        successCount: 2,
        scriptResults: [
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "application-1b",
                matchPattern: "applications/*",
                path: "applications/applicationB",
                scripts: ["all-workspaces", "application-b", "b-workspaces"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "library-1b",
                matchPattern: "libraries/*",
                path: "libraries/libraryB",
                scripts: ["all-workspaces", "b-workspaces", "library-b"],
              }),
            },
          }),
        ],
      }),
    );
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
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      expect(chunk.trim()).toBe(expectedOutput[i].outputChunk.text);
      i++;
    }

    const summaryResult = await summary;

    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 4,
        successCount: 4,
        scriptResults: [
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "application-1a",
                matchPattern: "applications/*",
                path: "applications/applicationA",
                scripts: ["a-workspaces", "all-workspaces", "application-a"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "application-1b",
                matchPattern: "applications/*",
                path: "applications/applicationB",
                scripts: ["all-workspaces", "application-b", "b-workspaces"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "library-1a",
                matchPattern: "libraries/*",
                path: "libraries/libraryA",
                scripts: ["a-workspaces", "all-workspaces", "library-a"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "library-1b",
                matchPattern: "libraries/*",
                path: "libraries/libraryB",
                scripts: ["all-workspaces", "b-workspaces", "library-b"],
              }),
            },
          }),
        ],
      }),
    );
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
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      expect(chunk.trim()).toBe(expectedOutput[i].outputChunk.text);
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
    for await (const { metadata, chunk } of plainResult.output.text()) {
      const appLetter = i === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo`,
      );
      i++;
    }

    const argsResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script: "test-echo",
      args: "--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    });

    let j = 0;
    for await (const { metadata, chunk } of argsResult.output.text()) {
      const appLetter = j === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-${appLetter} --arg4=${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} --arg5=${withWindowsPath(`applications/application-${appLetter}`)} --arg6=test-echo`,
      );
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
    for await (const {
      metadata,
      chunk,
    } of anonymousScriptResult.output.text()) {
      const appLetter = k === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)}`,
      );
      k++;
    }

    const namedScriptResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script:
        "echo <projectPath> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: { scriptName: "my-named-script" },
    });

    let l = 0;
    for await (const { metadata, chunk } of namedScriptResult.output.text()) {
      const appLetter = l === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} my-named-script`,
      );
      l++;
    }
  });

  test("with failures - deprecated output", async () => {
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

    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 4,
        successCount: 2,
        failureCount: 2,
        allSuccess: false,
        scriptResults: [
          makeScriptResult({
            exitCode: 1,
            success: false,
            metadata: {
              workspace: makeTestWorkspace({
                name: "fail1",
                matchPattern: "packages/**/*",
                path: "packages/fail1",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            exitCode: 2,
            success: false,
            metadata: {
              workspace: makeTestWorkspace({
                name: "fail2",
                matchPattern: "packages/**/*",
                path: "packages/fail2",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "success1",
                matchPattern: "packages/**/*",
                path: "packages/success1",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "success2",
                matchPattern: "packages/**/*",
                path: "packages/success2",
                scripts: ["test-exit"],
              }),
            },
          }),
        ],
      }),
    );
  });

  test("with failures - process output (bytes)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithFailures"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["*"],
      script: "test-exit",
    });

    const expectedOutput = [
      { streamName: "stderr" as const, text: "fail1" },
      { streamName: "stderr" as const, text: "fail2" },
      { streamName: "stdout" as const, text: "success1" },
      { streamName: "stdout" as const, text: "success2" },
    ];

    let i = 0;
    for await (const { metadata, chunk } of output.bytes()) {
      expect(metadata.streamName).toBe(expectedOutput[i].streamName);
      expect(new TextDecoder().decode(chunk).trim()).toBe(
        expectedOutput[i].text,
      );
      i++;
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 4,
        successCount: 2,
        failureCount: 2,
        allSuccess: false,
        scriptResults: [
          makeScriptResult({
            exitCode: 1,
            success: false,
            metadata: {
              workspace: makeTestWorkspace({
                name: "fail1",
                matchPattern: "packages/**/*",
                path: "packages/fail1",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            exitCode: 2,
            success: false,
            metadata: {
              workspace: makeTestWorkspace({
                name: "fail2",
                matchPattern: "packages/**/*",
                path: "packages/fail2",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "success1",
                matchPattern: "packages/**/*",
                path: "packages/success1",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "success2",
                matchPattern: "packages/**/*",
                path: "packages/success2",
                scripts: ["test-exit"],
              }),
            },
          }),
        ],
      }),
    );
  });

  test("with failures - process output (text)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithFailures"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["*"],
      script: "test-exit",
    });

    const expectedOutput = [
      { streamName: "stderr" as const, text: "fail1" },
      { streamName: "stderr" as const, text: "fail2" },
      { streamName: "stdout" as const, text: "success1" },
      { streamName: "stdout" as const, text: "success2" },
    ];

    let i = 0;
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe(expectedOutput[i].streamName);
      expect(chunk.trim()).toBe(expectedOutput[i].text);
      i++;
    }

    const summaryResult = await summary;
    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 4,
        successCount: 2,
        failureCount: 2,
        allSuccess: false,
        scriptResults: [
          makeScriptResult({
            exitCode: 1,
            success: false,
            metadata: {
              workspace: makeTestWorkspace({
                name: "fail1",
                matchPattern: "packages/**/*",
                path: "packages/fail1",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            exitCode: 2,
            success: false,
            metadata: {
              workspace: makeTestWorkspace({
                name: "fail2",
                matchPattern: "packages/**/*",
                path: "packages/fail2",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "success1",
                matchPattern: "packages/**/*",
                path: "packages/success1",
                scripts: ["test-exit"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "success2",
                matchPattern: "packages/**/*",
                path: "packages/success2",
                scripts: ["test-exit"],
              }),
            },
          }),
        ],
      }),
    );
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
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe(
        expectedOutput[i].outputChunk.streamName,
      );
      expect(chunk.trim()).toBe(expectedOutput[i].outputChunk.text);
      i++;
    }

    const summaryResult = await summary;

    expect(summaryResult.durationMs).toBeGreaterThan(1000);
    expect(summaryResult.durationMs).toBeLessThan(2000);

    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 5,
        successCount: 5,
        scriptResults: [
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "fifth",
                matchPattern: "packages/**/*",
                path: "packages/fifth",
                scripts: ["test-delay"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "first",
                matchPattern: "packages/**/*",
                path: "packages/first",
                scripts: ["test-delay"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "fourth",
                matchPattern: "packages/**/*",
                path: "packages/fourth",
                scripts: ["test-delay"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "second",
                matchPattern: "packages/**/*",
                path: "packages/second",
                scripts: ["test-delay"],
              }),
            },
          }),
          makeScriptResult({
            metadata: {
              workspace: makeTestWorkspace({
                name: "third",
                matchPattern: "packages/**/*",
                path: "packages/third",
                scripts: ["test-delay"],
              }),
            },
          }),
        ],
      }),
    );
  });

  describe("dependencyOrder", () => {
    const makeSimpleDepWorkspace = (
      overrides: Parameters<typeof makeTestWorkspace>[0],
    ) =>
      makeTestWorkspace({
        matchPattern: "packages/*",
        scripts: ["test-script"],
        ...overrides,
      });

    test("runs in alphabetical order without dependencyOrder", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesSimple"),
      });

      const { output, summary } = project.runScriptAcrossWorkspaces({
        script: "test-script",
      });

      const outputLetters: string[] = [];
      for await (const { chunk } of output.text()) {
        outputLetters.push(chunk.trim());
      }

      expect(outputLetters).toEqual(["A", "B", "C", "D", "E"]);

      const summaryResult = await summary;
      expect(summaryResult).toEqual(
        makeSummaryResult({
          totalCount: 5,
          successCount: 5,
          scriptResults: [
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "a-depends-e",
                  path: "packages/a-depends-e",
                  dependencies: ["e"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "b-depends-cd",
                  path: "packages/b-depends-cd",
                  dependencies: ["c-depends-e", "d-depends-e"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "c-depends-e",
                  path: "packages/c-depends-e",
                  dependencies: ["e"],
                  dependents: ["b-depends-cd"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "d-depends-e",
                  path: "packages/d-depends-e",
                  dependencies: ["e"],
                  dependents: ["b-depends-cd"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "e",
                  path: "packages/e",
                  dependents: ["a-depends-e", "c-depends-e", "d-depends-e"],
                }),
              },
            }),
          ],
        }),
      );
    });

    test("runs in dependency graph order with dependencyOrder: true", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesSimple"),
      });

      const { output, summary } = project.runScriptAcrossWorkspaces({
        script: "test-script",
        dependencyOrder: true,
      });

      // e has no deps so it runs first; then a/c/d unblock (in index order);
      // then b unblocks once both c and d are done
      const outputLetters: string[] = [];
      for await (const { chunk } of output.text()) {
        outputLetters.push(chunk.trim());
      }

      expect(outputLetters).toEqual(["E", "A", "C", "D", "B"]);

      // summary scriptResults are always in workspace index (alphabetical) order
      const summaryResult = await summary;
      expect(summaryResult).toEqual(
        makeSummaryResult({
          totalCount: 5,
          successCount: 5,
          scriptResults: [
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "a-depends-e",
                  path: "packages/a-depends-e",
                  dependencies: ["e"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "b-depends-cd",
                  path: "packages/b-depends-cd",
                  dependencies: ["c-depends-e", "d-depends-e"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "c-depends-e",
                  path: "packages/c-depends-e",
                  dependencies: ["e"],
                  dependents: ["b-depends-cd"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "d-depends-e",
                  path: "packages/d-depends-e",
                  dependencies: ["e"],
                  dependents: ["b-depends-cd"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "e",
                  path: "packages/e",
                  dependents: ["a-depends-e", "c-depends-e", "d-depends-e"],
                }),
              },
            }),
          ],
        }),
      );
    });

    test("runs dependency batches in parallel when parallel is enabled", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesSimpleWithDelays"),
      });

      const { summary } = project.runScriptAcrossWorkspaces({
        script: "test-script",
        dependencyOrder: true,
        parallel: true,
      });

      const { scriptResults } = await summary;

      const byName = new Map(
        scriptResults.map((r) => [r.metadata.workspace.name, r] as const),
      );
      const toMs = (iso: string) => new Date(iso).getTime();

      const e = byName.get("e")!;
      const a = byName.get("a-depends-e")!;
      const c = byName.get("c-depends-e")!;
      const d = byName.get("d-depends-e")!;
      const b = byName.get("b-depends-cd")!;

      // batch 1 → batch 2: e must finish before a, c, d can start
      expect(toMs(e.endTimeISO)).toBeLessThanOrEqual(toMs(a.startTimeISO));
      expect(toMs(e.endTimeISO)).toBeLessThanOrEqual(toMs(c.startTimeISO));
      expect(toMs(e.endTimeISO)).toBeLessThanOrEqual(toMs(d.startTimeISO));

      // batch 2 → batch 3: c and d must finish before b can start
      expect(toMs(c.endTimeISO)).toBeLessThanOrEqual(toMs(b.startTimeISO));
      expect(toMs(d.endTimeISO)).toBeLessThanOrEqual(toMs(b.startTimeISO));

      // c and d ran concurrently (their ranges overlap)
      expect(toMs(c.startTimeISO)).toBeLessThan(toMs(d.endTimeISO));
      expect(toMs(d.startTimeISO)).toBeLessThan(toMs(c.endTimeISO));
    });

    test("detects a direct dependency cycle and runs remaining graph in order", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesDirectCycle"),
      });

      const { output, summary } = project.runScriptAcrossWorkspaces({
        script: "test-script",
        dependencyOrder: true,
      });

      // a-depends-c ↔ c-depends-a forms a cycle; all edges between cycle nodes are stripped.
      // c and a both become dep-free; b still depends on c → order: A, C, B
      const outputLetters: string[] = [];
      for await (const { chunk } of output.text()) {
        outputLetters.push(chunk.trim());
      }

      expect(outputLetters).toEqual(["A", "C", "B"]);

      const summaryResult = await summary;
      expect(summaryResult).toEqual(
        makeSummaryResult({
          totalCount: 3,
          successCount: 3,
          scriptResults: [
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "a-depends-c",
                  path: "packages/a-depends-c",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependencies: [],
                  dependents: [],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "b-depends-c",
                  path: "packages/b-depends-c",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependencies: ["c-depends-a"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "c-depends-a",
                  path: "packages/c-depends-a",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependencies: [],
                  dependents: ["b-depends-c"],
                }),
              },
            }),
          ],
        }),
      );
    });

    test("detects an indirect dependency cycle and runs remaining graph in order", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesIndirectCycle"),
      });

      const { output, summary } = project.runScriptAcrossWorkspaces({
        script: "test-script",
        dependencyOrder: true,
      });

      // a→b→c→a forms a cycle; all three nodes are cycle participants so all
      // edges between them are stripped — each runs dep-free in alphabetical order
      const outputLetters: string[] = [];
      for await (const { chunk } of output.text()) {
        outputLetters.push(chunk.trim());
      }

      expect(outputLetters).toEqual(["A", "B", "C"]);

      const summaryResult = await summary;
      expect(summaryResult).toEqual(
        makeSummaryResult({
          totalCount: 3,
          successCount: 3,
          scriptResults: [
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "a-depends-b",
                  path: "packages/a-depends-b",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "b-depends-c",
                  path: "packages/b-depends-c",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "c-depends-a",
                  path: "packages/c-depends-a",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                }),
              },
            }),
          ],
        }),
      );
    });

    test("detects an indirect cycle among a mixed graph and runs non-cycle workspaces in dependency order", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesIndirectCycleMixed"),
      });

      const { output, summary } = project.runScriptAcrossWorkspaces({
        script: "test-script",
        dependencyOrder: true,
      });

      // a→b→c→a cycle: all three nodes stripped of mutual edges, run dep-free alphabetically.
      // f depends on b (not a cycle node), e depends on f, d depends on e →
      // after a/b/c finish, f unblocks, then e, then d → A, B, C, F, E, D
      const outputLetters: string[] = [];
      for await (const { chunk } of output.text()) {
        outputLetters.push(chunk.trim());
      }

      expect(outputLetters).toEqual(["A", "B", "C", "F", "E", "D"]);

      const summaryResult = await summary;
      expect(summaryResult).toEqual(
        makeSummaryResult({
          totalCount: 6,
          successCount: 6,
          scriptResults: [
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "a-depends-b",
                  path: "packages/a-depends-b",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "b-depends-c",
                  path: "packages/b-depends-c",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependents: ["f-depends-b"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "c-depends-a",
                  path: "packages/c-depends-a",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "d-depends-e",
                  path: "packages/d-depends-e",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependencies: ["e-depends-f"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "e-depends-f",
                  path: "packages/e-depends-f",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependencies: ["f-depends-b"],
                  dependents: ["d-depends-e"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeTestWorkspace({
                  name: "f-depends-b",
                  path: "packages/f-depends-b",
                  matchPattern: "packages/*",
                  scripts: ["test-script"],
                  dependencies: ["b-depends-c"],
                  dependents: ["e-depends-f"],
                }),
              },
            }),
          ],
        }),
      );
    });

    describe("withDependenciesWithFailures", () => {
      const makeFailuresWorkspace = (
        overrides: Parameters<typeof makeTestWorkspace>[0],
      ) =>
        makeTestWorkspace({
          matchPattern: "packages/*",
          scripts: ["test-script"],
          ...overrides,
        });

      test("skips dependents of failed workspaces by default", async () => {
        const project = createFileSystemProject({
          rootDirectory: getProjectRoot("withDependenciesWithFailures"),
        });

        const { output, summary } = project.runScriptAcrossWorkspaces({
          script: "test-script",
          dependencyOrder: true,
        });

        // e runs first; c and d unblock (both dep on e); c fails, d succeeds;
        // f has no deps so runs next and fails;
        // a (deps f) and b (deps c+d, but c failed) are both skipped
        const outputLetters: string[] = [];
        for await (const { chunk } of output.text()) {
          outputLetters.push(chunk.trim());
        }

        expect(outputLetters).toEqual(["E", "C", "D", "F"]);

        const summaryResult = await summary;
        expect(summaryResult).toEqual(
          makeSummaryResult({
            totalCount: 6,
            successCount: 2,
            failureCount: 4,
            allSuccess: false,
            scriptResults: [
              makeScriptResult({
                exitCode: -1,
                success: false,
                skipped: true,
                durationMs: 0,
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "a-depends-f",
                    path: "packages/a-depends-f",
                    dependencies: ["f-fails"],
                  }),
                },
              }),
              makeScriptResult({
                exitCode: -1,
                success: false,
                skipped: true,
                durationMs: 0,
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "b-depends-cd",
                    path: "packages/b-depends-cd",
                    dependencies: ["c-depends-e-fails", "d-depends-e"],
                  }),
                },
              }),
              makeScriptResult({
                exitCode: 1,
                success: false,
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "c-depends-e-fails",
                    path: "packages/c-depends-e-fails",
                    dependencies: ["e"],
                    dependents: ["b-depends-cd"],
                  }),
                },
              }),
              makeScriptResult({
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "d-depends-e",
                    path: "packages/d-depends-e",
                    dependencies: ["e"],
                    dependents: ["b-depends-cd"],
                  }),
                },
              }),
              makeScriptResult({
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "e",
                    path: "packages/e",
                    dependents: ["c-depends-e-fails", "d-depends-e"],
                  }),
                },
              }),
              makeScriptResult({
                exitCode: 1,
                success: false,
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "f-fails",
                    path: "packages/f-fails",
                    dependents: ["a-depends-f"],
                  }),
                },
              }),
            ],
          }),
        );
      });

      test("runs all workspaces with ignoreDependencyFailure: true", async () => {
        const project = createFileSystemProject({
          rootDirectory: getProjectRoot("withDependenciesWithFailures"),
        });

        const { output, summary } = project.runScriptAcrossWorkspaces({
          script: "test-script",
          dependencyOrder: true,
          ignoreDependencyFailure: true,
        });

        // same order as before but nothing is skipped:
        // e → c (fail) → d → b (runs despite c failing) → f (fail) → a
        const outputLetters: string[] = [];
        for await (const { chunk } of output.text()) {
          outputLetters.push(chunk.trim());
        }

        expect(outputLetters).toEqual(["E", "C", "D", "B", "F", "A"]);

        const summaryResult = await summary;
        expect(summaryResult).toEqual(
          makeSummaryResult({
            totalCount: 6,
            successCount: 4,
            failureCount: 2,
            allSuccess: false,
            scriptResults: [
              makeScriptResult({
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "a-depends-f",
                    path: "packages/a-depends-f",
                    dependencies: ["f-fails"],
                  }),
                },
              }),
              makeScriptResult({
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "b-depends-cd",
                    path: "packages/b-depends-cd",
                    dependencies: ["c-depends-e-fails", "d-depends-e"],
                  }),
                },
              }),
              makeScriptResult({
                exitCode: 1,
                success: false,
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "c-depends-e-fails",
                    path: "packages/c-depends-e-fails",
                    dependencies: ["e"],
                    dependents: ["b-depends-cd"],
                  }),
                },
              }),
              makeScriptResult({
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "d-depends-e",
                    path: "packages/d-depends-e",
                    dependencies: ["e"],
                    dependents: ["b-depends-cd"],
                  }),
                },
              }),
              makeScriptResult({
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "e",
                    path: "packages/e",
                    dependents: ["c-depends-e-fails", "d-depends-e"],
                  }),
                },
              }),
              makeScriptResult({
                exitCode: 1,
                success: false,
                metadata: {
                  workspace: makeFailuresWorkspace({
                    name: "f-fails",
                    path: "packages/f-fails",
                    dependents: ["a-depends-f"],
                  }),
                },
              }),
            ],
          }),
        );
      });
    });

    test("runs subset of workspaces in dependency graph order", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withDependenciesSimple"),
      });

      const { output, summary } = project.runScriptAcrossWorkspaces({
        workspacePatterns: ["b-depends-cd", "d-depends-e", "e"],
        script: "test-script",
        dependencyOrder: true,
      });

      // e has no deps; d unblocks after e; b unblocks after d
      // (c-depends-e is not in the subset so b's dep on it is ignored)
      const outputLetters: string[] = [];
      for await (const { chunk } of output.text()) {
        outputLetters.push(chunk.trim());
      }

      expect(outputLetters).toEqual(["E", "D", "B"]);

      const summaryResult = await summary;
      expect(summaryResult).toEqual(
        makeSummaryResult({
          totalCount: 3,
          successCount: 3,
          scriptResults: [
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "b-depends-cd",
                  path: "packages/b-depends-cd",
                  dependencies: ["c-depends-e", "d-depends-e"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "d-depends-e",
                  path: "packages/d-depends-e",
                  dependencies: ["e"],
                  dependents: ["b-depends-cd"],
                }),
              },
            }),
            makeScriptResult({
              metadata: {
                workspace: makeSimpleDepWorkspace({
                  name: "e",
                  path: "packages/e",
                  dependents: ["a-depends-e", "c-depends-e", "d-depends-e"],
                }),
              },
            }),
          ],
        }),
      );
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

      for await (const { chunk } of output.text()) {
        const maxValue = chunk.trim();
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
