import rootPackageJson from "../../../package.json";
import { defineErrors } from "../core/error";

export const LIBRARY_CONSUMER_BUN_VERSION =
  rootPackageJson._bwInternal.bunVersion.libraryConsumer;

export const BUILD_BUN_VERSION = rootPackageJson._bwInternal.bunVersion.build;

export const BUN_VERSION_ERRORS = defineErrors(
  "InvalidBunVersion",
  "NotBunRuntime",
);

export const getRequiredBunVersion = (isBuild?: boolean) =>
  isBuild
    ? BUILD_BUN_VERSION.replace(/\.\d+$/, ".x")
    : LIBRARY_CONSUMER_BUN_VERSION;

const _Bun = typeof Bun === "undefined" ? null : Bun;

/**
 * Validates that the provided version satisfies the required Bun version
 * specified in the root `package.json`.
 */
export const validateBunVersion = (version: string, isBuild?: boolean) =>
  _Bun
    ? _Bun.semver.satisfies(version, getRequiredBunVersion(isBuild))
      ? null
      : new BUN_VERSION_ERRORS.InvalidBunVersion(
          isBuild
            ? `Expected Bun version ${getRequiredBunVersion(isBuild)} for build`
            : `Bun version ${version} is not supported by bun-workspaces. Supported: ${getRequiredBunVersion(isBuild)}`,
        )
    : new BUN_VERSION_ERRORS.NotBunRuntime(
        `bun-workspaces is not running in a Bun runtime. Expected Bun version ${getRequiredBunVersion(isBuild)}`,
      );

/**
 * Validates that the Bun version of the current script satisfies the
 * required Bun version specified in the root `package.json`.
 */
export const validateCurrentBunVersion = (build?: boolean) =>
  validateBunVersion(_Bun?.version ?? "(Error: not Bun runtime)", build);
