import type { WorkspaceInputsConfig } from "bw-common";
import {
  getFileAffectedWorkspaces,
  type AffectedDependencyChainEntry,
  type AffectedDependencyEdgeSource,
  type AffectedWorkspaceInput,
  type AffectedWorkspaceResult as InternalAffectedWorkspaceResult,
} from "../../../affected/fileAffectedWorkspaces";
import type { GitAffectedFileReason } from "../../../affected/gitAffectedFiles";
import {
  getGitAffectedWorkspaces,
  type GitFileMetadata,
} from "../../../affected/gitAffectedWorkspaces";
import type { Workspace } from "../../../workspaces";
import type { FileSystemProject } from "./fileSystemProject";

export type {
  AffectedDependencyChainEntry,
  AffectedDependencyEdgeSource,
  GitAffectedFileReason,
};

export type AffectedWorkspaceResult = {
  workspace: Workspace;
  inputs: WorkspaceInputsConfig;
  isAffected: boolean;
  affectedReasons: {
    changedFiles: {
      filePath: string;
      inputMatch: string;
      /** When `diffSource` is "git" */
      gitReasons?: GitAffectedFileReason[];
    }[];
    dependencies: {
      dependencyName: string;
      chain: AffectedDependencyChainEntry[];
    }[];
  };
};

export type AffectedDiffSource = "git" | "fileList";

export type AffectedWorkspacesResult = {
  metadata: {
    /** The source for changed files */
    diffSource: AffectedDiffSource;
    /** When `diffSource` is "git" */
    git?: {
      baseRef: string;
      headRef: string;
    };
  };
  /** The workspaces and their affected reasons */
  workspaceResults: AffectedWorkspaceResult[];
};

export type BaseAffectedWorkspacesOptions = {
  ignorePackageDependencies?: boolean;
};

export type GitAffectedWorkspacesOptions = BaseAffectedWorkspacesOptions & {
  diffSource: "git";
  diffOptions?: {
    /**
     * The base git ref to compare against.
     *
     * Default is "main" when not provided or
     * when the default is not set by the
     * root config or env var.
     */
    baseRef?: string;
    /**
     * The head git ref to compare against.
     *
     * Default is "HEAD" when not provided.
     */
    headRef?: string;
    /** Exclude untracked files */
    ignoreUntracked?: boolean;
    /** Ignore staged files */
    ignoreStaged?: boolean;
    /** Ignore unstaged files */
    ignoreUnstaged?: boolean;
    /** Exclude any uncommitted files (ignores staged, unstaged, and untracked) */
    ignoreUncommitted?: boolean;
  };
};

export type FileListAffectedWorkspacesOptions =
  BaseAffectedWorkspacesOptions & {
    diffSource: "fileList";
    /**
     * File paths, directories, or glob patterns relative to the project root.
     *
     * Prefix with `!` to exclude.
     */
    changedFiles: string[];
  };

export type GetAffectedWorkspacesOptions =
  | GitAffectedWorkspacesOptions
  | FileListAffectedWorkspacesOptions;

export const isOptionsForDiffSource = <DiffSource extends AffectedDiffSource>(
  options: GetAffectedWorkspacesOptions,
  diffSource: DiffSource,
): options is DiffSource extends "git"
  ? GitAffectedWorkspacesOptions
  : FileListAffectedWorkspacesOptions => options.diffSource === diffSource;

const DEFAULT_INPUT_FILE_PATTERN = ".";

const DEFAULT_HEAD_REF = "HEAD";

const buildWorkspaceInputs = (
  project: FileSystemProject,
): {
  inputs: AffectedWorkspaceInput[];
  resolvedInputsByName: Map<string, WorkspaceInputsConfig>;
} => {
  const resolvedInputsByName = new Map<string, WorkspaceInputsConfig>();
  const inputs = project.workspaces.map<AffectedWorkspaceInput>((workspace) => {
    const defaultInputs =
      project.config.workspaces[workspace.name]?.defaultInputs ?? {};
    resolvedInputsByName.set(workspace.name, defaultInputs);
    return {
      workspace,
      inputFilePatterns: defaultInputs.files ?? [DEFAULT_INPUT_FILE_PATTERN],
      inputWorkspacePatterns: defaultInputs.workspacePatterns ?? [],
    };
  });
  return { inputs, resolvedInputsByName };
};

const toAffectedWorkspaceResult = (
  internal: InternalAffectedWorkspaceResult<GitFileMetadata | undefined>,
  resolvedInputsByName: Map<string, WorkspaceInputsConfig>,
): AffectedWorkspaceResult => ({
  workspace: internal.workspace,
  inputs: resolvedInputsByName.get(internal.workspace.name) ?? {},
  isAffected: internal.isAffected,
  affectedReasons: {
    changedFiles: internal.affectedReasons.changedFiles.map((file) => ({
      filePath: file.filePath,
      inputMatch: file.inputPattern,
      ...(file.fileMetadata?.git && {
        gitReasons: file.fileMetadata.git.reasons,
      }),
    })),
    dependencies: internal.affectedReasons.dependencies,
  },
});

export const getAffectedWorkspaces = async (
  project: FileSystemProject,
  options: GetAffectedWorkspacesOptions,
): Promise<AffectedWorkspacesResult> => {
  const { inputs: workspaceInputs, resolvedInputsByName } =
    buildWorkspaceInputs(project);

  if (isOptionsForDiffSource(options, "git")) {
    const baseRef =
      options.diffOptions?.baseRef ??
      project.config.root.defaults.affectedBaseRef;
    const headRef = options.diffOptions?.headRef ?? DEFAULT_HEAD_REF;

    const { affectedWorkspaces } = await getGitAffectedWorkspaces({
      rootDirectory: project.rootDirectory,
      workspacesOptions: {
        workspaceInputs,
        ignorePackageDependencies: options.ignorePackageDependencies,
      },
      gitOptions: {
        baseRef,
        headRef,
        ignoreUntracked: options.diffOptions?.ignoreUntracked,
        ignoreStaged: options.diffOptions?.ignoreStaged,
        ignoreUnstaged: options.diffOptions?.ignoreUnstaged,
        ignoreUncommitted: options.diffOptions?.ignoreUncommitted,
      },
    });

    return {
      metadata: {
        diffSource: "git",
        git: { baseRef, headRef },
      },
      workspaceResults: affectedWorkspaces.map((result) =>
        toAffectedWorkspaceResult(result, resolvedInputsByName),
      ),
    };
  }

  const { affectedWorkspaces } = await getFileAffectedWorkspaces({
    rootDirectory: project.rootDirectory,
    workspaceInputs,
    changedFilePaths: options.changedFiles,
    ignorePackageDependencies: options.ignorePackageDependencies,
  });

  return {
    metadata: { diffSource: "fileList" },
    workspaceResults: affectedWorkspaces.map((result) =>
      toAffectedWorkspaceResult(result, resolvedInputsByName),
    ),
  };
};
