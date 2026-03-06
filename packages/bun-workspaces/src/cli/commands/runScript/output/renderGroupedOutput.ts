import { runOnExit } from "../../../../internal/core";
import {
  createTypedEventFactory,
  type TypedEvent,
  TypedEventTarget,
} from "../../../../internal/core/language/events/typedEventTarget";
import {
  calculateVisibleLength,
  truncateTerminalString,
} from "../../../../internal/core/language/string/utf/visibleLength";
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
  intenseBlack: (s: string) => `\x1b[0;90m${s}\x1b[0m`,
  intenseRed: (s: string) => `\x1b[0;91m${s}\x1b[0m`,
  intenseGreen: (s: string) => `\x1b[0;92m${s}\x1b[0m`,
  intenseYellow: (s: string) => `\x1b[0;93m${s}\x1b[0m`,
  intenseBlue: (s: string) => `\x1b[0;94m${s}\x1b[0m`,
  intenseMagenta: (s: string) => `\x1b[0;95m${s}\x1b[0m`,
  intenseCyan: (s: string) => `\x1b[0;96m${s}\x1b[0m`,
  intenseWhite: (s: string) => `\x1b[0;97m${s}\x1b[0m`,
};

type Line = {
  text: string;
  type: "border" | "borderedContent" | "scriptOutput";
};

type WorkspaceState = {
  lines: Line[];
  status:
    | "pending"
    | "running"
    | "skipped"
    | "success"
    | "failure"
    | "interrupted"
    | "cancelled"
    | "killed";
  exitCode: number | null;
  signal: string | null;
};

const STATUS_COLORS: Record<WorkspaceState["status"], keyof typeof textOps> = {
  pending: "gray",
  running: "intenseCyan",
  skipped: "gray",
  success: "intenseGreen",
  failure: "intenseRed",
  interrupted: "intenseYellow",
  cancelled: "gray",
  killed: "intenseRed",
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
        exitCode: null,
        signal: null,
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

    const width = Math.max(2, process.stdout.columns);

    const linesToWrite: Line[] = [];

    workspaces.forEach((workspace) => {
      const state = workspaceState[workspace.name];

      linesToWrite.push({
        text: textOps.intenseBlue(
          "┌" + "─".repeat(Math.max(0, width - 2)) + "┐",
        ),
        type: "border",
      });

      linesToWrite.push({
        text: `${textOps.intenseBlue("│ ") + "Workspace: " + textOps.bold(workspace.name)}`,
        type: "borderedContent",
      });

      let statusText = state.status;

      const hasExitCode = state.exitCode && state.exitCode !== -1;

      const exitState =
        hasExitCode && state.signal
          ? "exitAndSignal"
          : hasExitCode
            ? "exit"
            : state.signal
              ? "signal"
              : null;

      if (exitState === "exitAndSignal") {
        statusText += ` (exit code: ${state.exitCode}, signal: ${state.signal})`;
      } else if (exitState === "exit") {
        statusText += ` (exit code: ${state.exitCode})`;
      } else if (exitState === "signal") {
        statusText += ` (signal: ${state.signal})`;
      }

      linesToWrite.push({
        text:
          textOps.intenseBlue("│") +
          "    Status: " +
          textOps[STATUS_COLORS[state.status]](statusText),
        type: "borderedContent",
      });

      linesToWrite.push({
        text: textOps.intenseBlue(
          "└" + "─".repeat(Math.max(0, width - 2)) + "┘",
        ),
        type: "border",
      });

      if (state.lines.length > scriptMaxLines && !isFinal) {
        const hiddenLines = state.lines.length - scriptMaxLines;
        linesToWrite.push({
          text: textOps.gray(
            `(${hiddenLines} line${hiddenLines === 1 ? "" : "s"} hidden until exit)`,
          ),
          type: "scriptOutput",
        });
      }

      linesToWrite.push(
        ...state.lines.slice(isFinal ? undefined : -scriptMaxLines).map(
          (line) =>
            ({
              text: line.text,
              type: "scriptOutput",
            }) as const,
        ),
      );

      return linesToWrite;
    });

    if (previousHeight > 0) {
      // clear previous frame
      process.stdout.write(cursorOps.up(previousHeight));
      for (let i = 0; i < previousHeight; i++) {
        process.stdout.write(cursorOps.toColumn(1));
        process.stdout.write(lineOps.clearFull());
        process.stdout.write("\n");
      }
      process.stdout.write(cursorOps.up(previousHeight));
    }

    for (const line of linesToWrite) {
      if (isFinal && line.type === "scriptOutput") {
        process.stdout.write(line.text.replace(/\n?$/, "\n"));
      } else {
        const visibleLength = calculateVisibleLength(line.text);

        const truncated =
          (visibleLength + (line.type === "borderedContent" ? 2 : 0) > width
            ? truncateTerminalString(line.text, width - 1) + "\x1b[0m…"
            : line.text) +
          (line.type === "borderedContent"
            ? " ".repeat(Math.max(0, width - visibleLength - 1)) +
              textOps.cyan("│")
            : "");

        process.stdout.write(truncated.replace(/\n?$/, "\n"));
      }
    }

    previousHeight = linesToWrite.length;

    if (isFinal) {
      process.stdout.write(cursorOps.show());
    }
  };

  const handleExitResult = (
    result: RunScriptExit<RunWorkspaceScriptMetadata>,
  ) => {
    const state = workspaceState[result.metadata.workspace.name];

    if (result.signal) {
      if (state.status === "running") {
        if (result.signal === "SIGINT") {
          state.status = "interrupted";
        } else {
          state.status = "killed";
          state.signal = result.signal ?? null;
        }
      } else if (state.status === "pending") {
        state.status = "cancelled";
      }
    } else {
      state.status = result.skipped
        ? "skipped"
        : result.success
          ? "success"
          : "failure";
    }

    state.exitCode = result.exitCode ?? process.exitCode ?? null;
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
    if (event.exitResult) handleExitResult(event.exitResult);
    render();
  });

  process.on("SIGWINCH", render);

  process.stdin.setRawMode(true);

  process.stdin.on("data", (data) => {
    if (data[0] === 0x03) process.kill(process.pid, "SIGINT");
    if (data[0] === 0x1c) process.kill(process.pid, "SIGQUIT");
  });

  runOnExit((reason) => {
    if (typeof reason === "string" && reason.startsWith("SIG")) {
      process.stdout.write("\r" + lineOps.clearFull());
    }

    Object.keys(workspaceState).forEach((workspaceName) => {
      handleExitResult({
        metadata: { workspace: { name: workspaceName } as Workspace },
        skipped: false,
        success: false,
        exitCode: typeof process.exitCode === "number" ? process.exitCode : -1,
        signal: typeof reason === "string" ? (reason as NodeJS.Signals) : null,
      } as RunScriptExit<RunWorkspaceScriptMetadata>);
    });

    render(true);
    process.stdout.write(cursorOps.show());
    process.stdin.setRawMode(false);
  });

  process.stdout.write(cursorOps.hide());

  render();

  for await (const { metadata, line } of generatePlainOutputLines(output, {
    stripDisruptiveControls: true,
    prefix: false,
  })) {
    const workspaceName = metadata.workspace.name;
    workspaceState[workspaceName].lines.push({
      text: line.replace(/\n$/, ""),
      type: "scriptOutput",
    });
    render();
  }

  summary.then((summary) => {
    // fallback logic to resolve race conditions with script events
    summary.scriptResults.forEach((result) => {
      handleExitResult(result);
    });
    render(true);
  });
};
