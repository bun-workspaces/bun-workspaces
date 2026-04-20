import type { RootConfig } from "bw-common/config";

export type RootConfigFactory = (prev: RootConfig) => RootConfig;

export type RootConfigInput = RootConfig | RootConfigFactory;

/** Merge two or more root configs left to right, with each subsequent config taking precedence.
 * Any argument may be a factory function receiving the accumulated config up to that point. */
export const mergeRootConfig = (...configs: RootConfigInput[]): RootConfig =>
  configs.reduce<RootConfig>((acc, configOrFactory) => {
    const config =
      typeof configOrFactory === "function"
        ? configOrFactory(acc)
        : configOrFactory;
    const mergedPatternConfigs = [
      ...(acc.workspacePatternConfigs ?? []),
      ...(config.workspacePatternConfigs ?? []),
    ];
    return {
      defaults: {
        ...acc.defaults,
        ...config.defaults,
      },
      ...(mergedPatternConfigs.length > 0 && {
        workspacePatternConfigs: mergedPatternConfigs,
      }),
    };
  }, {});
