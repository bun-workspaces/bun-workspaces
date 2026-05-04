export interface GetGitAffectedFilesOptions {
  workingDirectory: string; // a dir within the target repo
  baseRef: string;
  headRef: string;
}

export interface GetGitAffectedFilesResult {
  /** Absolute changed file paths */
  filePaths: string[];
}
