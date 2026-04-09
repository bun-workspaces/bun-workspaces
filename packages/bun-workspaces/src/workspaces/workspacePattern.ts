import bun from "bun";
import { defineErrors, createWildcardRegex } from "../internal/core";
import type { Workspace } from "./workspace";

const TARGETS = ["path", "alias", "name", "tag"] as const;

export const WORKSPACE_PATTERN_ERRORS = defineErrors("InvalidWorkspacePattern");

export type WorkspacePatternTarget = (typeof TARGETS)[number];

export type WorkspacePattern = {
  target: WorkspacePatternTarget | "default";
  value: string;
  isNegated: boolean;
};

export const WORKSPACE_PATTERN_NEGATION_PREFIX = "not:";

export const WORKSPACE_PATTERN_SEPARATOR = ":";

export const parseWorkspacePattern = (pattern: string): WorkspacePattern => {
  const isNegated = pattern.startsWith(WORKSPACE_PATTERN_NEGATION_PREFIX);

  const patternValue = isNegated
    ? pattern.slice(WORKSPACE_PATTERN_NEGATION_PREFIX.length)
    : pattern;

  const target = TARGETS.find((target) =>
    patternValue.startsWith(target + WORKSPACE_PATTERN_SEPARATOR),
  );

  if (!target) {
    return {
      target: "default",
      value: patternValue,
      isNegated,
    };
  }

  const value = patternValue.slice(
    target.length + WORKSPACE_PATTERN_SEPARATOR.length,
  );

  return {
    target,
    value,
    isNegated,
  };
};

export const stringifyWorkspacePattern = (
  pattern: WorkspacePattern,
): string => {
  return `${pattern.target}${WORKSPACE_PATTERN_SEPARATOR}${pattern.value}`;
};

const PATTERN_TARGET_HANDLERS: Record<
  WorkspacePatternTarget | "default",
  (
    pattern: WorkspacePattern,
    workspaces: Workspace[],
    wildcardRegex: RegExp,
  ) => Workspace[]
> = {
  default: (pattern, workspaces, wildcardRegex) => {
    return workspaces.filter((workspace) => {
      return (
        (pattern.value.includes("*")
          ? wildcardRegex.test(workspace.name)
          : workspace.name === pattern.value) ||
        workspace.aliases.some((alias) =>
          pattern.value.includes("*")
            ? wildcardRegex.test(alias)
            : alias === pattern.value,
        )
      );
    });
  },
  name: (pattern, workspaces, wildcardRegex) => {
    return workspaces.filter((workspace) => {
      return pattern.value.includes("*")
        ? wildcardRegex.test(workspace.name)
        : workspace.name === pattern.value;
    });
  },
  alias: (pattern, workspaces, wildcardRegex) => {
    return workspaces.filter((workspace) => {
      return pattern.value.includes("*")
        ? workspace.aliases.some((alias) => wildcardRegex.test(alias))
        : workspace.aliases.includes(pattern.value);
    });
  },
  path: (pattern, workspaces) => {
    return workspaces.filter((workspace) =>
      new bun.Glob(pattern.value.replace(/\/+$/, "")).match(workspace.path),
    );
  },
  tag: (pattern, workspaces, wildcardRegex) => {
    return workspaces.filter((workspace) =>
      pattern.value.includes("*")
        ? workspace.tags.some((tag) => wildcardRegex.test(tag))
        : workspace.tags.includes(pattern.value),
    );
  },
};

const matchWorkspacesByPattern = (
  pattern: WorkspacePattern,
  workspaces: Workspace[],
) =>
  PATTERN_TARGET_HANDLERS[pattern.target](
    pattern,
    workspaces,
    createWildcardRegex(pattern.value),
  );

export const matchWorkspacesByPatterns = (
  patterns: string[],
  workspaces: Workspace[],
) => {
  const parsedPatterns = patterns.map(parseWorkspacePattern);

  const excludePatterns = parsedPatterns.filter((pattern) => pattern.isNegated);
  const includePatterns = parsedPatterns.filter(
    (pattern) => !pattern.isNegated,
  );

  const excludeWorkspaces = excludePatterns.flatMap((pattern) =>
    matchWorkspacesByPattern(pattern, workspaces),
  );

  const includeWorkspaces = includePatterns.flatMap((pattern) =>
    matchWorkspacesByPattern(pattern, workspaces),
  );

  return includeWorkspaces.filter(
    (workspace, index, arr) =>
      !excludeWorkspaces.some(
        (excludeWorkspace) => excludeWorkspace.name === workspace.name,
      ) &&
      !arr
        .slice(index + 1)
        .some((nextWorkspace) => nextWorkspace.name === workspace.name),
  );
};
