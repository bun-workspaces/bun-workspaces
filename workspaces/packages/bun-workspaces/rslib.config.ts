import path from "path";
import { defineConfig } from "@rslib/core";
import { validateCurrentBunVersion } from "./src/internal/bun";

export const IS_TEST_BUILD = process.env.BUILD_INCLUDE_TESTS === "true";

export const DIST_PATH = path.join(
  __dirname,
  IS_TEST_BUILD ? "dist.test" : "dist",
);

const bunVersionError = validateCurrentBunVersion(true);

if (bunVersionError) {
  // eslint-disable-next-line no-console
  console.error(bunVersionError);
}

export default defineConfig({
  lib: [
    {
      format: "esm",
      bundle: false,
      source: { include: ["src/**/*.ts"] },
    },
  ],
  output: {
    minify: {
      js: false,
      jsOptions: {
        extractComments: true,
      },
    },
    distPath: {
      root: path.join(DIST_PATH, "src"),
    },
    cleanDistPath: true,
    copy: [
      {
        from: path.resolve(process.env.BW_PROJECT_PATH as string, "README.md"),
        to: "../README.md",
      },
      {
        from: path.resolve(process.env.BW_PROJECT_PATH as string, "LICENSE.md"),
        to: "../LICENSE.md",
      },
      {
        from: path.resolve(__dirname, "bin"),
        to: "../bin",
      },
    ],
  },
});
