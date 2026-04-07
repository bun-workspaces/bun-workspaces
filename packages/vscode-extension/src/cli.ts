import childProcess from "child_process";
import type { Workspace } from "bun-workspaces";
import * as vscode from "vscode";
import { resolveBunPath } from "./bunPath";
import { BW_VERSION } from "./bwVersion";

export type { Workspace };

type SpawnResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

const spawnBw = (args: string[], cwd: string): Promise<SpawnResult> =>
  new Promise((resolve) => {
    const bunPath = resolveBunPath();
    const proc = childProcess.spawn(
      bunPath,
      ["x", "bun-workspaces@" + BW_VERSION, ...args],
      {
        cwd,
      },
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });

const getProjectRoot = (): string | undefined =>
  vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

export const listWorkspaces = async (): Promise<Workspace[]> => {
  const cwd = getProjectRoot();
  if (!cwd) {
    return [];
  }

  const { stdout, exitCode } = await spawnBw(["ls", "--json"], cwd);
  if (exitCode !== 0) {
    return [];
  }

  return JSON.parse(stdout) as Workspace[];
};
