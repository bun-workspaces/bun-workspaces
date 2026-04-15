import path from "path";
import { defineConfig } from "@rslib/core";
import { validateCurrentBunVersion } from "./src/internal/bun";

export const IS_TEST_BUILD = process.env.BUILD_INCLUDE_TESTS === "true";

const DIST_PATH = IS_TEST_BUILD ? "dist.test/src" : "dist/src";

const bunVersionError = validateCurrentBunVersion(true);

if (bunVersionError) {
  // eslint-disable-next-line no-console
  console.error(bunVersionError);
}

export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
      bundle: false,
      source: {
        include: ["src/**/*.ts"],
      },
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
      root: DIST_PATH,
    },
    cleanDistPath: true,
    copy: [
      {
        from: path.resolve(__dirname, "package.json"),
        to: "../package.json",
      },
      {
        from: path.resolve(__dirname, "../../README.md"),
        to: "../README.md",
      },
      {
        from: path.resolve(__dirname, "../../LICENSE.md"),
        to: "../LICENSE.md",
      },
      {
        from: path.resolve(__dirname, "bin"),
        to: "../bin",
      },
      ...(IS_TEST_BUILD
        ? [
            {
              from: path.resolve(__dirname, "tests"),
              to: "../tests",
            },
            {
              from: path.resolve(__dirname, "scripts"),
              to: "../scripts",
            },
            {
              from: path.resolve(__dirname, "bunfig.toml"),
              to: "../bunfig.toml",
            },
            {
              from: path.resolve(__dirname, ".env.test"),
              to: "../",
            },
            {
              from: path.resolve(__dirname, "setupTests.ts"),
              to: "../setupTests.ts",
            },
          ]
        : []),
    ],
  },
});
