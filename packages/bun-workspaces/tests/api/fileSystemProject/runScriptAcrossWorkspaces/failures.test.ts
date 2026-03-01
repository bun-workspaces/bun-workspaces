import { expect, test, describe } from "bun:test";
import { createFileSystemProject } from "../../../../src/project";
import { getProjectRoot } from "../../../fixtures/testProjects";
import { makeTestWorkspace } from "../../../util/testData";
import { makeScriptResult, makeSummaryResult } from "./util";

describe("FileSystemProject runScriptAcrossWorkspaces - failures", () => {
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
});
