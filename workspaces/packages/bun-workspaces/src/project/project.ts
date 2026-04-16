import type {
  ResolvedRootConfig,
  ResolvedWorkspaceConfig,
} from "bw-common/config";
import type { ScriptCommand, WorkspaceScriptCommandMethod } from "../runScript";
import type { Workspace } from "../workspaces";

/** Metadata about a {@link Project}'s script, including the workspaces that have it in their package.json */
export type WorkspaceScriptMetadata = {
  name: string;
  workspaces: Workspace[];
};

/** Arguments for {@link Project.createScriptCommand} */
export type CreateProjectScriptCommandOptions = {
  /** The workspace to run the script in */
  workspaceNameOrAlias: string;
  /** The name of the script to run */
  scriptName: string;
  /**
   * The method to use to run the script.
   * Either run in the workspace directory or use bun's --filter option.
   * Defaults to "cd".
   */
  method?: WorkspaceScriptCommandMethod;
  /** The arguments to append to the command */
  args?: string;
};

/** Result of {@link Project.createScriptCommand}. Includes a command string that will run a workspace's script. */
export type CreateProjectScriptCommandResult = {
  /** Data including a command string using the `bun`
   * CLI that will run a workspace's script and the
   * directory to run it in. */
  commandDetails: ScriptCommand;
  /** The name of the script to run */
  scriptName: string;
  /** The workspace that the script belongs to */
  workspace: Workspace;
};

/** The config for a project and its workspaces */
export type ProjectConfig = {
  root: ResolvedRootConfig;
  /** A map of workspace names to their resolved config */
  workspaces: Record<string, ResolvedWorkspaceConfig>;
};

/**
 * A project contains a collection of workspaces and is the core of `bun-workspaces`'s functionality.
 *
 * Typically based on a root package.json file's `"workspaces"` field and any matching nested package.json files that are found.
 */
export interface Project {
  /** The name of the project. This is typically the name of the root package.json unless otherwise provided. */
  name: string;
  /** The root directory of the project */
  rootDirectory: string;
  /** The root workspace of the project */
  rootWorkspace: Workspace;
  /** The list of all workspaces in the project */
  workspaces: Workspace[];
  /** The config for the project and its workspaces */
  config: ProjectConfig;
  /** The means by which the project was created */
  sourceType: "fileSystem" | "memory";
  /** Find a workspace by its package.json name */
  findWorkspaceByName(workspaceName: string): Workspace | null;
  /** Find a workspace by a workspace alias */
  findWorkspaceByAlias(alias: string): Workspace | null;
  /** Find a workspace that matches a workspace's name or an alias if no name matches. */
  findWorkspaceByNameOrAlias(nameOrAlias: string): Workspace | null;
  /** Find a list of workspaces that have a given tag in their configuration */
  listWorkspacesWithTag(tag: string): Workspace[];
  /** Accepts a wildcard pattern for finding a list of workspaces by their name*/
  findWorkspacesByPattern(workspacePattern: string): Workspace[];
  /** Get an array of all workspaces that have a given script in their package.json */
  listWorkspacesWithScript(scriptName: string): Workspace[];
  /** Get a mapping of all scripts to the workspaces that have them in their package.json */
  mapScriptsToWorkspaces(): Record<string, WorkspaceScriptMetadata>;
  /** Get a mapping of all tags to the workspaces that have them in their config */
  mapTagsToWorkspaces(): Record<string, Workspace[]>;
  /** Create metadata that can be used to run a workspace's script */
  createScriptCommand(
    options: CreateProjectScriptCommandOptions,
  ): CreateProjectScriptCommandResult;
}
