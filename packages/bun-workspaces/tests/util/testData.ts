import { expect } from "bun:test";
import type { Workspace } from "../../src";
import { resolveWorkspaceConfig, type WorkspaceConfig } from "../../src/config";
import { withWindowsPath } from "./windows";

export const createTestWorkspace = (data: Partial<Workspace>): Workspace => ({
  name: "",
  isRoot: false,
  matchPattern: "",
  scripts: [],
  aliases: [],
  dependencies: [],
  dependents: [],
  ...data,
  path: withWindowsPath(data.path ?? ""),
});

export const createWorkspaceMapEntry = (config: WorkspaceConfig) => ({
  workspace: expect.any(Object),
  config: resolveWorkspaceConfig(config),
  packageJson: expect.any(Object),
});
