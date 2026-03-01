<a href="https://bunworkspaces.com">
<img src="./packages/doc-website/src/pages/public/images/png/bwunster-bg-banner-wide_3000x900.png" alt="bun-workspaces" width="100%" />
</a>

# bun-workspaces

### [**See Full Documentation Here**: _https://bunworkspaces.com_](https://bunworkspaces.com)

A CLI and API to enhance your monorepo development with Bun's [native workspaces](https://bun.sh/docs/install/workspaces) feature for nested JavaScript/TypeScript packages.

- Works right away, with no boilerplate required 🍔🍴
- Get metadata about your monorepo 🤖
- Run package.json scripts across workspaces 📋
- Run inline [Bun Shell](https://bun.com/docs/runtime/shell) scripts in workspaces ⌨️

This tool lets you decide the complexity of how you use it.
To get started, all you need is a normal project using [Bun's native workspaces](https://bun.sh/docs/install/workspaces) feature for nested JavaScript/TypeScript packages.

Think of this as a power suit you can snap onto native workspaces, rather than another monorepo framework.

Start running some [CLI commands](https://bunworkspaces.com/cli) right away in your repo, or take full advantage of the [scripting API](https://bunworkspaces.com/api) and its features.

## Quick Start

Installation:

```bash
$ # Install to use the API and/or lock your CLI version for your project
$ bun add --dev bun-workspaces
$ # Start using the CLI with or without the installation step
$ bunx bun-workspaces --help
```

Note that you need to run `bun install` in your project for `bun-workspaces` to find your project's workspaces. This is because it reads `bun.lock`. This also means that if you update your workspaces, such as changing their name, you must run `bun install` for the change to reflect.

### CLI

[Full CLI documentation here](https://bunworkspaces.com/cli)

```bash
# You can add this to .bashrc, .zshrc, or similar.
# You can also invoke "bw" in your root package.json scripts.
alias bw="bunx bun-workspaces"

# List all workspaces in your project
bw list-workspaces

# ls is an alias for list-workspaces
bw ls --json --pretty # Output as formatted JSON

# Get info about a workspace
bw workspace-info my-workspace
bw info my-workspace --json --pretty # info is alias for workspace-info

# Get info about a script, such as the workspaces that have it
bw script-info my-script

# Run the lint script for all workspaces
# that have it in their package.json "scripts" field
bw run-script lint

# run is an alias for run-script
bw run lint my-workspace # Run for a single workspace
bw run lint my-workspace-a my-workspace-b # Run for multiple workspaces
bw run lint my-alias-a my-alias-b # Run by alias (set by optional config)

bw run lint "my-workspace-*" # Run for matching workspace names
bw run lint "alias:my-alias-pattern-*" "path:my-glob/**/*" # Use matching specifiers

# A workspace's script will wait until any workspaces it depends on have completed
# Similar to Bun's --filter behavior
bw run lint --dep-order

# Continue running scripts even if a dependency fails
bw run lint --dep-order --ignore-dep-failure

bw run lint --args="--my-appended-args" # Add args to each script call
bw run lint --args="--my-arg=<workspaceName>" # Use the workspace name in args

bw run "bun build" --inline # Run an inline command via the Bun shell

bw run lint --parallel # Run in parallel (default: "auto", the available CPU count)
bw run lint --parallel=2 # Run in parallel with a max of 2 concurrent scripts

# Show usage (you can pass --help to any command)
bw help
bw --help

# Show version
bw --version

# Pass --cwd to any command
bw --cwd=/path/to/your/project ls
bw --cwd=/path/to/your/project run my-script

# Pass --log-level to any command (debug, info, warn, error, or silent)
bw --log-level=silent run my-script
```

### API

[Full API documentation here](https://bunworkspaces.com/api)

```typescript
import { createFileSystemProject } from "bun-workspaces";

// A Project contains the core functionality of bun-workspaces.
// Below defaults to process.cwd() for the project root directory
// Pass { rootDirectory: "path/to/your/project" } to use a different root directory
const project = createFileSystemProject();

// A Workspace that matches the name or alias "my-workspace"
const myWorkspace = project.findWorkspaceByNameOrAlias("my-workspace");

// Array of workspaces whose names match the wildcard pattern
const wildcardWorkspaces = project.findWorkspacesByPattern("my-workspace-*");

// Array of workspaces that have "my-script" in their package.json "scripts"
const workspacesWithScript = project.listWorkspacesWithScript("my-script");

// Run a script in a workspace
const runSingleScript = async () => {
  const { output, exit } = project.runWorkspaceScript({
    workspaceNameOrAlias: "my-workspace",
    script: "my-script",
    args: "--my --appended --args", // optional, arguments to add to the command
  });

  // Get a stream of the script subprocess's output
  for await (const { chunk, metadata } of output.text()) {
    // console.log(chunk); // the content (string)
    // console.log(metadata.streamName); // "stdout" or "stderr"
    // console.log(metadata.workspace); // the workspace that the output came from
  }

  // Get data about the script execution after it exits
  const exitResult = await exit;

  // exitResult.exitCode // The exit code (number)
  // exitResult.signal // The exit signal (string), or null
  // exitResult.success // true if exit code was 0
  // exitResult.startTimeISO // Start time (string)
  // exitResult.endTimeISO // End time (string)
  // exitResult.durationMs // Duration in milliseconds (number)
  // exitResult.metadata.workspace // The target workspace (Workspace)
};

// Run a script in all workspaces that have it in their package.json "scripts" field
const runManyScripts = async () => {
  const { output, summary } = project.runScriptAcrossWorkspaces({
    // Optional. This will run in all matching workspaces that have my-script
    // Accepts same values as the CLI run-script command's workspace patterns
    // When not provided, all workspaces that have the script will be used.
    workspacePatterns: ["my-workspace", "my-name-pattern-*"],

    // Required. The package.json "scripts" field name to run
    script: "my-script",

    // Optional. Arguments to add to the command
    args: "--my --appended --args",

    // Optional. Whether to run the scripts in parallel
    parallel: true,

    // Optional. When true, a workspace's script will wait
    // until any workspaces it depends on have completed
    dependencyOrder: true,

    // Optional. When true and dependencyOrder is true,
    // continue running scripts even if a dependency fails
    ignoreDependencyFailure: true,
  });

  // Get a stream of script output
  for await (const { chunk, metadata } of output.text()) {
    // console.log(chunk); // the content (string)
    // console.log(metadata.streamName); // "stdout" or "stderr"
    // console.log(metadata.workspace); // the workspace that the output came from
  }

  // Get final summary data and script exit details after all scripts have completed
  const summaryResult = await summary;

  // summaryResult.totalCount // Total number of scripts
  // summaryResult.allSuccess // true if all scripts succeeded
  // summaryResult.successCount // Number of scripts that succeeded
  // summaryResult.failureCount // Number of scripts that failed
  // summaryResult.startTimeISO // Start time (string)
  // summaryResult.endTimeISO // End time (string)
  // summaryResult.durationMs // Total duration in milliseconds (number)

  // The exit details of each workspace script
  for (const exitResult of summaryResult.scriptResults) {
    // exitResult.exitCode // The exit code (number)
    // exitResult.signal // The exit signal (string), or null
    // exitResult.success // true if exit code was 0
    // exitResult.startTimeISO // Start time (ISO string)
    // exitResult.endTimeISO // End time (ISO string)
    // exitResult.durationMs // Duration in milliseconds (number)
    // exitResult.metadata.workspace // The target workspace (Workspace)
  }
};
```

_`bun-workspaces` is independent from the [Bun](https://bun.sh) project and is not affiliated with or endorsed by Anthropic. This project aims to enhance the experience of Bun for its users._

Developed By:

<a href="https://smorsic.io" target="_blank" rel="noopener noreferrer">
  <img src="./packages/doc-website/src/pages/public/images/png/smorsic-banner_light_803x300.png" alt="Smorsic Labs logo" width="280" />
</a>
