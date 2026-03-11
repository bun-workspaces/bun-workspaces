import { Terminal } from "@xterm/headless";
import { describe, expect, test } from "bun:test";
import { createAsyncIterableQueue } from "../../../../src/internal/core";
import type { TestProjectName } from "../../../fixtures/testProjects";
import { createCliSubprocess } from "../../../util/cliTestUtils";

const getTerminalContent = (terminal: Terminal): string => {
  const lines: string[] = [];
  for (let i = 0; i < terminal.rows; i++) {
    const line = terminal.buffer.active.getLine(i);
    lines.push(line?.translateToString(true) ?? "");
  }
  return lines.join("\n");
};

type SnapshotTestOptions = {
  runScriptArgv: string[];
  expectedSnapshots: string[];
  expectFinalSnapshotAtExit?: boolean;
  testProject: TestProjectName;
  rows: number;
  cols: number;
};

const runSnapshotTest = async ({
  runScriptArgv,
  expectedSnapshots,
  expectFinalSnapshotAtExit,
  testProject,
  rows,
  cols,
}: SnapshotTestOptions) => {
  const xTerm = new Terminal({
    allowProposedApi: true,
    cols,
    rows,
  });

  const dataQueue = createAsyncIterableQueue<Uint8Array<ArrayBufferLike>>();

  createCliSubprocess({
    argv: ["run", "--output-style=grouped", ...runScriptArgv],
    testProject,
    terminal: {
      cols,
      rows,
      data(_terminal, data) {
        dataQueue.push(data);
      },
      exit() {
        dataQueue.close();
      },
    },
  });

  let snapshotIndex = 0;
  for await (const chunk of dataQueue) {
    await new Promise((resolve) => xTerm.write(chunk, () => resolve(true)));
    const content = getTerminalContent(xTerm);
    if (content.trim() === expectedSnapshots[snapshotIndex]?.trim()) {
      snapshotIndex++;
    }
  }

  expect(
    snapshotIndex,
    `The following snapshot was never matched:\n${expectedSnapshots[snapshotIndex]}`,
  ).toBe(expectedSnapshots.length);

  if (expectFinalSnapshotAtExit) {
    expect(
      getTerminalContent(xTerm).trim(),
      "Final snapshot does not match the terminal content at exit",
    ).toBe(expectedSnapshots[expectedSnapshots.length - 1].trim());
  }
};

describe("grouped output", () => {
  test(
    "simple script",
    async () => {
      await runSnapshotTest({
        runScriptArgv: ["a-workspaces"],
        testProject: "simple1",
        expectedSnapshots: [
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: application-1a                                                                        │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: library-1a                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: application-1a                                                                        │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
script for a workspaces
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: library-1a                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: application-1a                                                                        │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
script for a workspaces
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: library-1a                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
script for a workspaces
✅ application-1a: a-workspaces
✅ library-1a: a-workspaces
2 scripts ran successfully`,
        ],
        expectFinalSnapshotAtExit: true,
        rows: 50,
        cols: 100,
      });
    },
    {
      retry: 5,
    },
  );
});
