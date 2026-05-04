import fs from "fs";
import path from "path";
import { defineErrors } from "../../internal/core";
import { createSubprocess } from "../../runScript/subprocesses";

export const GIT_AFFECTED_ERRORS = defineErrors(
  "NoGitRepository",
  "GitCommandFailed",
);

export const GIT_AFFECTED_FILE_REASONS = [
  "diff",
  "staged",
  "unstaged",
  "untracked",
] as const;

export type GitAffectedFileReason = (typeof GIT_AFFECTED_FILE_REASONS)[number];

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

export interface GitAffectedFile {
  /** Posix file path relative to the project root */
  projectFilePath: string;
  /**
   * The reasons for the file being affected, in canonical order.
   * A file in the committed range may also appear as staged/unstaged/untracked
   * if it has corresponding working-tree state.
   */
  reasons: GitAffectedFileReason[];
}

export interface GetGitAffectedFilesResult {
  files: GitAffectedFile[];
}

interface RunGitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const runGit = async (args: string[], cwd: string): Promise<RunGitResult> => {
  const proc = createSubprocess(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
};

const runGitOrThrow = async (args: string[], cwd: string): Promise<string> => {
  const { stdout, stderr, exitCode } = await runGit(args, cwd);
  if (exitCode !== 0) {
    throw new GIT_AFFECTED_ERRORS.GitCommandFailed(
      `git ${args.join(" ")} failed (exit ${exitCode}): ${stderr.trim()}`,
    );
  }
  return stdout;
};

const parseLines = (output: string): string[] =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const resolveGitRoot = async (rootDirectory: string): Promise<string> => {
  let result: RunGitResult;
  try {
    result = await runGit(["rev-parse", "--show-toplevel"], rootDirectory);
  } catch (error) {
    throw new GIT_AFFECTED_ERRORS.NoGitRepository(
      `Not a git repository: ${rootDirectory}${
        error instanceof Error ? ` (${error.message})` : ""
      }`,
    );
  }
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    throw new GIT_AFFECTED_ERRORS.NoGitRepository(
      `Not a git repository: ${rootDirectory}`,
    );
  }
  return result.stdout.trim();
};

const toProjectFilePath = ({
  gitRoot,
  absoluteProjectRoot,
  gitRelativePath,
}: {
  gitRoot: string;
  absoluteProjectRoot: string;
  gitRelativePath: string;
}): string | null => {
  const absolute = path.resolve(gitRoot, gitRelativePath);
  const relative = path.relative(absoluteProjectRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return relative.split(path.sep).join("/");
};

export const getGitAffectedFiles = async (
  options: GetGitAffectedFilesOptions,
): Promise<GetGitAffectedFilesResult> => {
  const {
    rootDirectory,
    baseRef,
    headRef,
    ignoreUntracked,
    ignoreStaged,
    ignoreUnstaged,
    ignoreUncommitted,
  } = options;

  const gitRoot = fs.realpathSync.native(
    path.resolve(await resolveGitRoot(rootDirectory)),
  );
  const absoluteProjectRoot = fs.realpathSync.native(
    path.resolve(rootDirectory),
  );

  const includeStaged = !ignoreUncommitted && !ignoreStaged;
  const includeUnstaged = !ignoreUncommitted && !ignoreUnstaged;
  const includeUntracked = !ignoreUncommitted && !ignoreUntracked;

  type Bucket = { reason: GitAffectedFileReason; paths: string[] };
  const collectors: Promise<Bucket>[] = [
    runGitOrThrow(["diff", "--name-only", baseRef, headRef], gitRoot).then(
      (out) => ({ reason: "diff", paths: parseLines(out) }),
    ),
  ];

  if (includeStaged) {
    collectors.push(
      runGitOrThrow(["diff", "--cached", "--name-only"], gitRoot).then(
        (out) => ({ reason: "staged", paths: parseLines(out) }),
      ),
    );
  }
  if (includeUnstaged) {
    collectors.push(
      runGitOrThrow(["diff", "--name-only"], gitRoot).then((out) => ({
        reason: "unstaged",
        paths: parseLines(out),
      })),
    );
  }
  if (includeUntracked) {
    collectors.push(
      runGitOrThrow(
        ["ls-files", "--others", "--exclude-standard"],
        gitRoot,
      ).then((out) => ({ reason: "untracked", paths: parseLines(out) })),
    );
  }

  const buckets = await Promise.all(collectors);

  const reasonsByPath = new Map<string, Set<GitAffectedFileReason>>();
  for (const { reason, paths } of buckets) {
    for (const gitRelativePath of paths) {
      const projectFilePath = toProjectFilePath({
        gitRoot,
        absoluteProjectRoot,
        gitRelativePath,
      });
      if (!projectFilePath) continue;
      let set = reasonsByPath.get(projectFilePath);
      if (!set) {
        set = new Set();
        reasonsByPath.set(projectFilePath, set);
      }
      set.add(reason);
    }
  }

  const files: GitAffectedFile[] = Array.from(reasonsByPath.entries())
    .map(([projectFilePath, reasonSet]) => ({
      projectFilePath,
      reasons: GIT_AFFECTED_FILE_REASONS.filter((r) => reasonSet.has(r)),
    }))
    .sort((a, b) => a.projectFilePath.localeCompare(b.projectFilePath));

  return { files };
};
