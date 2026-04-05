import {
  resolveRootConfig,
  type ResolvedRootConfig,
  type RootConfig,
} from "./rootConfig";

export const defineRootConfig = (config: RootConfig): ResolvedRootConfig =>
  resolveRootConfig(config);
