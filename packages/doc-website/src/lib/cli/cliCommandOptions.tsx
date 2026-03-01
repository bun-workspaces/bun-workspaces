import {
  getCliCommandConfig,
  type CliCommandConfig,
  type CliCommandName,
} from "bun-workspaces/src/cli";
import type { CliCommandContent, CliCommandInfo } from "./cliOption";

const defineCommandContent = (
  commandName: CliCommandName,
  factory: (
    optionConfig: CliCommandConfig,
  ) => Omit<CliCommandInfo, "commandName">,
): CliCommandContent => {
  const config = getCliCommandConfig(commandName);
  const content = factory(config);

  const exampleLines = content.examples.filter(
    (example) => example.trim() && !example.match(/^\s*#/),
  );

  const getMainFlag = (flags: string[]) => {
    const longFlag = flags[flags.length - 1];
    return longFlag.trim().split(" ")[0];
  };

  for (const option of Object.values(config.options)) {
    if (
      !exampleLines.find((line) => line.includes(getMainFlag(option.flags)))
    ) {
      throw new Error(
        `Expected an example to include ${getMainFlag(option.flags)}`,
      );
    }
  }

  if (
    !exampleLines.find((line) => {
      // line that uses no flags
      return Object.values(config.options).every(
        (option) => !line.includes(getMainFlag(option.flags)),
      );
    })
  ) {
    throw new Error(`Expected an example to use no flags`);
  }

  return {
    commandName,
    ...config,
    ...factory(config),
  };
};

const CLI_PROJECT_COMMANDS_CONTENT = {
  listWorkspaces: defineCommandContent("listWorkspaces", () => ({
    title: "List Workspaces",
    description:
      'List all workspaces found in the project. This uses the "workspaces" field in your root package.json file.',
    examples: [
      "# Default output. Shows metadata about workspaces found in all workspaces",
      `bw list-workspaces`,
      "",
      "# Output only the list of workspace names",
      `bw list-workspaces --name-only`,
      "",
      "# Output as JSON",
      `bw list-workspaces --json`,
      "",
      "# Output as formatted JSON",
      `bw list-workspaces --json --pretty`,
      "",
      "# Filter workspaces by pattern",
      `bw list-workspaces my-workspace "my-name-pattern-*" "path:packages/**/*"`,
      "",
      "# Filter workspaces by pattern using the --workspace-patterns|-W option",
      `bw list-workspaces --workspace-patterns="my-name-pattern-* path:packages/**/*"`,
    ],
  })),
  listScripts: defineCommandContent("listScripts", () => ({
    title: "List Scripts",
    description: "List all scripts available with their workspaces",
    examples: [
      "# Default output. Shows metadata about scripts found in all workspaces",
      `bw list-scripts`,
      "",
      "# Output only the list of script names",
      `bw list-scripts --name-only`,
      "",
      "# Output as JSON",
      `bw list-scripts --json`,
      "",
      "# Output as formatted JSON",
      `bw list-scripts --json --pretty`,
    ],
  })),
  workspaceInfo: defineCommandContent("workspaceInfo", () => ({
    title: "Workspace Info",
    description: "Show metadata about a workspace",
    examples: [
      "# Default output. Shows metadata about a workspace",
      `bw workspace-info my-workspace`,
      "",
      "# Output as JSON",
      `bw workspace-info --json`,
      "",
      "# Output as formatted JSON",
      `bw workspace-info --json --pretty`,
    ],
  })),
  scriptInfo: defineCommandContent("scriptInfo", () => ({
    title: "Script Info",
    description: "Show metadata about a script",
    examples: [
      "# Default output. Shows metadata about a script",
      `bw script-info my-script`,
      "",
      "# Output only the list of workspaces that have the script",
      `bw script-info my-script --workspaces-only`,
      "",
      "# Output as JSON",
      `bw script-info --json`,
      "",
      "# Output as formatted JSON",
      `bw script-info --json --pretty`,
    ],
  })),
  runScript: defineCommandContent("runScript", () => ({
    title: "Run Script",
    description:
      'Run a script in all workspaces that have it in their "scripts" field in their respective package.json, or run an inline script.',
    examples: [
      '# Run my-script for all workspaces with it in their package.json "scripts" field',
      `bw run my-script`,
      "",
      "# Run a script for a specific workspace",
      `bw run my-script my-workspace`,
      "",
      "# Run a script for multiple workspaces",
      `bw run my-script my-workspace-a my-workspace-b`,
      "",
      "# Run a script for workspaces using alias",
      `bw run my-script my-alias`,
      "",
      "# Run a script for workspaces using wildcard that matches the workspace name",
      `bw run my-script "my-workspace-*"`,
      "",
      "# Run a script for workspaces using matching specifiers",
      `bw run my-script "alias:my-alias-*" "path:packages/**/*"`,
      "",
      "# Run a script for workspaces using the --workspace-patterns|-W option",
      `bw run my-script --workspace-patterns="my-workspace-* my-workspace-b"`,
      "",
      "# Run a script for workspaces using the --script|-S option",
      `bw run "my-workspace-*" my-workspace-b --script=my-script`,
      "",
      "# A workspace's script will wait until any workspaces it depends on have completed",
      `bw run my-script --dep-order`,
      "",
      "# Continue running scripts even if a dependency fails",
      `bw run my-script --dep-order --ignore-dep-failure`,
      "",
      "# Run a scripts in parallel (logs are prefixed with the workspace name by default)",
      `bw run my-script --parallel`,
      "",
      "# Run a scripts in parallel with a max of 2 concurrent scripts",
      `bw run my-script --parallel=2`,
      "",
      "# Run a scripts in parallel with a max of 50% of the available CPUs",
      `bw run my-script --parallel=50%`,
      "",
      "# Run a scripts in parallel with no concurrency limit (use with caution)",
      `bw run my-script --parallel=unbounded`,
      "",
      "# Disable the workspace name prefix in the script output",
      `bw run my-script --no-prefix`,
      "",
      "# Run an inline command from each workspace's directory",
      `bw run "echo 'this is my inline script for <workspaceName>'" --inline`,
      "",
      "# By default, the Bun shell executes inline scripts.",
      "# --shell=system uses the native shell (sh in Unix, cmd in Windows)",
      `bw run "echo 'this is my native inline script'" --inline --shell=system`,
      "",
      "# Set a name for an inline command",
      `bw run "echo 'this is my inline script'" --inline --inline-name=my-inline-script`,
      "",
      "# Append args to each script call",
      `bw run my-script --args="--my args"`,
      "",
      "# Append args to each script call using the -- terminator",
      `bw run my-script -- --my-arg --another-arg`,
      "",
      "# Use the workspace name in args",
      `bw run my-script --args="--my --arg=<workspaceName>"`,
      "",
      "# Output results to a JSON file",
      `bw run my-script --json-outfile=results.json`,
    ],
  })),
  doctor: defineCommandContent("doctor", () => ({
    title: "Doctor",
    description: "Print diagnostic information for bug reports etc.",
    examples: [
      "bw doctor",
      "bw doctor --json --pretty # Output as formatted JSON",
    ],
  })),
} as const satisfies Record<CliCommandName, CliCommandContent>;

export const getCliCommandContent = (commandName: CliCommandName) =>
  CLI_PROJECT_COMMANDS_CONTENT[commandName];

export const getCliCommandsContent = () =>
  Object.values(CLI_PROJECT_COMMANDS_CONTENT);
