import { expect, test, describe } from "bun:test";
import { createFileSystemProject } from "../../../../src/project";
import { getProjectRoot } from "../../../fixtures/testProjects";
import { makeTestWorkspace } from "../../../util/testData";
import { makeSummaryResult, makeScriptResult } from "./util";

describe("FileSystemProject runScriptAcrossWorkspaces - basic", () => {
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

  test("ignore output", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["library-b"],
      script: "b-workspaces",
      ignoreOutput: true,
    });
    let chunkCount = 0;
    for await (const _chunk of output.text()) {
      chunkCount++;
    }
    expect(chunkCount).toBe(0);

    const summaryResult = await summary;
    expect(summaryResult).toEqual(
      makeSummaryResult({
        totalCount: 1,
        successCount: 1,
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
});
