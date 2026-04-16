import {
  readFileSync,
  writeFileSync,
  rmSync,
  renameSync,
  copyFileSync,
  readdirSync,
  mkdirSync,
  cpSync,
} from "fs";
import path from "path";
import { createRslib, mergeRslibConfig, type RslibConfig } from "@rslib/core";
import { $ } from "bun";
import { createFileSystemProject } from "bun-workspaces";
import { generateDtsBundle } from "dts-bundle-generator";

import rsLibConfigRaw, { IS_TEST_BUILD, DIST_PATH } from "../rslib.config.ts";

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
    inputPackageJson: {
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
    },
    outputPackageJson: {
      name,
      version,
      description,
      license,
      exports: Object.fromEntries(
        Object.entries(exports).map(
          ([key, value]) =>
            [
              key,
              {
                types: (value as string).replace(".ts", ".d.ts"),
                default: (value as string).replace(".ts", ".mjs"),
              },
            ] as const,
        ),
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

  const { outputPackageJson, inputPackageJson, dependencies } =
    processPackageJson();

  console.log("Creating rslib build...");

  const project = createFileSystemProject({
    rootDirectory: process.env.BW_PROJECT_PATH as string,
  });

  const bundledDependencies = Object.entries(dependencies).reduce(
    (acc, [key, value]) => {
      acc.push(key);
      if (value === "workspace:*") {
        const workspace = project.findWorkspaceByName(key);
        if (workspace) {
          // push all subpaths of the workspace
          for (const subpath of readdirSync(
            path.resolve(project.rootDirectory, workspace.path),
            {
              withFileTypes: true,
            },
          )) {
            if (subpath.isDirectory()) {
              acc.push(path.join(workspace.name, subpath.name));
            }
          }
        }
      }
      return acc;
    },
    [] as string[],
  );

  const rsLibConfig = mergeRslibConfig(rsLibConfigRaw, {
    output: {
      externals: Object.fromEntries(
        bundledDependencies.map((dependency) => [dependency, false]),
      ),
    },
  }) as RslibConfig;

  const rslib = await createRslib({
    config: rsLibConfig,
  });

  await rslib.build();

  console.log("Bundling DTS...");

  const files = await generateDtsBundle(
    [{ filePath: path.resolve(__dirname, "../dist/src/cli/index.d.ts") }],
    // Object.values(inputPackageJson.exports).map((exp) => ({
    //   inlinedLibraries: bundledDependencies,
    //   filePath: path.resolve(
    //     __dirname,
    //     "../dist",
    //     (exp as string).replace(".ts", ".d.ts"),
    //   ),
    // })),
    {
      preferredConfigPath: path.resolve(__dirname, "../tsconfig.dts.json"),
    },
  );

  console.log(files);

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

  if (IS_TEST_BUILD) {
    cpSync(
      path.resolve(__dirname, "../tests"),
      path.resolve(DIST_PATH, "tests"),
      { recursive: true },
    );
    cpSync(
      path.resolve(__dirname, "../scripts"),
      path.resolve(DIST_PATH, "scripts"),
      { recursive: true },
    );
    copyFileSync(
      path.resolve(__dirname, "../bunfig.toml"),
      path.resolve(DIST_PATH, "bunfig.toml"),
    );
    copyFileSync(
      path.resolve(__dirname, "../.env.test"),
      path.resolve(DIST_PATH, ".env.test"),
    );
    copyFileSync(
      path.resolve(__dirname, "../setupTests.ts"),
      path.resolve(DIST_PATH, "setupTests.ts"),
    );
  }
};

if (import.meta.main) {
  await runBuild();
}
