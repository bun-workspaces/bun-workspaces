import type { RootConfig } from "bw-common/config";

/** Merge two or more root configs left to right, with each subsequent config taking precedence */
export const mergeRootConfig = (...configs: RootConfig[]): RootConfig =>
  configs.reduce<RootConfig>(
    (acc, config) => ({
      defaults: {
        ...acc.defaults,
        ...config.defaults,
      },
    }),
    {},
  );
