import { defineErrors } from "../../internal/core";

export const GIT_AFFECTED_ERRORS = defineErrors(
  "NoGitRepository",
  "GitCommandFailed",
);

export interface GetGitAffectedFilesOptions {
  /** Project root */
  rootDirectory: string;
  baseRef: string;
  headRef: string;
  /** Exclude untracked files */
  ignoreUntracked?: boolean;
  /** Ignore staged files */
  ignoreStaged?: boolean;
  /** Ignore unstaged files */
  ignoreUnstaged?: boolean;
  /** Exclude uncommitted files (ignores staged, unstaged, and untracked) */
  ignoreUncommitted?: boolean;
}

export type GitAffectedFileReason =
  | "diff"
  | "staged"
  | "unstaged"
  | "untracked";

export interface GitAffectedFile {
  /** File path relative to the project root */
  projectFilePath: string;
  /** The reason for the file being affected */
  reason: GitAffectedFileReason;
}

export interface GetGitAffectedFilesResult {
  files: GitAffectedFile[];
}
