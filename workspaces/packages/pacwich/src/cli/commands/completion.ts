import path from "path";
import {
  COMPLETION_SHELLS,
  filterCompletionCandidates,
  getCompletionScript,
  planCompletion,
  type CompletionGroup,
  type CompletionShell,
  type DynamicGroup,
} from "@pacwich/common/cli";
import { logger } from "../../internal/logger";
import { createFileSystemProject } from "../../project";
import type { FileSystemProject } from "../../project/implementations/fileSystemProject";
import { handleGlobalCommand, splitWhitespaceArg } from "./commandHandlerUtils";

const isCompletionShell = (value: string): value is CompletionShell =>
  (COMPLETION_SHELLS as readonly string[]).includes(value);

/**
 * `pacwich completion <shell>` — print a shell completion script.
 *
 * The script is a thin wrapper that calls the hidden `__complete`
 * command (see {@link tryRunCompletionRequest}) for candidates.
 */
export const completion = handleGlobalCommand(
  "completion",
  ({ outputWriters }, shell: string | undefined) => {
    if (!shell || !isCompletionShell(shell)) {
      logger.error(
        `Specify a shell to generate completions for: ${COMPLETION_SHELLS.join(
          ", ",
        )} (e.g. \`pacwich completion zsh\`)`,
      );
      process.exit(1);
      return;
    }

    outputWriters.stdout(getCompletionScript(shell) + "\n");
  },
);

/** Name of the hidden command the shell wrappers invoke. */
export const COMPLETE_COMMAND = "__complete";

/**
 * Handle a `pacwich __complete -- <words>` request, if that is what the
 * given args represent, and return `true` to signal the CLI should stop.
 *
 * This is intercepted early — before global options are parsed and the
 * project is assembled — so tab completion stays fast and, critically,
 * never evaluates the project's executable config files (which a normal
 * command run would). The words to complete arrive after the `--`
 * terminator, so they are never interpreted as pacwich options.
 *
 * Static candidates (commands, flags, enum values) never touch the
 * project. A workspace/script/tag position lazily loads the project with
 * executable configs disabled — so completion still never runs project TS
 * — honoring an explicit `--cwd` already typed on the line.
 *
 * @param commandArgs Args up to (not including) the `--` terminator.
 * @param words The post-terminator words; the last is the partial word.
 */
export const tryRunCompletionRequest = (
  commandArgs: string[],
  words: string[],
  stdout: (text: string) => void,
): boolean => {
  // The wrapper always invokes `<bin> __complete -- ...`, so the command
  // token is the last non-terminator arg. Matching it specifically (not
  // an `includes`) avoids colliding with a workspace literally named
  // `__complete` that might appear inside the words being completed.
  if (commandArgs[commandArgs.length - 1] !== COMPLETE_COMMAND) return false;

  // Completion output is just candidate lines on stdout; suppress any
  // incidental logging (e.g. lockfile warnings during project load) so a
  // shell that doesn't discard stderr still gets clean candidates.
  logger.printLevel = "silent";

  const plan = planCompletion(words);

  // Load the project only when a dynamic group needs it — static
  // completions never touch it. Executable configs stay disabled so
  // completion never runs project TS.
  const project = plan.some((group) => group.kind === "dynamic")
    ? loadProjectForCompletion(words)
    : null;

  const lines = plan.flatMap((group) => resolveGroupLines(group, project));
  if (lines.length) stdout(lines.join("\n") + "\n");
  return true;
};

const loadProjectForCompletion = (
  words: string[],
): FileSystemProject | null => {
  try {
    return createFileSystemProject({
      rootDirectory: extractCwd(words),
      disableExecutableConfigs: true,
    });
  } catch {
    return null;
  }
};

/**
 * Render a planned group as `group⇥value⇥description` lines. Dynamic
 * groups are resolved against the project (names filtered by the group's
 * prefix, each carrying its value prefix). Returns `[]` for an
 * unresolvable dynamic group.
 */
const resolveGroupLines = (
  group: CompletionGroup,
  project: FileSystemProject | null,
): string[] => {
  if (group.kind === "static") {
    return group.items.map((item) =>
      [group.label, item.value, item.description ?? ""].join("\t"),
    );
  }

  if (!project) return [];

  const names = dynamicSourceNames(group, project);
  return filterCompletionCandidates(names, group.prefix).map((name) =>
    [group.label, `${group.valuePrefix ?? ""}${name}`, ""].join("\t"),
  );
};

const dynamicSourceNames = (
  group: DynamicGroup,
  project: FileSystemProject,
): string[] => {
  switch (group.source) {
    case "script":
      return scriptNames(group.workspaceScope, project);
    case "tag":
      return Object.keys(project.tagMap);
    case "workspaceName":
      return project.workspaces.map((workspace) => workspace.name);
    case "workspaceAlias":
      return project.workspaces.flatMap((workspace) => workspace.aliases);
    case "workspacePath":
      return project.workspaces.map(
        (workspace) =>
          path.relative(project.rootDirectory, workspace.path) || ".",
      );
  }
};

/**
 * Script names: the project-wide union, or — when a workspace was already
 * supplied via `-W`/`--workspace`/`--workspace-patterns` — only the
 * scripts of the workspaces those patterns resolve to.
 */
const scriptNames = (
  workspaceScope: string[] | undefined,
  project: FileSystemProject,
): string[] => {
  if (!workspaceScope?.length) return Object.keys(project.scriptMap);

  const patterns = workspaceScope.flatMap(splitWhitespaceArg);
  if (!patterns.length) return Object.keys(project.scriptMap);

  const scripts = new Set<string>();
  for (const workspace of project.findWorkspacesByPattern(...patterns)) {
    for (const script of workspace.scripts) scripts.add(script);
  }
  return [...scripts];
};

/**
 * Resolve the directory to load the project from: an explicit `--cwd` /
 * `--cwd=` already on the line, else the process working directory (where
 * the shell invoked completion).
 */
const extractCwd = (words: string[]): string => {
  // Skip the final element — it's the partial word under the cursor.
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    if (word.startsWith("--cwd=")) return word.slice("--cwd=".length);
    if (word === "--cwd" && i + 1 < words.length - 1) return words[i + 1];
  }
  return process.cwd();
};
