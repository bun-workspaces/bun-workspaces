import {
  type TypedEvent,
  TypedEventTarget,
} from "../../../../internal/core/language/events/typedEventTarget";
import type {
  RunScriptAcrossWorkspacesProcessOutput,
  RunWorkspaceScriptMetadata,
} from "../../../../project";
import type { RunScriptExit, ScriptEventName } from "../../../../runScript";
import type { Workspace } from "../../../../workspaces";
import { generatePlainOutputLines } from "./renderPlainOutput";

class ScriptEventTarget extends TypedEventTarget<{
  [key in ScriptEventName]: TypedEvent<
    key,
    {
      workspace: Workspace;
      exitResult: RunScriptExit<RunWorkspaceScriptMetadata> | null;
    }
  >;
}> {}

export const createScriptEventTarget = () => new ScriptEventTarget();

const cursorOps = {
  up: (n: number) => `\x1b[${n}A`,
  down: (n: number) => `\x1b[${n}B`,
  toColumn: (n: number) => `\x1b[${n}G`,
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
};

type WorkspaceState = {
  lines: string[];
  status: "pending" | "running" | "skipped" | "success" | "failure";
};

export const renderGroupedOutput = async (
  workspaces: Workspace[],
  output: RunScriptAcrossWorkspacesProcessOutput,
  scriptEventTarget: ScriptEventTarget,
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
  const render = () => {
    const width = process.stdout.columns;

    const linesToWrite: string[] = [];

    // const workspaceLines = workspaces.map((workspace) => {
  };

  render();

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

  for await (const { metadata, line } of generatePlainOutputLines(output, {
    stripDisruptiveControls: true,
    prefix: false,
  })) {
    const workspaceName = metadata.workspace.name;
    workspaceState[workspaceName].lines.push(line);
    render();
  }
};
