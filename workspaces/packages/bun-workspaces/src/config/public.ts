export type {
  RootConfig,
  ResolvedRootConfig,
  WorkspaceConfig,
  WorkspaceDependenciesRule,
  ResolvedWorkspaceConfig,
  WorkspaceRules,
  ScriptConfig,
} from "bw-common/config";
export { defineRootConfig } from "./rootConfig/defineRootConfig";
export { mergeRootConfig } from "./rootConfig/mergeRootConfig";
export { defineWorkspaceConfig } from "./workspaceConfig/defineWorkspaceConfig";
export { mergeWorkspaceConfig } from "./workspaceConfig/mergeWorkspaceConfig";
