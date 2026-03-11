import { Terminal } from "@xterm/headless";
import { describe, expect, test } from "bun:test";
import { createAsyncIterableQueue } from "../../../../src/internal/core";
import { createProcessOutput } from "../../../../src/runScript/output/processOutput";
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
  expectLastSnapshotAtEnd?: boolean;
  testProject: TestProjectName;
  rows: number;
  cols: number;
};

const runSnapshotTest = async ({
  runScriptArgv,
  expectedSnapshots,
  expectLastSnapshotAtEnd,
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
    if (content.trim() === expectedSnapshots[snapshotIndex].trim()) {
      snapshotIndex++;
    }
    if (snapshotIndex === expectedSnapshots.length) {
      break;
    }
  }

  if (expectLastSnapshotAtEnd) {
    expect(getTerminalContent(xTerm).trim()).toBe(
      expectedSnapshots[expectedSnapshots.length - 1].trim(),
    );
  }

  expect(snapshotIndex).toBe(expectedSnapshots.length);
};

describe("grouped output", () => {
  test("should render grouped output", async () => {
    await runSnapshotTest({
      runScriptArgv: ["a-workspaces"],
      testProject: "simple1",
      expectedSnapshots: [
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
      expectLastSnapshotAtEnd: true,
      rows: 50,
      cols: 100,
    });
  });
});
