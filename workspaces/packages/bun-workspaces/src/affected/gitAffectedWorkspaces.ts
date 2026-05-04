import {
  type FileAffectedWorkspacesOptions,
  type FileAffectedWorkspacesResult,
} from "./fileAffectedWorkspaces";
import {
  type GetGitAffectedFilesOptions,
  type GitAffectedFile,
} from "./gitAffectedFiles";

export interface GitAffectedWorkspacesOptions {
  rootDirectory: string;
  workspacesOptions: Omit<FileAffectedWorkspacesOptions, "rootDirectory">;
  gitOptions: GetGitAffectedFilesOptions;
}

export interface GitFileMetadata {
  git: GitAffectedFile;
}

export type GitAffectedWorkspaceResult =
  FileAffectedWorkspacesResult<GitFileMetadata>;

export interface GitAffectedWorkspacesResult {
  affectedWorkspaces: GitAffectedWorkspaceResult[];
}
