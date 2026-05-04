import {
  getFileAffectedWorkspaces,
  type AffectedWorkspaceResult,
  type FileAffectedWorkspacesOptions,
} from "./fileAffectedWorkspaces";
import {
  getGitAffectedFiles,
  type GetGitAffectedFilesOptions,
  type GitAffectedFile,
} from "./gitAffectedFiles";

export interface GitAffectedWorkspacesOptions {
  /** Project root, used for both git resolution and workspace path normalization. */
  rootDirectory: string;
  workspacesOptions: Omit<
    FileAffectedWorkspacesOptions,
    "rootDirectory" | "changedFilePaths"
  >;
  gitOptions: Omit<GetGitAffectedFilesOptions, "rootDirectory">;
}

export interface GitFileMetadata {
  git: GitAffectedFile;
}

export type GitAffectedWorkspaceResult =
  AffectedWorkspaceResult<GitFileMetadata>;

export interface GitAffectedWorkspacesResult {
  affectedWorkspaces: GitAffectedWorkspaceResult[];
}

export const getGitAffectedWorkspaces = async ({
  rootDirectory,
  workspacesOptions,
  gitOptions,
}: GitAffectedWorkspacesOptions): Promise<GitAffectedWorkspacesResult> => {
  const { files: gitFiles } = await getGitAffectedFiles({
    rootDirectory,
    ...gitOptions,
  });

  const gitFileByPath = new Map<string, GitAffectedFile>(
    gitFiles.map((file) => [file.projectFilePath, file]),
  );

  const { affectedWorkspaces } = await getFileAffectedWorkspaces({
    rootDirectory,
    ...workspacesOptions,
    changedFilePaths: gitFiles.map((file) => file.projectFilePath),
  });

  const annotatedWorkspaces: GitAffectedWorkspaceResult[] =
    affectedWorkspaces.map((result) => ({
      ...result,
      affectedReasons: {
        ...result.affectedReasons,
        changedFiles: result.affectedReasons.changedFiles.map(
          (changedFile) => ({
            ...changedFile,
            fileMetadata: { git: gitFileByPath.get(changedFile.filePath)! },
          }),
        ),
      },
    }));

  return { affectedWorkspaces: annotatedWorkspaces };
};
