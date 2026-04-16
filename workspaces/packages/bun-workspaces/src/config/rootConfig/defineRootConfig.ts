import { type RootConfig, type ResolvedRootConfig } from "bw-common/config";
import { resolveRootConfig } from "./rootConfig";

export const defineRootConfig = (config: RootConfig): ResolvedRootConfig =>
  resolveRootConfig(config);
