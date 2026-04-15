import {
  readFileSync,
  writeFileSync,
  rmSync,
  renameSync,
  copyFileSync,
  mkdirSync,
} from "fs";
import path from "path";
import { createRslib, mergeRslibConfig, type RslibConfig } from "@rslib/core";
import { $ } from "bun";

import rsLibConfig, { IS_TEST_BUILD, DIST_PATH } from "../rslib.config.ts";

const PACKAGE_JSON_PATH = path.resolve(__dirname, "../package.json");

const ROOT_PACKAGE_JSON_PATH = path.resolve(
  process.env.BW_PROJECT_PATH as string,
  "package.json",
);

const processPackageJson = () => {
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
    dependencies,
    outputPackageJson: {
      name,
      version,
      description,
      license,
      exports: Object.fromEntries(
        Object.entries(exports)
          .map(
            ([key, value]) =>
              [
                key,
                {
                  types: (value as string).replace(".ts", ".d.ts"),
                  default: (value as string).replace(".ts", ".mjs"),
                },
              ] as const,
          )
          .filter(([key]) => !key.startsWith("./src")),
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
      ...(IS_TEST_BUILD ? { scripts } : {}),
    },
  };
};

export const runBuild = async () => {
  await $`bun run ajv`;
  await $`bun run generate-mcp-docs`;

  const { outputPackageJson, dependencies } = processPackageJson();

  console.log("Creating rslib build...");

  const rslibConfig = mergeRslibConfig(rsLibConfig, {
    output: {
      externals: Object.fromEntries(
        Object.keys(dependencies).map((key) => [key, false]),
      ),
    },
  }) as RslibConfig;

  console.log("rslibConfig", rslibConfig);

  const rslib = await createRslib({
    config: rslibConfig,
  });

  await rslib.build();

  console.log("Writing package.json...");
  writeFileSync(
    path.resolve(DIST_PATH, "package.json"),
    JSON.stringify(outputPackageJson, null, 2),
  );

  console.log("Writing .prettierignore...");
  writeFileSync(
    path.resolve(DIST_PATH, ".prettierignore"),
    "**/tests/**/*.json",
  );

  await $`cd ${path.resolve(__dirname, IS_TEST_BUILD ? "../dist.test" : "../dist")} && bunx prettier --write . > /dev/null`;

  rmSync(path.resolve(DIST_PATH, ".prettierignore"));
  rmSync(path.resolve(DIST_PATH, "node_modules"), {
    recursive: true,
    force: true,
  });
  rmSync(path.resolve(DIST_PATH, "src/internal/generated/ajv"), {
    recursive: true,
    force: true,
  });

  mkdirSync(path.resolve(DIST_PATH, "src/internal/generated/ajv"), {
    recursive: true,
  });

  for (const file of new Bun.Glob(
    path.resolve(__dirname, "../src/internal/generated/ajv/*"),
  ).scanSync()) {
    copyFileSync(
      file,
      path.resolve(
        DIST_PATH,
        "src/internal/generated/ajv/",
        path.basename(file),
      ),
    );
    renameSync(
      path.resolve(
        DIST_PATH,
        "src/internal/generated/ajv/",
        path.basename(file),
      ),

      path.resolve(
        DIST_PATH,
        "src/internal/generated/ajv/",
        path.basename(file).replace(".js", ".mjs"),
      ),
    );
  }
};

if (import.meta.main) {
  await runBuild();
}
