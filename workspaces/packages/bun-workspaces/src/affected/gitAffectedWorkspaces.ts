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

export type GitAffectedWorkspacesOptions = {
  /** Project root, used for both git resolution and workspace path normalization. */
  rootDirectory: string;
  workspacesOptions: Omit<
    FileAffectedWorkspacesOptions,
    "rootDirectory" | "changedFilePaths"
  >;
  gitOptions: Omit<GetGitAffectedFilesOptions, "rootDirectory">;
};

export type GitFileMetadata = {
  git: GitAffectedFile;
};

export type GitAffectedWorkspaceResult =
  AffectedWorkspaceResult<GitFileMetadata>;

export type GitAffectedWorkspacesResult = {
  affectedWorkspaces: GitAffectedWorkspaceResult[];
  /** The full SHA the `baseRef` resolves to */
  baseSha: string;
  /** The full SHA the `headRef` resolves to */
  headSha: string;
};

export const getGitAffectedWorkspaces = async ({
  rootDirectory,
  workspacesOptions,
  gitOptions,
}: GitAffectedWorkspacesOptions): Promise<GitAffectedWorkspacesResult> => {
  const {
    files: gitFiles,
    baseSha,
    headSha,
  } = await getGitAffectedFiles({
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

  return { affectedWorkspaces: annotatedWorkspaces, baseSha, headSha };
};
