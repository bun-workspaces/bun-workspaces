import { Terminal } from "@xterm/headless";
import { describe, expect, test } from "bun:test";
import { DEFAULT_GROUPED_LINES } from "../../../../src/cli";
import {
  createAsyncIterableQueue,
  IS_WINDOWS,
} from "../../../../src/internal/core";
import type { TestProjectName } from "../../../fixtures/testProjects";
import { createCliSubprocess } from "../../../util/cliTestUtils";

const DEFAULT_RETRY = 5;

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
    argv: ["run", ...runScriptArgv],
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
    `The following snapshot was never matched:\n${expectedSnapshots[snapshotIndex]}\n\nEnding snapshot:\n${getTerminalContent(xTerm).trim()}`,
  ).toBe(expectedSnapshots.length);

  if (expectFinalSnapshotAtExit) {
    expect(
      getTerminalContent(xTerm).trim(),
      "Final snapshot does not match the terminal content at exit.",
    ).toBe(expectedSnapshots[expectedSnapshots.length - 1]?.trim());
  }
};

describe("grouped output", () => {
  if (IS_WINDOWS) {
    // TODO Bun does not support pty at the time of this comment
    return;
  }

  test(
    "series success",
    async () => {
      await runSnapshotTest({
        runScriptArgv: ["test-script", "*-succeeds"],
        testProject: "runScriptForGroupedOutput",
        expectedSnapshots: [
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script b
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script b
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script b
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script c
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script b
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script c
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script d
✅ a-succeeds: test-script
✅ b-succeeds: test-script
✅ c-succeeds: test-script
✅ d-succeeds: test-script
4 scripts ran successfully`,
        ],
        expectFinalSnapshotAtExit: true,
        rows: 50,
        cols: 100,
      });
    },
    {
      retry: DEFAULT_RETRY,
    },
  );

  test(
    "parallel success",
    async () => {
      await runSnapshotTest({
        runScriptArgv: ["test-script", "*-succeeds", "--parallel"],
        testProject: "runScriptForGroupedOutput",
        expectedSnapshots: [
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: b-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script b
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script c
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: d-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script d
✅ a-succeeds: test-script
✅ b-succeeds: test-script
✅ c-succeeds: test-script
✅ d-succeeds: test-script
4 scripts ran successfully`,
        ],
        expectFinalSnapshotAtExit: true,
        rows: 50,
        cols: 100,
      });
    },
    {
      retry: DEFAULT_RETRY,
    },
  );

  test(
    "parallel mixed failures",
    async () => {
      await runSnapshotTest({
        runScriptArgv: ["test-script", "a-*", "c-*", "--parallel"],
        testProject: "runScriptForGroupedOutput",
        expectedSnapshots: [
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-fails                                                                               │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-signals                                                                             │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-fails                                                                               │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: pending                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-fails                                                                               │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-signals                                                                             │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-fails                                                                               │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`,
          `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-fails                                                                               │
│    Status: failure (exit code: 1)                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-signals                                                                             │
│    Status: killed (exit code: 143, signal: SIGTERM)                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: a-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script a
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-fails                                                                               │
│    Status: failure (exit code: 1)                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script c
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: c-succeeds                                                                            │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
test-script c
❌ a-fails: test-script (exited with code 1)
❌ a-signals: test-script (exited with code 143)
✅ a-succeeds: test-script
❌ c-fails: test-script (exited with code 1)
✅ c-succeeds: test-script
3 of 5 scripts failed`,
        ],
        expectFinalSnapshotAtExit: false,
        rows: 50,
        cols: 100,
      });
    },
    {
      retry: DEFAULT_RETRY,
    },
  );

  describe("handle wide output", async () => {
    test(
      "100-wide output - 100 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: ["test-script", "has-100-wide-output"],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                                                                   │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
this test script has a very very very long output that is exactly one hundred characters long indeed`,
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                                                                   │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
this test script has a very very very long output that is exactly one hundred characters long indeed
✅ has-100-wide-output: test-script
1 script ran successfully`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: 50,
          cols: 100,
        });
      },
      { retry: DEFAULT_RETRY },
    );
    test(
      "100-wide output - 99 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: ["test-script", "has-100-wide-output"],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                                                                  │
│    Status: running                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
this test script has a very very very long output that is exactly one hundred characters long ind… `,
            `
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                                                                  │
│    Status: success                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
this test script has a very very very long output that is exactly one hundred characters long indee
d
✅ has-100-wide-output: test-script
1 script ran successfully`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: 50,
          cols: 99,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      "100-wide output - 50 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: ["test-script", "has-100-wide-output"],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                 │
│    Status: running                             │
└────────────────────────────────────────────────┘
this test script has a very very very long outpu… `,
            `
┌────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                 │
│    Status: success                             │
└────────────────────────────────────────────────┘
this test script has a very very very long output 
that is exactly one hundred characters long indeed
✅ has-100-wide-output: test-script
1 script ran successfully`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: 50,
          cols: 50,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      "100-wide output with emoji - 50 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: ["test-script", "has-100-wide-emoji-output"],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌────────────────────────────────────────────────┐
│ Workspace: has-100-wide-emoji-output           │
│    Status: running                             │
└────────────────────────────────────────────────┘
this test script has a ⚠️ ⚠️ ⚠️ long output that… `,
            `
┌────────────────────────────────────────────────┐
│ Workspace: has-100-wide-emoji-output           │
│    Status: success                             │
└────────────────────────────────────────────────┘
this test script has a ⚠️ ⚠️ ⚠️ long output that is e
xactly one hundred characters long indeed
✅ has-100-wide-emoji-output: test-script
1 script ran successfully`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: 50,
          cols: 50,
        });
      },
      { retry: DEFAULT_RETRY },
    );
  });

  describe("handle wide workspace name", async () => {
    test(
      "40-wide workspace name - 55 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-40-wide-workspace-name-which-is-long",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌─────────────────────────────────────────────────────┐
│ Workspace: has-40-wide-workspace-name-which-is-long │
│    Status: pending                                  │
└─────────────────────────────────────────────────────┘`,
          ],
          rows: 50,
          cols: 55,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      "40-wide workspace name - 54 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-40-wide-workspace-name-which-is-long",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌────────────────────────────────────────────────────┐
│ Workspace: has-40-wide-workspace-name-which-is-lo… │
│    Status: pending                                 │
└────────────────────────────────────────────────────┘`,
            `
┌────────────────────────────────────────────────────┐
│ Workspace: has-40-wide-workspace-name-which-is-lo… │
│    Status: success                                 │
└────────────────────────────────────────────────────┘
long workspace name
✅ has-40-wide-workspace-name-which-is-long: test-scrip
t
1 script ran successfully`,
          ],
          rows: 50,
          cols: 54,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      "40-wide workspace name - 18 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-40-wide-workspace-name-which-is-long",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌────────────────┐
│ Workspace: ha… │
│    Status: pe… │
└────────────────┘`,
          ],
          rows: 50,
          cols: 18,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      "40-wide workspace name - 12 columns",
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-40-wide-workspace-name-which-is-long",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌──────────┐
│ Workspa… │
│    Stat… │
└──────────┘`,
          ],
          rows: 50,
          cols: 12,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      "40-wide workspace name - 1 column",
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-40-wide-workspace-name-which-is-long",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌┐
…
…
└┘`,
          ],
          rows: 50,
          cols: 1,
        });
      },
      { retry: DEFAULT_RETRY },
    );
  });

  describe("handle max script output preview lines", () => {
    /** just so terminal output shows everything in the snapshot */
    const padding = 100;

    test(
      `50-line output: Default max (${DEFAULT_GROUPED_LINES})`,
      async () => {
        await runSnapshotTest({
          runScriptArgv: ["test-script", "has-50-line-output"],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                                                                    │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
(30 lines hidden until exit)
31 this test script has a very very very long output that is exactly one hundred characters long i…
32 this test script has a very very very long output that is exactly one hundred characters long i…
33 this test script has a very very very long output that is exactly one hundred characters long i…
34 this test script has a very very very long output that is exactly one hundred characters long i…
35 this test script has a very very very long output that is exactly one hundred characters long i…
36 this test script has a very very very long output that is exactly one hundred characters long i…
37 this test script has a very very very long output that is exactly one hundred characters long i…
38 this test script has a very very very long output that is exactly one hundred characters long i…
39 this test script has a very very very long output that is exactly one hundred characters long i…
40 this test script has a very very very long output that is exactly one hundred characters long i…
41 this test script has a very very very long output that is exactly one hundred characters long i…
42 this test script has a very very very long output that is exactly one hundred characters long i…
43 this test script has a very very very long output that is exactly one hundred characters long i…
44 this test script has a very very very long output that is exactly one hundred characters long i…
45 this test script has a very very very long output that is exactly one hundred characters long i…
46 this test script has a very very very long output that is exactly one hundred characters long i…
47 this test script has a very very very long output that is exactly one hundred characters long i…
48 this test script has a very very very long output that is exactly one hundred characters long i…
49 this test script has a very very very long output that is exactly one hundred characters long i…
50 this test script has a very very very long output that is exactly one hundred characters long i…
`,
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                                                                    │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
1 this test script has a very very very long output that is exactly one hundred characters long inde
ed
2 this test script has a very very very long output that is exactly one hundred characters long inde
ed
3 this test script has a very very very long output that is exactly one hundred characters long inde
ed
4 this test script has a very very very long output that is exactly one hundred characters long inde
ed
5 this test script has a very very very long output that is exactly one hundred characters long inde
ed
6 this test script has a very very very long output that is exactly one hundred characters long inde
ed
7 this test script has a very very very long output that is exactly one hundred characters long inde
ed
8 this test script has a very very very long output that is exactly one hundred characters long inde
ed
9 this test script has a very very very long output that is exactly one hundred characters long inde
ed
10 this test script has a very very very long output that is exactly one hundred characters long ind
eed
11 this test script has a very very very long output that is exactly one hundred characters long ind
eed
12 this test script has a very very very long output that is exactly one hundred characters long ind
eed
13 this test script has a very very very long output that is exactly one hundred characters long ind
eed
14 this test script has a very very very long output that is exactly one hundred characters long ind
eed
15 this test script has a very very very long output that is exactly one hundred characters long ind
eed
16 this test script has a very very very long output that is exactly one hundred characters long ind
eed
17 this test script has a very very very long output that is exactly one hundred characters long ind
eed
18 this test script has a very very very long output that is exactly one hundred characters long ind
eed
19 this test script has a very very very long output that is exactly one hundred characters long ind
eed
20 this test script has a very very very long output that is exactly one hundred characters long ind
eed
21 this test script has a very very very long output that is exactly one hundred characters long ind
eed
22 this test script has a very very very long output that is exactly one hundred characters long ind
eed
23 this test script has a very very very long output that is exactly one hundred characters long ind
eed
24 this test script has a very very very long output that is exactly one hundred characters long ind
eed
25 this test script has a very very very long output that is exactly one hundred characters long ind
eed
26 this test script has a very very very long output that is exactly one hundred characters long ind
eed
27 this test script has a very very very long output that is exactly one hundred characters long ind
eed
28 this test script has a very very very long output that is exactly one hundred characters long ind
eed
29 this test script has a very very very long output that is exactly one hundred characters long ind
eed
30 this test script has a very very very long output that is exactly one hundred characters long ind
eed
31 this test script has a very very very long output that is exactly one hundred characters long ind
eed
32 this test script has a very very very long output that is exactly one hundred characters long ind
eed
33 this test script has a very very very long output that is exactly one hundred characters long ind
eed
34 this test script has a very very very long output that is exactly one hundred characters long ind
eed
35 this test script has a very very very long output that is exactly one hundred characters long ind
eed
36 this test script has a very very very long output that is exactly one hundred characters long ind
eed
37 this test script has a very very very long output that is exactly one hundred characters long ind
eed
38 this test script has a very very very long output that is exactly one hundred characters long ind
eed
39 this test script has a very very very long output that is exactly one hundred characters long ind
eed
40 this test script has a very very very long output that is exactly one hundred characters long ind
eed
41 this test script has a very very very long output that is exactly one hundred characters long ind
eed
42 this test script has a very very very long output that is exactly one hundred characters long ind
eed
43 this test script has a very very very long output that is exactly one hundred characters long ind
eed
44 this test script has a very very very long output that is exactly one hundred characters long ind
eed
45 this test script has a very very very long output that is exactly one hundred characters long ind
eed
46 this test script has a very very very long output that is exactly one hundred characters long ind
eed
47 this test script has a very very very long output that is exactly one hundred characters long ind
eed
48 this test script has a very very very long output that is exactly one hundred characters long ind
eed
49 this test script has a very very very long output that is exactly one hundred characters long ind
eed
50 this test script has a very very very long output that is exactly one hundred characters long ind
eed
✅ has-50-line-output: test-script
1 script ran successfully
`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: DEFAULT_GROUPED_LINES + padding,
          cols: 100,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      `50-line output: 5 lines`,
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-50-line-output",
            "--grouped-lines=5",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                                                                    │
│    Status: running                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
(45 lines hidden until exit)
46 this test script has a very very very long output that is exactly one hundred characters long i…
47 this test script has a very very very long output that is exactly one hundred characters long i…
48 this test script has a very very very long output that is exactly one hundred characters long i…
49 this test script has a very very very long output that is exactly one hundred characters long i…
50 this test script has a very very very long output that is exactly one hundred characters long i…
`,
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                                                                    │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
1 this test script has a very very very long output that is exactly one hundred characters long inde
ed
2 this test script has a very very very long output that is exactly one hundred characters long inde
ed
3 this test script has a very very very long output that is exactly one hundred characters long inde
ed
4 this test script has a very very very long output that is exactly one hundred characters long inde
ed
5 this test script has a very very very long output that is exactly one hundred characters long inde
ed
6 this test script has a very very very long output that is exactly one hundred characters long inde
ed
7 this test script has a very very very long output that is exactly one hundred characters long inde
ed
8 this test script has a very very very long output that is exactly one hundred characters long inde
ed
9 this test script has a very very very long output that is exactly one hundred characters long inde
ed
10 this test script has a very very very long output that is exactly one hundred characters long ind
eed
11 this test script has a very very very long output that is exactly one hundred characters long ind
eed
12 this test script has a very very very long output that is exactly one hundred characters long ind
eed
13 this test script has a very very very long output that is exactly one hundred characters long ind
eed
14 this test script has a very very very long output that is exactly one hundred characters long ind
eed
15 this test script has a very very very long output that is exactly one hundred characters long ind
eed
16 this test script has a very very very long output that is exactly one hundred characters long ind
eed
17 this test script has a very very very long output that is exactly one hundred characters long ind
eed
18 this test script has a very very very long output that is exactly one hundred characters long ind
eed
19 this test script has a very very very long output that is exactly one hundred characters long ind
eed
20 this test script has a very very very long output that is exactly one hundred characters long ind
eed
21 this test script has a very very very long output that is exactly one hundred characters long ind
eed
22 this test script has a very very very long output that is exactly one hundred characters long ind
eed
23 this test script has a very very very long output that is exactly one hundred characters long ind
eed
24 this test script has a very very very long output that is exactly one hundred characters long ind
eed
25 this test script has a very very very long output that is exactly one hundred characters long ind
eed
26 this test script has a very very very long output that is exactly one hundred characters long ind
eed
27 this test script has a very very very long output that is exactly one hundred characters long ind
eed
28 this test script has a very very very long output that is exactly one hundred characters long ind
eed
29 this test script has a very very very long output that is exactly one hundred characters long ind
eed
30 this test script has a very very very long output that is exactly one hundred characters long ind
eed
31 this test script has a very very very long output that is exactly one hundred characters long ind
eed
32 this test script has a very very very long output that is exactly one hundred characters long ind
eed
33 this test script has a very very very long output that is exactly one hundred characters long ind
eed
34 this test script has a very very very long output that is exactly one hundred characters long ind
eed
35 this test script has a very very very long output that is exactly one hundred characters long ind
eed
36 this test script has a very very very long output that is exactly one hundred characters long ind
eed
37 this test script has a very very very long output that is exactly one hundred characters long ind
eed
38 this test script has a very very very long output that is exactly one hundred characters long ind
eed
39 this test script has a very very very long output that is exactly one hundred characters long ind
eed
40 this test script has a very very very long output that is exactly one hundred characters long ind
eed
41 this test script has a very very very long output that is exactly one hundred characters long ind
eed
42 this test script has a very very very long output that is exactly one hundred characters long ind
eed
43 this test script has a very very very long output that is exactly one hundred characters long ind
eed
44 this test script has a very very very long output that is exactly one hundred characters long ind
eed
45 this test script has a very very very long output that is exactly one hundred characters long ind
eed
46 this test script has a very very very long output that is exactly one hundred characters long ind
eed
47 this test script has a very very very long output that is exactly one hundred characters long ind
eed
48 this test script has a very very very long output that is exactly one hundred characters long ind
eed
49 this test script has a very very very long output that is exactly one hundred characters long ind
eed
50 this test script has a very very very long output that is exactly one hundred characters long ind
eed
✅ has-50-line-output: test-script
1 script ran successfully
`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: 50 + padding,
          cols: 100,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test(
      `50-line output: all lines`,
      async () => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-50-line-output",
            "--grouped-lines=all",
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                                                                    │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
1 this test script has a very very very long output that is exactly one hundred characters long in…
2 this test script has a very very very long output that is exactly one hundred characters long in…
3 this test script has a very very very long output that is exactly one hundred characters long in…
4 this test script has a very very very long output that is exactly one hundred characters long in…
5 this test script has a very very very long output that is exactly one hundred characters long in…
6 this test script has a very very very long output that is exactly one hundred characters long in…
7 this test script has a very very very long output that is exactly one hundred characters long in…
8 this test script has a very very very long output that is exactly one hundred characters long in…
9 this test script has a very very very long output that is exactly one hundred characters long in…
10 this test script has a very very very long output that is exactly one hundred characters long i…
11 this test script has a very very very long output that is exactly one hundred characters long i…
12 this test script has a very very very long output that is exactly one hundred characters long i…
13 this test script has a very very very long output that is exactly one hundred characters long i…
14 this test script has a very very very long output that is exactly one hundred characters long i…
15 this test script has a very very very long output that is exactly one hundred characters long i…
16 this test script has a very very very long output that is exactly one hundred characters long i…
17 this test script has a very very very long output that is exactly one hundred characters long i…
18 this test script has a very very very long output that is exactly one hundred characters long i…
19 this test script has a very very very long output that is exactly one hundred characters long i…
20 this test script has a very very very long output that is exactly one hundred characters long i…
21 this test script has a very very very long output that is exactly one hundred characters long i…
22 this test script has a very very very long output that is exactly one hundred characters long i…
23 this test script has a very very very long output that is exactly one hundred characters long i…
24 this test script has a very very very long output that is exactly one hundred characters long i…
25 this test script has a very very very long output that is exactly one hundred characters long i…
26 this test script has a very very very long output that is exactly one hundred characters long i…
27 this test script has a very very very long output that is exactly one hundred characters long i…
28 this test script has a very very very long output that is exactly one hundred characters long i…
29 this test script has a very very very long output that is exactly one hundred characters long i…
30 this test script has a very very very long output that is exactly one hundred characters long i…
31 this test script has a very very very long output that is exactly one hundred characters long i…
32 this test script has a very very very long output that is exactly one hundred characters long i…
33 this test script has a very very very long output that is exactly one hundred characters long i…
34 this test script has a very very very long output that is exactly one hundred characters long i…
35 this test script has a very very very long output that is exactly one hundred characters long i…
36 this test script has a very very very long output that is exactly one hundred characters long i…
37 this test script has a very very very long output that is exactly one hundred characters long i…
38 this test script has a very very very long output that is exactly one hundred characters long i…
39 this test script has a very very very long output that is exactly one hundred characters long i…
40 this test script has a very very very long output that is exactly one hundred characters long i…
41 this test script has a very very very long output that is exactly one hundred characters long i…
42 this test script has a very very very long output that is exactly one hundred characters long i…
43 this test script has a very very very long output that is exactly one hundred characters long i…
44 this test script has a very very very long output that is exactly one hundred characters long i…
45 this test script has a very very very long output that is exactly one hundred characters long i…
46 this test script has a very very very long output that is exactly one hundred characters long i…
47 this test script has a very very very long output that is exactly one hundred characters long i…
48 this test script has a very very very long output that is exactly one hundred characters long i…
49 this test script has a very very very long output that is exactly one hundred characters long i…
50 this test script has a very very very long output that is exactly one hundred characters long i…
`,
            `
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                                                                    │
│    Status: success                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
1 this test script has a very very very long output that is exactly one hundred characters long inde
ed
2 this test script has a very very very long output that is exactly one hundred characters long inde
ed
3 this test script has a very very very long output that is exactly one hundred characters long inde
ed
4 this test script has a very very very long output that is exactly one hundred characters long inde
ed
5 this test script has a very very very long output that is exactly one hundred characters long inde
ed
6 this test script has a very very very long output that is exactly one hundred characters long inde
ed
7 this test script has a very very very long output that is exactly one hundred characters long inde
ed
8 this test script has a very very very long output that is exactly one hundred characters long inde
ed
9 this test script has a very very very long output that is exactly one hundred characters long inde
ed
10 this test script has a very very very long output that is exactly one hundred characters long ind
eed
11 this test script has a very very very long output that is exactly one hundred characters long ind
eed
12 this test script has a very very very long output that is exactly one hundred characters long ind
eed
13 this test script has a very very very long output that is exactly one hundred characters long ind
eed
14 this test script has a very very very long output that is exactly one hundred characters long ind
eed
15 this test script has a very very very long output that is exactly one hundred characters long ind
eed
16 this test script has a very very very long output that is exactly one hundred characters long ind
eed
17 this test script has a very very very long output that is exactly one hundred characters long ind
eed
18 this test script has a very very very long output that is exactly one hundred characters long ind
eed
19 this test script has a very very very long output that is exactly one hundred characters long ind
eed
20 this test script has a very very very long output that is exactly one hundred characters long ind
eed
21 this test script has a very very very long output that is exactly one hundred characters long ind
eed
22 this test script has a very very very long output that is exactly one hundred characters long ind
eed
23 this test script has a very very very long output that is exactly one hundred characters long ind
eed
24 this test script has a very very very long output that is exactly one hundred characters long ind
eed
25 this test script has a very very very long output that is exactly one hundred characters long ind
eed
26 this test script has a very very very long output that is exactly one hundred characters long ind
eed
27 this test script has a very very very long output that is exactly one hundred characters long ind
eed
28 this test script has a very very very long output that is exactly one hundred characters long ind
eed
29 this test script has a very very very long output that is exactly one hundred characters long ind
eed
30 this test script has a very very very long output that is exactly one hundred characters long ind
eed
31 this test script has a very very very long output that is exactly one hundred characters long ind
eed
32 this test script has a very very very long output that is exactly one hundred characters long ind
eed
33 this test script has a very very very long output that is exactly one hundred characters long ind
eed
34 this test script has a very very very long output that is exactly one hundred characters long ind
eed
35 this test script has a very very very long output that is exactly one hundred characters long ind
eed
36 this test script has a very very very long output that is exactly one hundred characters long ind
eed
37 this test script has a very very very long output that is exactly one hundred characters long ind
eed
38 this test script has a very very very long output that is exactly one hundred characters long ind
eed
39 this test script has a very very very long output that is exactly one hundred characters long ind
eed
40 this test script has a very very very long output that is exactly one hundred characters long ind
eed
41 this test script has a very very very long output that is exactly one hundred characters long ind
eed
42 this test script has a very very very long output that is exactly one hundred characters long ind
eed
43 this test script has a very very very long output that is exactly one hundred characters long ind
eed
44 this test script has a very very very long output that is exactly one hundred characters long ind
eed
45 this test script has a very very very long output that is exactly one hundred characters long ind
eed
46 this test script has a very very very long output that is exactly one hundred characters long ind
eed
47 this test script has a very very very long output that is exactly one hundred characters long ind
eed
48 this test script has a very very very long output that is exactly one hundred characters long ind
eed
49 this test script has a very very very long output that is exactly one hundred characters long ind
eed
50 this test script has a very very very long output that is exactly one hundred characters long ind
eed
✅ has-50-line-output: test-script
1 script ran successfully
`,
          ],
          expectFinalSnapshotAtExit: true,
          rows: 50 + padding,
          cols: 100,
        });
      },
      { retry: DEFAULT_RETRY },
    );

    test.each([-1, "invalid", NaN, Infinity, -Infinity, 0])(
      "invalid number: %p",
      async (value) => {
        await runSnapshotTest({
          runScriptArgv: [
            "test-script",
            "has-50-line-output",
            `--grouped-lines=${value}`,
          ],
          testProject: "runScriptForGroupedOutput",
          expectedSnapshots: [
            `Invalid max grouped lines value: ${value}. Must be a positive number or "all".`,
          ],
          rows: 10,
          cols: 100,
        });
      },
      { retry: DEFAULT_RETRY },
    );
  });

  test(
    "Combo of output boundaries",
    async () => {
      await runSnapshotTest({
        runScriptArgv: ["test-script", "has-*"],
        testProject: "runScriptForGroupedOutput",
        expectedSnapshots: [
          `
┌────────────────────────────────────────────────┐
│ Workspace: has-100-wide-emoji-output           │
│    Status: success                             │
└────────────────────────────────────────────────┘
this test script has a ⚠️ ⚠️ ⚠️ long output that is e
xactly one hundred characters long indeed
┌────────────────────────────────────────────────┐
│ Workspace: has-100-wide-output                 │
│    Status: success                             │
└────────────────────────────────────────────────┘
this test script has a very very very long output 
that is exactly one hundred characters long indeed
┌────────────────────────────────────────────────┐
│ Workspace: has-40-wide-workspace-name-which-i… │
│    Status: success                             │
└────────────────────────────────────────────────┘
long workspace name
┌────────────────────────────────────────────────┐
│ Workspace: has-50-line-output                  │
│    Status: success                             │
└────────────────────────────────────────────────┘
1 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
2 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
3 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
4 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
5 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
6 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
7 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
8 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
9 this test script has a very very very long outpu
t that is exactly one hundred characters long inde
ed
10 this test script has a very very very long outp
ut that is exactly one hundred characters long ind`,
        ],
        expectFinalSnapshotAtExit: true,
        rows: 50,
        cols: 50,
      });
    },
    { retry: DEFAULT_RETRY },
  );
});
