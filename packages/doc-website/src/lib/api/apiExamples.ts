import { ENV_VARS_METADATA } from "../config/envVars";

export const CREATE_FS_PROJECT_EXAMPLE = `
import { createFileSystemProject } from "bun-workspaces";

// Root directory defaults to process.cwd()
const defaultProject = createFileSystemProject();

const pathProject = createFileSystemProject({
  rootDirectory: "./path/to/project/root" // relative from process.cwd()
});

// Include the root workspace as a normal workspace (overrides config/env settings)
const projectWithRoot = createFileSystemProject({
  includeRootWorkspace: true,
});

`.trim();

export const CREATE_MEMORY_PROJECT_EXAMPLE = `
import { createMemoryProject } from "bun-workspaces";

const testProject = createMemoryProject({
  rootDirectory: "test-project-directory", // optional
  name: "test-project", // optional
  workspaces: [
    {
      name: "my-test-workspace",
      path: "my/test/workspace/path",
      matchPattern: "my/test/workspace/pattern/*",
      scripts: ["my-test-script"],
      aliases: ["test-alias"],
      dependencies: [],
      dependents: []
    }
  ]
});
`.trim();

export const FIND_WORKSPACE_BY_NAME_EXAMPLE = `
// Find a workspace by its package.json name (or returns null)
const workspace = project.findWorkspaceByName("my-workspace");`.trim();

export const FIND_WORKSPACE_BY_ALIAS_EXAMPLE = `
// Find a workspace by its alias (or returns null)
const workspace = project.findWorkspaceByAlias("my-alias");`.trim();

export const FIND_WORKSPACE_BY_NAME_OR_ALIAS_EXAMPLE = `
// Find a workspace by its package.json name or alias (or returns null)
const workspace = project.findWorkspaceByNameOrAlias("my-workspace");`.trim();

export const FIND_WORKSPACES_BY_PATTERN_EXAMPLE = `
// An array of workspaces whose names match the wildcard pattern
const workspaces = project.findWorkspacesByPattern(
  "my-name-pattern-*",
  "alias:my-alias-*",
  "path:packages/**/*",
);`.trim();

export const LIST_WORKSPACES_WITH_SCRIPT_EXAMPLE = `
// An array of workspaces that have "my-script" 
// in their package.json "scripts" field
const workspaces = project.listWorkspacesWithScript("my-script"));`.trim();

export const MAP_SCRIPTS_TO_WORKSPACES_EXAMPLE = `
// An object mapping all script names to the workspaces 
// that have them in their package.json "scripts" field
const scriptMap = project.mapScriptsToWorkspaces();

// An array of Workspaces
const { workspaces } = scriptMap["my-script"];
`.trim();

export const CREATE_SCRIPT_COMMAND_EXAMPLE = `

// Does not run a script, but provides
// metadata that can be used to do so.
const {
  commandDetails: { command, workingDirectory },
} = project.createScriptCommand({
  scriptName: "my-script",
  workspaceNameOrAlias: "my-workspace",
  method: "cd", // optional, defaults to "cd" (other option "filter")
  args: "--my-appended-args", // optional, append args to the command
});

// A means by which you may actually run the script
const subprocess = Bun.spawn(["sh", "-c", command], {
  cwd: workingDirectory,
});

`.trim();

export const WORKSPACE_EXAMPLE = `
{
  // The name of the workspace from its package.json
  name: "my-workspace",

  // Whether the workspace is the root workspace
  isRoot: false,

  // The relative path to the workspace from the project root
  path: "my/workspace/path",

  // The glob pattern from the root package.json "workspaces" field
  // that this workspace was matched from
  matchPattern: "my/workspace/pattern/*",

  // The scripts available in the workspace's package.json
  scripts: ["my-script"],

  // Aliases defined in workspace configuration (see the Configuration section)
  aliases: ["my-alias"],

  // Names of other workspaces that this workspace depends on
  dependencies: ["my-dependency"],

  // Names of other workspaces that depend on this workspace
  dependents: ["my-dependent"],
}
`.trim();

export const SET_LOG_LEVEL_EXAMPLE = `
import { setLogLevel } from "bun-workspaces";

setLogLevel("debug");
setLogLevel("info" // default
setLogLevel("warn");
setLogLevel("error" // default when NODE_ENV is "test"
setLogLevel("silent");
`.trim();

export const RUN_WORKSPACE_SCRIPT_EXAMPLE = `
const { output, exit } = project.runWorkspaceScript({
  workspaceNameOrAlias: "my-workspace",
  script: "my-script",
  args: "--my --appended --args", // optional, arguments to add to the command
});

// Get a stream of the script subprocess's output
for await (const { chunk, metadata } of output.text()) {
  // console.log(chunk); // The output chunk's content (string)
  // console.log(metadata.streamName); // The output stream, "stdout" or "stderr"
  // console.log(metadata.workspace); // The target Workspace
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

`.trim();

export const RUN_SCRIPT_ACROSS_WORKSPACES_EXAMPLE = `

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
});

// Get a stream of script output
for await (const { chunk, metadata } of output.text()) {
  // console.log(chunk); // the output chunk's content (string)
  // console.log(metadata.streamName); // "stdout" or "stderr"
  // console.log(metadata.workspace); // the Workspace that the output came from
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
`.trim();

export const API_INLINE_NAME_EXAMPLE = `

project.runWorkspaceScript({
  workspaceNameOrAlias: "my-workspace",
  script: "echo 'this is my inline script'",
  // The name will be empty by default
  inline: true,
});

// Pass a name for an inline script
project.runWorkspaceScript({
  workspaceNameOrAlias: "my-workspace",
  script: "echo 'my script: <scriptName>'",
  inline: { scriptName: "my-inline-script" },
});
`.trim();

export const API_QUICKSTART = `
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
  ${RUN_WORKSPACE_SCRIPT_EXAMPLE.split("\n").join("\n  ")}
}

// Run a script in all workspaces that have it in their package.json "scripts" field
const runManyScripts = async () => {
  ${RUN_SCRIPT_ACROSS_WORKSPACES_EXAMPLE.split("\n").join("\n  ")}
}
`.trim();

export const API_PARALLEL_SCRIPTS_EXAMPLE = `
import { createFileSystemProject } from "bun-workspaces";

const project = createFileSystemProject();

// Run in parallel with the default limit.
// Equal to "auto" or value of 
// the root ${ENV_VARS_METADATA.parallelMaxDefault.rootConfigDefaultsKey} 
// or process.env.${ENV_VARS_METADATA.parallelMaxDefault.envVarName}
project.runScriptAcrossWorkspaces({
  script: "my-script",
  parallel: true,
});

// Same result as above
project.runScriptAcrossWorkspaces({
  script: "my-script",
  parallel: { max: "default" },
});

// Run in parallel with the number of available logical CPUs
project.runScriptAcrossWorkspaces({
  script: "my-script",
  parallel: { max: "auto" },
});

// Run in parallel with a max of 50% of the available logical CPUs
project.runScriptAcrossWorkspaces({
  script: "my-script",
  parallel: { max: "50%" },
});

// Run in parallel with no concurrency limit (use with caution)
project.runScriptAcrossWorkspaces({
  script: "my-script",
  parallel: { max: "unbounded" },
});

// Run in parallel with a max of 2 concurrent scripts
project.runScriptAcrossWorkspaces({
  script: "my-script",
  parallel: { max: 2 },
});
`.trim();

export const API_INLINE_SHELL_EXAMPLE = `
import { createFileSystemProject } from "bun-workspaces";

const project = createFileSystemProject();

// This will use the Bun shell, 
// unless the root${ENV_VARS_METADATA.scriptShellDefault.rootConfigDefaultsKey}
// or process.env.${ENV_VARS_METADATA.scriptShellDefault.envVarName} is set to "system"
project.runWorkspaceScript({
  workspaceNameOrAlias: "my-workspace",
  script: "echo 'this is my inline script'",
  inline: true,
});

project.runWorkspaceScript({
  workspaceNameOrAlias: "my-workspace",
  script: "echo 'this is my inline script'",
  // Takes "bun", "system", or "default", same as the CLI --shell option
  inline: { shell: "system" },
});
`.trim();

export const API_ROOT_SELECTOR_EXAMPLE = `
import { createFileSystemProject } from "bun-workspaces";

const project = createFileSystemProject();

project.runScriptAcrossWorkspaces({
  workspacePatterns: ["@root"],
  script: "lint",
});
`.trim();
