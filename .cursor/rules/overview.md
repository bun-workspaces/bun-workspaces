---
description: Overview of the bun-workspaces project
alwaysApply: true
---

## Project Overview

bun-workspaces is a CLI and TypeScript API to help manage Bun monorepos. It reads `bun.lock` to find all workspaces in the project. It is referred to as "bw" for short, which is also the recommended CLI alias. The overall goal is a monorepo tool that is more lightweight than others, with still powerful comparable features, requiring no special config to get started, only a standard Bun repo using workspaces.

Three main domain terms to know:

- Project: generally represents a monorepo and is defined by the root `package.json` file
- Workspace: a nested package within a project. The root package.json can count as a workspace as well, but by default, only nested packages are considered workspaces.
- Script: an entry in the `scripts` field of a workspace's `package.json` file. bw can also run one-off commands known as "inline scripts," which can use the Bun shell or system shell (`sh -c` or `cmd /d /s /c` for windows).

## Concepts

### Workspace patterns

Many features accept a list of workspace patterns to match a subset of workspaces.

By default, a pattern matches the workspace name or alias: `my-workspace-name` or `my-alias-name`. Aliases are defined in config explained below.

Patterns can include a wildcard to match only by workspace name: `my-workspace-*`.

- Alias pattern specifier: `alias:my-alias-*`.
- Path pattern specifier (supports glob): `path:packages/**/*`.
- Name pattern specifier: `name:my-workspace-*`.
- Special root workspace selector: `@root`.

### Script runtime metadata

Scripts ran via bw can access metadata via env vars. This same metadata can be interpolated into inline scripts and appended args.

```typescript
// in a script
const projectPath = process.env.BW_PROJECT_PATH;
const workspaceName = process.env.BW_WORKSPACE_NAME;
const workspacePath = process.env.BW_WORKSPACE_PATH;
const workspaceRelativePath = process.env.BW_WORKSPACE_RELATIVE_PATH;
const scriptName = process.env.BW_SCRIPT_NAME;
```

```bash
# interpolated
bw run "bun <projectPath>/my-script.ts" --inline \
  --inline-name="my-script-name" \
  --args="<workspaceName> <workspacePath>"
```

## Examples

Examples are not exhaustive but give a picture of most core features.

### CLI examples:

```bash
alias bw="bunx bun-workspaces"

bw list-workspaces # human-readable output
bw ls --json --pretty # ls is alias for list-workspaces
bw ls "name:my-workspace-*" "alias:my-alias-*" "path:packages/**/*" # accepts workspace patterns

# info includes the name, aliases, path, etc.
bw workspace-info my-workspace
bw info my-workspace --json --pretty # info is alias for workspace-info

# info includes the script name and workspaces that have it in their package.json "scripts" field
bw script-info my-script --json --pretty

# run the package.json "lint" script for all workspaces that have it
bw run-script lint

# run is alias for run-script
# run the package.json "lint" script for workspaces using matching specifiers
bw run lint my-workspace-name "alias:my-alias-pattern-*" "path:my-glob/**/*" # accepts workspace patterns

# special root workspace selector (works even if root workspace is not included)
bw run lint @root

# Default can be overridden by config or env var BW_PARALLEL_MAX_DEFAULT
bw run lint --parallel # default "auto", os.availableParallelism()
bw run lint --parallel=2
bw run lint --parallel=50% # 50% of os.availableParallelism()
bw run lint --parallel=unbounded # run all in one batch

# add args to the script command
bw run lint --args="--my-arg=value"
bw run lint --args="--my-arg=<workspaceName>" # use the workspace name in args

# run the script as an inline command from the workspace directory
bw run "bun build" --inline
bw run "bun build" --inline --inline-name="my-script"
bw run "bun build" --inline --shell=system # use the system shell

### Global Options ###
# Root directory of project:
bw --cwd=/path/to/project ls
bw -d /path/to/project ls

# Include root workspace as a normal workspace (default false):
bw --include-root ls
bw -r ls
bw --no-include-root ls # override config/env var setting

# Log level (debug|info|warn|error|silent, default info)
bw --log-level=silent ls
bw -l silent ls
```

### API examples:

The API is held in close parity with the CLI. It is developed first so that the CLI is a thin wrapper around the API.

```typescript
import { createFileSystemProject } from "bun-workspaces";

const project = createFileSystemProject({
  // the options object itself and its properties are optional
  rootDirectory: "path/to/your/project",
  includeRootWorkspace: false,
});
project.workspaces; // array of all workspaces in the project
project.rootWorkspace; // the root workspace (available even when not included in the workspaces array)
project.findWorkspaceByName("my-workspace"); // find a workspace by name
project.findWorkspaceByAlias("my-alias"); // find a workspace by alias
project.findWorkspaceByNameOrAlias("my-workspace-or-alias"); // find a workspace by name or alias
project.findWorkspacesByPattern(
  "my-workspace-name",
  "my-workspace-alias",
  "my-name-pattern-*",
  "alias:my-alias-*",
  "path:my-glob/**/*",
); // find workspaces by pattern like the CLI
project.runWorkspaceScript({
  workspaceNameOrAlias: "my-workspace",
  script: "lint",
  inline: true,
  args: "--my-arg=value",
});
project.runScriptAcrossWorkspaces({
  script: "lint",
  workspacePatterns: [
    "alias:my-alias-pattern-*",
    "path:my-glob/**/*",
    "workspace-name-a",
    "workspace-alias-b",
  ],
  parallel: true, // also could be { max: 2 }, max taking same options as seen in CLI examples above (e.g. "50%", "auto", etc.)
});
```

## The Workspace object

```jsonc
{
  // The name of the workspace from its package.json
  "name": "my-workspace",
  // Whether the workspace is the root workspace
  "isRoot": false,
  // The relative path to the workspace from the project root
  "path": "my/workspace/path",
  // The glob pattern from the root package.json "workspaces" field
  // that this workspace was matched from
  "matchPattern": "my/workspace/pattern/*",
  // The scripts available in the workspace's package.json
  "scripts": ["my-script"],
  // Aliases defined in workspace configuration (bw.workspace.jsonc/bw.workspace.json)
  "aliases": ["my-alias"],
  // Names of other workspaces that this workspace depends on
  "dependencies": ["my-dependency"],
  // Names of other workspaces that depend on this workspace
  "dependents": ["my-dependent"],
}
```

## Root config

Optional project config can be placed in `bw.root.jsonc`/`bw.root.json` in the root directory.

Config defaults here take precedence over environment variables that can set defaults.
Explicit arguments to the CLI or API take precedence over all other settings.

```jsonc
{
  "defaults": {
    "parallelMax": 5, // same options as seen in CLI examples above
    "shell": "system", // "bun" or "system" (default "bun")
    "includeRootWorkspace": true, // treat root package.json as a normal workspace
  },
}
```

## Workspace config

Optional config can be placed in `bw.workspace.jsonc`/`bw.workspace.json` in a workspace directory.

```jsonc
{
  "alias": "my-alias", // can be array
  "scripts": {
    "lint": {
      // set optional sorting order for scripts
      "order": 1,
    },
  },
}
```

## Development processes

The repo contains three packages:

- `packages/bun-workspaces`: the package that is published, built via rslib. Except when working on the docs, this is the assumed package to be working on.
- `packages/doc-website`: the documentation website (uses the rspress doc framework that has React and MDX support). This imports some metadata directly from the `bun-workspaces` package for consistency.
- `packages/sandbox`: a sandbox for testing the CLI and API (can largely be ignored)

Useful development commands:

- Format via prettier: `bun format`
- Run tests: `bun bw:test`
- Run test that matches a pattern: `bun bw:test myFilePattern`
- Run rslib build: `bun bw:build`
- Lint the package: `bun bw:lint`
- Lint the documentation website: `bun docs:lint`

## Coding style

TypeScript is written in a generally functional/procedural style. Patterns in general in this project should remain fairly consistent but are not dogmatic, as will be explained below.

Class-based patterns are seen but are not the default, such as the `Project` class, which encapsulates composable operations, since context of most of bw's functionality depends on the state of a given project. Classes are still abstracted away, such as how `Project`s are usually instantiated via `createFileSystemProject()`.

The `Workspace` objects are a plain JSON-serializable objects to prevent complex class structures and maintain a functional-like style that generally separates process from data within the project context. Many generic utilities on top of workspaces are written as plain functions and then incorporated into a `Project`'s implementation details.

### Packaging

Feature packaging is preferred over layer packaging. The `src/internal/` directory leans more towards layer packaging for generic utilities.

Module directories often contain an `index.ts` that simply uses `export *` for all files and subdirectories. However, `src/index.ts` defines the public-facing API, so this is where exports must be defined only explicitly.

### Naming and language features

Variable names are camelCase and longer descriptive names are preferred over abbreviations. Functions should generally use a verb. Booleans read as a question, often using `is` or `has` prefix etc. SCREAMING_SNAKE_CASE is used for top-level constants and environment variables.

Arrow functions are preferred, and a single object parameter is generally preferred over multiple parameters. Inline types are not encouraged, with a preference of a named type for object parameters and return types, so that these types can be reused and potentially exported.

Object destructuring is encouraged.

Don't use TypeScript `enum`s but prefer plain objects.

### Style example:

This example shows some common patterns used when a set of accepted values is needed. The main idea here is that the structure of this code is DRY and self-validating, since the `MyValue` type is inferred dierctly from the concrete `MY_VALUES` array, which is the one source of truth for both the type and runtime values. The `MY_BEHAVIOR_MAP` ensures each value has a handler when this type of branched logic is needed instead of using `switch`. Other modules importing from this can use the parameter and return types for `handleMyValue` as needed when composing logic.

```typescript
export const MY_VALUES = ["a", "b", "c"] as const;

export type MyValue = (typeof MY_VALUES)[number];

/** Description of the purpose of the options */
export type MyFunctionOptions = {
  /** The value to handle */
  value: MyValue;
  /** An optional flag */
  isSomething?: boolean;
};

/** Description of the purpose of the result */
export type MyFunctionResult = {
  /** Whether the operation was successful */
  success: boolean;
};

const MY_BEHAVIOR_MAP: Record<
  MyValue,
  (options: MyFunctionOptions) => MyFunctionResult
> = {
  a: ({ isSomething }) => {
    console.log("a", isSomething);
    return { success: true };
  },
  b: ({ isSomething }) => {
    console.log("b", isSomething);
    return { success: true };
  },
  c: ({ isSomething }) => {
    console.log("c", isSomething);
    return { success: true };
  },
};

/** Description of the purpose of the function */
export const handleSomething = (options: MyFunctionOptions): MyFunctionResult =>
  MY_BEHAVIOR_MAP[options.value](options);

// Example usage
const { success } = handleSomething({ value: "a", isSomething: true });
```

### Testing practices

Except when unreasonably complex to test, generally speaking, all feature additions and fixes should include tests. This means that all CLI commands and their options that can be passed should be verified.

Testing both and API feature and the CLI version of it is necessary to ensure that arguments etc. are handled correctly in both places. It may often make sense to do the most exhaustive behavior testing on the API and then ensure the CLI passes all options correctly to this API more simply, but without making too much assumption that the CLI "must be fine" just because the API does.

Sometimes important internals (like the generic `runScripts` function) are tested to ensure the core logic driving features work, even if they aren't exposed publicly, which can help with diagnosing issues and making more focused logic tests that require less boilerplate/setup.
