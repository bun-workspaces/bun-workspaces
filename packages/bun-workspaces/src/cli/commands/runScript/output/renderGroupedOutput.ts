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
import { logger } from "../../../../internal/logger";
import type {
  RunScriptAcrossWorkspacesOutput,
  RunWorkspaceScriptMetadata,
} from "../../../../project";
import type {
  RunScriptExit,
  RunScriptsSummary,
  ScriptEventName,
} from "../../../../runScript";
import type { Workspace } from "../../../../workspaces";
import type { WriteOutputOptions } from "../../../createCli";
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
  running: "intenseBlue",
  skipped: "gray",
  success: "intenseGreen",
  failure: "intenseRed",
  interrupted: "intenseYellow",
  cancelled: "gray",
  killed: "intenseRed",
};

const BORDER_COLOR = "intenseCyan" satisfies keyof typeof textOps;

export const renderGroupedOutput = async (
  workspaces: Workspace[],
  output: RunScriptAcrossWorkspacesOutput,
  summary: Promise<RunScriptsSummary<RunWorkspaceScriptMetadata>>,
  scriptEventTarget: ScriptEventTarget,
  activeScriptLines: number | "all",
  outputWriters: Required<WriteOutputOptions>,
  terminalWidth: number,
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

  let isInitialized = false;
  const initializeTuiTerminal = () => {
    if (isInitialized) {
      return;
    }
    isInitialized = true;
    logger.debug("Initializing TUI state");
    outputWriters.stdout(cursorOps.hide());
    process.stdin.setRawMode?.(true);
  };

  let isReset = false;
  const resetTuiTerminal = () => {
    if (isReset) {
      return;
    }
    isReset = true;
    logger.debug("Resetting TUI state");
    outputWriters.stdout(cursorOps.show());
    process.stdin.unref?.();
    process.stdin.setRawMode?.(false);
  };

  let previousHeight = 0;
  let didFinalRender = false;
  const render = (isFinal = false) => {
    if (didFinalRender) {
      return;
    }

    if (isFinal) {
      didFinalRender = true;
    }

    const width = Math.max(2, terminalWidth || process.stdout.columns);

    const linesToWrite: Line[] = [];

    const workspaceBoxContents: Record<
      string,
      { status: string; name: string }
    > = {};

    workspaces.forEach((workspace) => {
      const state = workspaceState[workspace.name];
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

      const workspaceLine =
        textOps[BORDER_COLOR]("Workspace: ") + textOps.bold(workspace.name);
      const statusLine =
        textOps[BORDER_COLOR]("   Status: ") +
        textOps[STATUS_COLORS[state.status]](statusText);

      workspaceBoxContents[workspace.name] = {
        name: workspaceLine,
        status: statusLine,
      };
    });

    const padding = 4; // left border, spaces, right border

    const workspaceBoxWidth = Math.min(
      width,
      Math.max(
        ...Object.values(workspaceBoxContents).map((content) =>
          Math.max(
            calculateVisibleLength(content.name),
            calculateVisibleLength(content.status),
          ),
        ),
      ) + padding,
    );

    workspaces.forEach((workspace) => {
      const state = workspaceState[workspace.name];

      const { name: workspaceNameContent, status: statusTextContent } =
        workspaceBoxContents[workspace.name];

      const borderText = (text: string, top: boolean) => {
        const visibleLength = calculateVisibleLength(text);
        const truncated =
          visibleLength > width - padding
            ? truncateTerminalString(text, width - padding - 1) + "\x1b[0m…"
            : text;
        return (
          textOps[BORDER_COLOR](top ? "┌ " : "└ ") +
          truncated +
          " ".repeat(Math.max(0, workspaceBoxWidth - visibleLength - padding)) +
          textOps[BORDER_COLOR](top ? " ┐" : " ┘")
        );
      };

      linesToWrite.push({
        text: borderText(workspaceNameContent, true),
        type: "borderedContent",
      });

      linesToWrite.push({
        text: borderText(statusTextContent, false),
        type: "borderedContent",
      });

      if (
        activeScriptLines !== "all" &&
        state.lines.length > activeScriptLines &&
        !isFinal
      ) {
        const hiddenLines = state.lines.length - activeScriptLines;
        linesToWrite.push({
          text: textOps.gray(
            `(${hiddenLines} line${hiddenLines === 1 ? "" : "s"} hidden until exit)`,
          ),
          type: "scriptOutput",
        });
      }

      linesToWrite.push(
        ...state.lines.slice(isFinal ? undefined : -activeScriptLines).map(
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
      outputWriters.stdout(cursorOps.up(previousHeight));
      for (let i = 0; i < previousHeight; i++) {
        outputWriters.stdout(cursorOps.toColumn(1));
        outputWriters.stdout(lineOps.clearFull());
        outputWriters.stdout("\n");
      }
      outputWriters.stdout(cursorOps.up(previousHeight));
    }

    for (const line of linesToWrite) {
      if (isFinal && line.type === "scriptOutput") {
        outputWriters.stdout(line.text.replace(/\n?$/, "\n"));
      } else {
        const visibleLength = calculateVisibleLength(line.text);

        const truncated =
          visibleLength > width
            ? truncateTerminalString(line.text, width - 2) + "\x1b[0m…"
            : line.text;

        outputWriters.stdout(truncated.replace(/\n?$/, "\n"));
      }
    }

    previousHeight = linesToWrite.length;

    if (isFinal) {
      resetTuiTerminal();
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

  process.stdin.on("data", (data) => {
    if (data[0] === 0x03) process.kill(process.pid, "SIGINT");
    if (data[0] === 0x1c) process.kill(process.pid, "SIGQUIT");
  });

  runOnExit((reason) => {
    try {
      if (typeof reason === "string" && reason.startsWith("SIG")) {
        outputWriters.stdout("\r" + lineOps.clearFull());
      }

      Object.keys(workspaceState).forEach((workspaceName) => {
        handleExitResult({
          metadata: { workspace: { name: workspaceName } as Workspace },
          skipped: false,
          success: false,
          exitCode:
            typeof process.exitCode === "number" ? process.exitCode : -1,
          signal:
            typeof reason === "string" ? (reason as NodeJS.Signals) : null,
        } as RunScriptExit<RunWorkspaceScriptMetadata>);
      });
      render(true);
    } finally {
      resetTuiTerminal();
    }
  });

  initializeTuiTerminal();

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

  await summary.then((summary) => {
    // fallback logic to resolve race conditions with script events
    summary.scriptResults.forEach((result) => {
      handleExitResult(result);
    });
    render(true);
  });
};
