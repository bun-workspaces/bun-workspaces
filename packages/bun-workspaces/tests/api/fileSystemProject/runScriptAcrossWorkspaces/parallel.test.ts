import { availableParallelism } from "os";
import { expect, test, describe } from "bun:test";
import { getUserEnvVar } from "../../../../src/config/userEnvVars";
import { createFileSystemProject } from "../../../../src/project";
import { getProjectRoot } from "../../../fixtures/testProjects";
import { makeTestWorkspace } from "../../../util/testData";
import { makeScriptResult, makeSummaryResult } from "./util";

describe("FileSystemProject runScriptAcrossWorkspaces", () => {
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
