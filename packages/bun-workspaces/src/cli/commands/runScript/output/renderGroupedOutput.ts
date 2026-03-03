import { runOnExit } from "../../../../internal/core";
import {
  createTypedEventFactory,
  type TypedEvent,
  TypedEventTarget,
} from "../../../../internal/core/language/events/typedEventTarget";
import type {
  RunScriptAcrossWorkspacesProcessOutput,
  RunWorkspaceScriptMetadata,
} from "../../../../project";
import type {
  RunScriptExit,
  RunScriptsSummary,
  ScriptEventName,
} from "../../../../runScript";
import type { Workspace } from "../../../../workspaces";
import { generatePlainOutputLines } from "./renderPlainOutput";

type ScriptEvent = TypedEvent<
  ScriptEventName,
  {
    workspace: Workspace;
    exitResult: RunScriptExit<RunWorkspaceScriptMetadata> | null;
  }
>;

class ScriptEventTarget extends TypedEventTarget<{
  [key in ScriptEvent["type"]]: ScriptEvent;
}> {}

export const createScriptEventTarget = () => new ScriptEventTarget();

export const createScriptEvent = {
  start: createTypedEventFactory<ScriptEvent>("start"),
  skip: createTypedEventFactory<ScriptEvent>("skip"),
  exit: createTypedEventFactory<ScriptEvent>("exit"),
};

const cursorOps = {
  up: (n: number) => `\x1b[${n}A`,
  down: (n: number) => `\x1b[${n}B`,
  toColumn: (n: number) => `\x1b[${n}G`,
  hide: () => `\x1b[?25l`,
  show: () => `\x1b[?25h`,
};

const lineOps = {
  clearToEnd: () => `\x1b[0K`,
  clearToStart: () => `\x1b[1K`,
  clearFull: () => `\x1b[2K`,
};

/**
 * Index in `str` (exclusive) so that the visible length of str.slice(0, index)
 * is at most `maxVisible`, skipping ANSI CSI sequences so they are not counted.
 */
const sliceIndexForVisibleWidth = (str: string, maxVisible: number): number => {
  let i = 0;
  let visibleCount = 0;
  while (i < str.length && visibleCount < maxVisible) {
    if (str[i] === "\x1b" && str[i + 1] === "[") {
      i += 2;
      while (i < str.length && /[0-9;?]/.test(str[i])) i++;
      if (i < str.length) i++;
    } else {
      visibleCount++;
      i++;
    }
  }
  return i;
};

const textOps = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  white: (s: string) => `\x1b[37m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

type WorkspaceState = {
  lines: string[];
  status: "pending" | "running" | "skipped" | "success" | "failure";
};

export const renderGroupedOutput = async (
  workspaces: Workspace[],
  output: RunScriptAcrossWorkspacesProcessOutput,
  summary: Promise<RunScriptsSummary<RunWorkspaceScriptMetadata>>,
  scriptEventTarget: ScriptEventTarget,
  scriptMaxLines = 5,
) => {
  const workspaceState: Record<string, WorkspaceState> = workspaces.reduce(
    (acc, workspace) => {
      acc[workspace.name] = {
        lines: [],
        status: "pending",
      };
      return acc;
    },
    {} as Record<string, WorkspaceState>,
  );

  let previousHeight = 0;
  let didFinalRender = false;
  const render = (isFinal = false) => {
    if (didFinalRender) {
      return;
    }

    if (isFinal) {
      didFinalRender = true;
    }

    const width = process.stdout.columns;

    const linesToWrite: string[] = [];

    workspaces.forEach((workspace) => {
      const state = workspaceState[workspace.name];
      linesToWrite.push("### " + workspace.name + " " + state.status + " ###");
      linesToWrite.push(
        ...state.lines.slice(isFinal ? undefined : -scriptMaxLines),
      );
      return linesToWrite;
    });

    // Move cursor back to the start of this block so we overwrite in place
    if (previousHeight > 0) {
      process.stdout.write(cursorOps.up(previousHeight));
    }

    const maxLineWidth = width ?? 80;
    for (const line of linesToWrite) {
      process.stdout.write(cursorOps.toColumn(1));
      process.stdout.write(lineOps.clearFull());

      const visibleLength = Bun.stripANSI(line).length;
      const truncated =
        visibleLength > maxLineWidth
          ? line.slice(0, sliceIndexForVisibleWidth(line, maxLineWidth - 2)) +
            "\x1b[0m…"
          : line;
      process.stdout.write(truncated.trimEnd() + "\n");
    }

    // Clear any lines that belonged to the previous (taller) frame
    for (let i = 0; i < previousHeight - linesToWrite.length; i++) {
      process.stdout.write(cursorOps.toColumn(1));
      process.stdout.write(lineOps.clearFull());
      process.stdout.write("\n");
    }

    previousHeight = linesToWrite.length;
  };

  scriptEventTarget.addEventListener("start", (event) => {
    const { workspace } = event;
    workspaceState[workspace.name].status = "running";
    render();
  });

  scriptEventTarget.addEventListener("skip", (event) => {
    const { workspace } = event;
    workspaceState[workspace.name].status = "skipped";
    render();
  });

  scriptEventTarget.addEventListener("exit", (event) => {
    const { workspace, exitResult } = event;
    workspaceState[workspace.name].status = exitResult?.success
      ? "success"
      : "failure";
    render();
  });

  process.on("SIGWINCH", render);

  runOnExit(() => {
    process.stdout.write(cursorOps.show());
    render(true);
  });

  process.stdout.write(cursorOps.hide());

  render();

  for await (const { metadata, line } of generatePlainOutputLines(output, {
    stripDisruptiveControls: true,
    prefix: false,
  })) {
    const workspaceName = metadata.workspace.name;
    workspaceState[workspaceName].lines.push(line);
    render();
  }

  summary.then((summary) => {
    // fallback logic to resolve race conditions with script events
    summary.scriptResults.forEach((result) => {
      const workspaceName = result.metadata.workspace.name;
      workspaceState[workspaceName].status = result.skipped
        ? "skipped"
        : result.success
          ? "success"
          : "failure";
    });
    render(true);
  });

  process.stdout.write(cursorOps.show());
};
