import type { ShellOption } from "../../project";
import type { ParallelMaxValue } from "../../runScript";
import {
  resolveRootConfig,
  type RootConfig as JSONSchemaRootConfig,
  type ResolvedRootConfig,
} from "./rootConfig";

export type RootConfig = {
  defaults?: {
    parallelMax?: ParallelMaxValue;
    shell?: ShellOption;
    includeRootWorkspace?: boolean;
  };
};

export const defineRootConfig = (config: RootConfig): ResolvedRootConfig =>
  resolveRootConfig(config satisfies JSONSchemaRootConfig);
