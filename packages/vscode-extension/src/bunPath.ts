import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const BUN_PROBE_PATHS = [
  path.join(os.homedir(), ".bun", "bin", "bun"),
  "/usr/local/bin/bun",
  "/usr/bin/bun",
];

const probeBunPath = (): string | undefined =>
  BUN_PROBE_PATHS.find((p) => fs.existsSync(p));

export const resolveBunPath = (): string => {
  const configured = vscode.workspace
    .getConfiguration("bunWorkspaces")
    .get<string>("bunPath")
    ?.trim();

  if (configured) {
    return configured;
  }

  return probeBunPath() ?? "bun";
};
