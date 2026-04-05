import {
  resolveRootConfig,
  type RootConfig as JSONSchemaRootConfig,
  type ResolvedRootConfig,
} from "./rootConfig";

export type RootConfig = {
  defaults?: {
    parallelMax?: number | string;
    shell?: string;
    includeRootWorkspace?: boolean;
  };
};

export const defineRootConfig = (config: RootConfig): ResolvedRootConfig =>
  resolveRootConfig(config satisfies JSONSchemaRootConfig);
