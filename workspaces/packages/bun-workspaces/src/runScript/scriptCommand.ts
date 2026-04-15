import path from "path";
import type { Workspace } from "../workspaces";

export const WORKSPACE_SCRIPT_COMMAND_METHODS = ["cd", "filter"] as const;

export type WorkspaceScriptCommandMethod =
  (typeof WORKSPACE_SCRIPT_COMMAND_METHODS)[number];

/** Basic metadata to run a script, the command string and the directory to run it in */
export interface ScriptCommand {
  /** The command string to run */
  command: string;
  /** The directory to run the command in */
  workingDirectory: string;
}

export interface CreateWorkspaceScriptCommandOptions {
  /**
   * The method to use to run the script.
   * Either run in the workspace directory or use bun's --filter option.
   * Defaults to "cd".
   */
  method?: WorkspaceScriptCommandMethod;
  /** The name of the script to run */
  scriptName: string;
  /** The arguments to append to the command */
  args: string;
  /** The workspace that the script belongs to */
  workspace: Workspace;
  /** The root directory of the project */
  rootDirectory: string;
}

const spaceArgs = (args: string) => (args ? ` ${args.trim()}` : "");

const METHODS: Record<
  WorkspaceScriptCommandMethod,
  (options: CreateWorkspaceScriptCommandOptions) => ScriptCommand
> = {
  cd: ({ scriptName, workspace, rootDirectory, args }) => ({
    workingDirectory: path.resolve(rootDirectory, workspace.path),
    command: `bun --silent run ${scriptName}${spaceArgs(args)}`,
  }),
  filter: ({ scriptName, workspace, args, rootDirectory }) => ({
    workingDirectory: rootDirectory,
    command: `bun --silent run --filter=${JSON.stringify(
      workspace.name,
    )} ${scriptName}${spaceArgs(args)}`,
  }),
};

export const createWorkspaceScriptCommand = (
  options: CreateWorkspaceScriptCommandOptions,
) => METHODS[options.method ?? "cd"](options);
