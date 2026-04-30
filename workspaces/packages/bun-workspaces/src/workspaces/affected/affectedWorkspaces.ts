import type { Workspace } from "../workspace";

export interface AffectedWorkspaceInput {
  workspace: Workspace;
  /** File paths, directories, or glob patterns relative to the workspace's path */
  inputPatterns: string[];
}
export interface AffectedFileResult {
  /** The path to the file in the workspace */
  filePath: string;
  /** The matched input path of the file */
  inputPattern: string;
}

export interface AffectedDependencyResult {
  dependencyName: string;
  /** The chain of dependencies that led to the affected file */
  chain: string[];
}

export interface AffectedReasonMap {
  changedFiles: AffectedFileResult[];
  dependencies: AffectedDependencyResult[];
}

export interface AffectedWorkspaceResult {
  workspace: Workspace;
  isAffected: boolean;
  affectedReasons: AffectedReasonMap;
}

export interface GetAffectedWorkspacesOptions {
  /** For resolving relative workspace paths */
  rootDirectory: string;
  /** The workspaces and their given inputs */
  workspaceInputs: AffectedWorkspaceInput[];
  /** The paths of all files that are considered changed */
  changedFilePaths: string[];
  /** Whether to ignore dependencies when determining affected workspaces */
  ignoreDependencies?: boolean;
}

export interface GetAffectedWorkspacesResult {
  affectedWorkspaces: AffectedWorkspaceResult[];
}

export const getAffectedWorkspaces = async ({
  workspaceInputs,
  changedFilePaths,
}: GetAffectedWorkspacesOptions) => {};
