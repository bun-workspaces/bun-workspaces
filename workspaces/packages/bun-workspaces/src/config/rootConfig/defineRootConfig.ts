import {
  resolveRootConfig,
  type RootConfig,
  type ResolvedRootConfig,
} from "./rootConfig";

export const defineRootConfig = (config: RootConfig): ResolvedRootConfig =>
  resolveRootConfig(config);
