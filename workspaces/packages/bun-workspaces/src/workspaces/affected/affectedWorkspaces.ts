import path from "path";
import bun from "bun";
import type { Workspace } from "../workspace";
import { matchWorkspacesByPatterns } from "../workspacePattern";

export type AffectedDependencyEdgeSource = "input" | "package";

export interface AffectedDependencyChainEntry {
  workspaceName: string;
  /**
   * The kind of edge that led to this workspace from the previous chain entry.
   * Undefined for the starting workspace at the head of the chain.
   */
  edgeSource?: AffectedDependencyEdgeSource;
}

export interface AffectedWorkspaceInput {
  workspace: Workspace;
  /** File paths, directories, or glob patterns relative to the workspace's path. Prefix with `!` to exclude. */
  inputFilePatterns: string[];
  /** Workspace patterns to also treat as dependencies, matched against all workspaces in `workspaceInputs` */
  inputWorkspacePatterns: string[];
}

export interface AffectedFileResult {
  /** The path to the file in the workspace */
  filePath: string;
  /** The matched input path of the file */
  inputPattern: string;
}

export interface AffectedDependencyResult {
  dependencyName: string;
  /** The chain of workspaces that led from the starting workspace to the affected dependency */
  chain: AffectedDependencyChainEntry[];
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
  /** Whether to ignore the package.json dependencies when determining affected workspaces */
  ignorePackageDependencies?: boolean;
}

export interface GetAffectedWorkspacesResult {
  affectedWorkspaces: AffectedWorkspaceResult[];
}

const FILE_PATTERN_NEGATION_PREFIX = "!";

const GLOB_CHARACTER_REGEX = /[*?[{]/;

const toPosixPath = (filePath: string) => filePath.replaceAll("\\", "/");

const stripTrailingSlashes = (filePath: string) => filePath.replace(/\/+$/, "");

const stripLeadingSlashes = (filePath: string) => filePath.replace(/^\/+/, "");

const normalizeChangedFilePath = ({
  rootDirectory,
  filePath,
}: {
  rootDirectory: string;
  filePath: string;
}) => {
  const posixFilePath = toPosixPath(filePath);
  if (!path.isAbsolute(filePath)) {
    return posixFilePath;
  }
  const posixRoot = stripTrailingSlashes(toPosixPath(rootDirectory));
  if (posixFilePath === posixRoot) {
    return "";
  }
  if (posixRoot && posixFilePath.startsWith(`${posixRoot}/`)) {
    return posixFilePath.slice(posixRoot.length + 1);
  }
  return posixFilePath;
};

const PROJECT_RELATIVE_PREFIX = "/";

const resolveInputPattern = ({
  workspacePath,
  inputPattern,
}: {
  workspacePath: string;
  inputPattern: string;
}) => {
  const posixPattern = toPosixPath(inputPattern);

  if (posixPattern.startsWith(PROJECT_RELATIVE_PREFIX)) {
    return stripTrailingSlashes(stripLeadingSlashes(posixPattern));
  }

  const normalizedWorkspacePath = stripTrailingSlashes(
    toPosixPath(workspacePath),
  );
  const normalizedPattern = stripTrailingSlashes(posixPattern);

  if (!normalizedWorkspacePath || normalizedWorkspacePath === ".") {
    return normalizedPattern;
  }
  if (!normalizedPattern || normalizedPattern === ".") {
    return normalizedWorkspacePath;
  }
  return `${normalizedWorkspacePath}/${normalizedPattern}`;
};

const matchesResolvedPattern = ({
  filePath,
  resolvedPattern,
}: {
  filePath: string;
  resolvedPattern: string;
}): boolean => {
  if (!resolvedPattern) {
    return true;
  }
  if (GLOB_CHARACTER_REGEX.test(resolvedPattern)) {
    return new bun.Glob(resolvedPattern).match(filePath);
  }
  return (
    filePath === resolvedPattern || filePath.startsWith(`${resolvedPattern}/`)
  );
};

type SplitFilePatterns = {
  includes: string[];
  excludes: string[];
};

const splitFilePatterns = (patterns: string[]): SplitFilePatterns => {
  const includes: string[] = [];
  const excludes: string[] = [];
  for (const pattern of patterns) {
    if (pattern.startsWith(FILE_PATTERN_NEGATION_PREFIX)) {
      excludes.push(pattern.slice(FILE_PATTERN_NEGATION_PREFIX.length));
    } else {
      includes.push(pattern);
    }
  }
  return { includes, excludes };
};

const matchChangedFilesForWorkspace = ({
  workspace,
  inputFilePatterns,
  changedFilePaths,
}: {
  workspace: Workspace;
  inputFilePatterns: string[];
  changedFilePaths: string[];
}): AffectedFileResult[] => {
  const { includes, excludes } = splitFilePatterns(inputFilePatterns);

  const matchedFiles: AffectedFileResult[] = [];
  const matchedFilePaths = new Set<string>();

  for (const filePath of changedFilePaths) {
    if (matchedFilePaths.has(filePath)) continue;

    let matchingInclude: string | undefined;
    for (const include of includes) {
      const resolvedPattern = resolveInputPattern({
        workspacePath: workspace.path,
        inputPattern: include,
      });
      if (matchesResolvedPattern({ filePath, resolvedPattern })) {
        matchingInclude = include;
        break;
      }
    }
    if (matchingInclude === undefined) continue;

    const isExcluded = excludes.some((exclude) => {
      const resolvedPattern = resolveInputPattern({
        workspacePath: workspace.path,
        inputPattern: exclude,
      });
      return matchesResolvedPattern({ filePath, resolvedPattern });
    });
    if (isExcluded) continue;

    matchedFiles.push({ filePath, inputPattern: matchingInclude });
    matchedFilePaths.add(filePath);
  }

  return matchedFiles;
};

const resolveInputWorkspaceDependencies = ({
  workspaceInputs,
}: {
  workspaceInputs: AffectedWorkspaceInput[];
}): Map<string, string[]> => {
  const inputDependenciesByName = new Map<string, string[]>();
  const allWorkspaces = workspaceInputs.map(({ workspace }) => workspace);

  for (const { workspace, inputWorkspacePatterns } of workspaceInputs) {
    if (inputWorkspacePatterns.length === 0) {
      inputDependenciesByName.set(workspace.name, []);
      continue;
    }
    const matchedNames = matchWorkspacesByPatterns(
      inputWorkspacePatterns,
      allWorkspaces,
    )
      .map((matchedWorkspace) => matchedWorkspace.name)
      .filter((matchedName) => matchedName !== workspace.name);
    inputDependenciesByName.set(workspace.name, matchedNames);
  }

  return inputDependenciesByName;
};

const computeAffectedWorkspaceSet = ({
  workspaceInputs,
  workspaceByName,
  changedFilesByName,
  inputDependenciesByName,
  ignorePackageDependencies,
}: {
  workspaceInputs: AffectedWorkspaceInput[];
  workspaceByName: Map<string, Workspace>;
  changedFilesByName: Map<string, AffectedFileResult[]>;
  inputDependenciesByName: Map<string, string[]>;
  ignorePackageDependencies: boolean;
}): Set<string> => {
  const inputDependentsByName = new Map<string, string[]>();
  for (const [workspaceName, dependencyNames] of inputDependenciesByName) {
    for (const dependencyName of dependencyNames) {
      const existing = inputDependentsByName.get(dependencyName);
      if (existing) {
        existing.push(workspaceName);
      } else {
        inputDependentsByName.set(dependencyName, [workspaceName]);
      }
    }
  }

  const affected = new Set<string>();
  const queue: string[] = [];

  for (const { workspace } of workspaceInputs) {
    if ((changedFilesByName.get(workspace.name)?.length ?? 0) > 0) {
      affected.add(workspace.name);
      queue.push(workspace.name);
    }
  }

  while (queue.length > 0) {
    const currentName = queue.shift()!;
    const currentWorkspace = workspaceByName.get(currentName);

    const dependents = [
      ...(inputDependentsByName.get(currentName) ?? []),
      ...(!ignorePackageDependencies && currentWorkspace
        ? currentWorkspace.dependents
        : []),
    ];

    for (const dependentName of dependents) {
      if (!workspaceByName.has(dependentName)) continue;
      if (affected.has(dependentName)) continue;
      affected.add(dependentName);
      queue.push(dependentName);
    }
  }

  return affected;
};

const collectAffectedDependencies = ({
  startingWorkspace,
  workspaceByName,
  inputDependenciesByName,
  affectedSet,
  ignorePackageDependencies,
}: {
  startingWorkspace: Workspace;
  workspaceByName: Map<string, Workspace>;
  inputDependenciesByName: Map<string, string[]>;
  affectedSet: Set<string>;
  ignorePackageDependencies: boolean;
}): AffectedDependencyResult[] => {
  const results: AffectedDependencyResult[] = [];
  const visited = new Set<string>([startingWorkspace.name]);

  const visit = (
    currentName: string,
    chain: AffectedDependencyChainEntry[],
  ) => {
    const currentWorkspace = workspaceByName.get(currentName);
    if (!currentWorkspace) return;

    const edges: {
      dependencyName: string;
      edgeSource: AffectedDependencyEdgeSource;
    }[] = [];

    for (const dependencyName of inputDependenciesByName.get(currentName) ??
      []) {
      edges.push({ dependencyName, edgeSource: "input" });
    }
    if (!ignorePackageDependencies) {
      for (const dependencyName of currentWorkspace.dependencies) {
        edges.push({ dependencyName, edgeSource: "package" });
      }
    }

    for (const { dependencyName, edgeSource } of edges) {
      if (visited.has(dependencyName)) continue;
      if (!workspaceByName.has(dependencyName)) continue;
      visited.add(dependencyName);

      const dependencyChain: AffectedDependencyChainEntry[] = [
        ...chain,
        { workspaceName: dependencyName, edgeSource },
      ];

      if (affectedSet.has(dependencyName)) {
        results.push({ dependencyName, chain: dependencyChain });
      }

      visit(dependencyName, dependencyChain);
    }
  };

  visit(startingWorkspace.name, [{ workspaceName: startingWorkspace.name }]);
  return results;
};

export const getAffectedWorkspaces = async ({
  rootDirectory,
  workspaceInputs,
  changedFilePaths,
  ignorePackageDependencies = false,
}: GetAffectedWorkspacesOptions): Promise<GetAffectedWorkspacesResult> => {
  const normalizedChangedFilePaths = changedFilePaths.map((filePath) =>
    normalizeChangedFilePath({ rootDirectory, filePath }),
  );

  const workspaceByName = new Map(
    workspaceInputs.map(
      ({ workspace }) => [workspace.name, workspace] as const,
    ),
  );

  const changedFilesByName = new Map<string, AffectedFileResult[]>();
  for (const { workspace, inputFilePatterns } of workspaceInputs) {
    changedFilesByName.set(
      workspace.name,
      matchChangedFilesForWorkspace({
        workspace,
        inputFilePatterns,
        changedFilePaths: normalizedChangedFilePaths,
      }),
    );
  }

  const inputDependenciesByName = resolveInputWorkspaceDependencies({
    workspaceInputs,
  });

  const affectedSet = computeAffectedWorkspaceSet({
    workspaceInputs,
    workspaceByName,
    changedFilesByName,
    inputDependenciesByName,
    ignorePackageDependencies,
  });

  const affectedWorkspaces = workspaceInputs.map(({ workspace }) => {
    const changedFiles = changedFilesByName.get(workspace.name) ?? [];
    const dependencies = collectAffectedDependencies({
      startingWorkspace: workspace,
      workspaceByName,
      inputDependenciesByName,
      affectedSet,
      ignorePackageDependencies,
    });

    return {
      workspace,
      isAffected: affectedSet.has(workspace.name),
      affectedReasons: { changedFiles, dependencies },
    };
  });

  return { affectedWorkspaces };
};
