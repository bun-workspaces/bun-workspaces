import {
  readFileSync,
  writeFileSync,
  rmSync,
  renameSync,
  copyFileSync,
  mkdirSync,
} from "fs";
import path from "path";
import { build } from "@rslib/core";
import { $ } from "bun";

import rsLibConfig, { IS_TEST_BUILD } from "../rslib.config.ts";

const PACKAGE_JSON_PATH = path.resolve(
  rsLibConfig.output?.distPath?.root ?? "",
  "../package.json",
);

const ROOT_PACKAGE_JSON_PATH = path.resolve(__dirname, "../../../package.json");

const createDesiredPackageJson = () => {
  const {
    name,
    version,
    description,
    exports,
    homepage,
    repository,
    bin,
    _bwInternal,
    dependencies,
    keywords,
    scripts,
  } = JSON.parse(readFileSync(path.resolve(PACKAGE_JSON_PATH)).toString());

  const { license } = JSON.parse(
    readFileSync(ROOT_PACKAGE_JSON_PATH).toString(),
  );

  return {
    name,
    version,
    description,
    license,
    exports: Object.fromEntries(
      Object.entries(exports).map(([key, value]) => [
        key,
        (value as string).replace(".ts", ".mjs"),
      ]),
    ),
    types: exports["."].replace(".ts", ".d.ts"),
    homepage,
    repository,
    keywords,
    engines: {
      bun: _bwInternal.bunVersion.libraryConsumer,
    },
    bin,
    _bwInternal,
    dependencies,
    ...(IS_TEST_BUILD ? { scripts } : {}),
  };
};

export const runBuild = async () => {
  await $`bun run ajv`;

  console.log("Running rslib build...");
  await build(rsLibConfig);

  console.log("Writing package.json...");
  writeFileSync(
    PACKAGE_JSON_PATH,
    JSON.stringify(createDesiredPackageJson(), null, 2),
  );

  const outputPath = IS_TEST_BUILD ? "../dist.test" : "../dist";

  console.log("Writing .prettierignore...");
  writeFileSync(
    path.resolve(__dirname, outputPath, ".prettierignore"),
    "**/tests/**/*.json",
  );

  await $`cd ${path.resolve(__dirname, IS_TEST_BUILD ? "../dist.test" : "../dist")} && bunx prettier --write . > /dev/null`;

  rmSync(path.resolve(__dirname, outputPath, ".prettierignore"));
  rmSync(path.resolve(__dirname, outputPath, "node_modules"), {
    recursive: true,
    force: true,
  });
  rmSync(path.resolve(__dirname, outputPath, "src/internal/generated/ajv"), {
    recursive: true,
    force: true,
  });

  mkdirSync(path.resolve(__dirname, outputPath, "src/internal/generated/ajv"), {
    recursive: true,
  });

  for (const file of new Bun.Glob(
    path.resolve(__dirname, "../src/internal/generated/ajv/*"),
  ).scanSync()) {
    copyFileSync(
      file,
      path.resolve(
        __dirname,
        outputPath,
        "src/internal/generated/ajv/",
        path.basename(file),
      ),
    );
    renameSync(
      path.resolve(
        __dirname,
        outputPath,
        "src/internal/generated/ajv/",
        path.basename(file),
      ),

      path.resolve(
        __dirname,
        outputPath,
        "src/internal/generated/ajv/",
        path.basename(file).replace(".js", ".mjs"),
      ),
    );
  }
};

if (import.meta.main) {
  await runBuild();
}
