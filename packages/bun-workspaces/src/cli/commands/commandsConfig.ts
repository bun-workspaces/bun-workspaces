import { SCRIPT_SHELL_OPTIONS } from "../../runScript/scriptShellOption";

export interface CliCommandConfig {
  command: string;
  isGlobal: boolean;
  aliases: string[] | readonly string[];
  description: string;
  options: Record<
    string,
    {
      flags: string[] | readonly string[];
      description: string;
      values?: string[];
    }
  >;
}

export type CliCommandName = keyof typeof CLI_COMMANDS_CONFIG;

export type CliGlobalCommandName = {
  [K in CliCommandName]: (typeof CLI_COMMANDS_CONFIG)[K] extends {
    isGlobal: true;
  }
    ? K
    : never;
}[CliCommandName];

export type CliProjectCommandName = Exclude<
  CliCommandName,
  CliGlobalCommandName
>;

export const JSON_FLAGS = ["-j", "--json"] as const;

export const CLI_COMMANDS_CONFIG = {
  doctor: {
    command: "doctor",
    isGlobal: true,
    aliases: [],
    description: "Print diagnostic information",
    options: {
      json: {
        flags: JSON_FLAGS,
        description: "Output as JSON",
      },
      pretty: {
        flags: ["-p", "--pretty"],
        description: "Pretty print JSON",
      },
    },
  },
  listWorkspaces: {
    command: "list-workspaces [workspacePatterns...]",
    isGlobal: false,
    aliases: ["ls", "list"],
    description: "List all workspaces",
    options: {
      workspacePatterns: {
        flags: ["-W", "--workspace-patterns <patterns>"],
        description: "Workspace patterns to match, separated by spaces",
      },
      nameOnly: {
        flags: ["-n", "--name-only"],
        description: "Only show workspace names",
      },
      json: {
        flags: JSON_FLAGS,
        description: "Output as JSON",
      },
      pretty: {
        flags: ["-p", "--pretty"],
        description: "Pretty print JSON",
      },
    },
  },
  listScripts: {
    command: "list-scripts",
    isGlobal: false,
    aliases: ["ls-scripts"],
    description: "List all scripts available with their workspaces",
    options: {
      nameOnly: {
        flags: ["-n", "--name-only"],
        description: "Only show script names",
      },
      json: {
        flags: JSON_FLAGS,
        description: "Output as JSON",
      },
      pretty: {
        flags: ["-p", "--pretty"],
        description: "Pretty print JSON",
      },
    },
  },
  workspaceInfo: {
    command: "workspace-info <workspaceName>",
    isGlobal: false,
    aliases: ["info"],
    description: "Show information about a workspace",
    options: {
      json: {
        flags: JSON_FLAGS,
        description: "Output as JSON",
      },
      pretty: {
        flags: ["-p", "--pretty"],
        description: "Pretty print JSON",
      },
    },
  },
  scriptInfo: {
    command: "script-info <script>",
    isGlobal: false,
    aliases: [],
    description: "Show information about a script",
    options: {
      workspacesOnly: {
        flags: ["-w", "--workspaces-only"],
        description: "Only show script's workspace names",
      },
      json: {
        flags: JSON_FLAGS,
        description: "Output as JSON",
      },
      pretty: {
        flags: ["-p", "--pretty"],
        description: "Pretty print JSON",
      },
    },
  },
  runScript: {
    command: "run-script [script] [workspacePatterns...]",
    isGlobal: false,
    aliases: ["run"],
    description:
      'Run a script in all workspaces that have it in their "scripts" field in package.json',
    options: {
      script: {
        flags: ["-S", "--script <script>"],
        description: "The script to run.",
      },
      workspacePatterns: {
        flags: ["-W", "--workspace-patterns <patterns>"],
        description: "Workspace patterns to match, separated by spaces.",
      },
      parallel: {
        flags: ["-P", "--parallel [max]"],
        description:
          "Run the scripts in parallel. Pass an optional number, percentage, or keyword: default | auto | unbounded",
      },
      args: {
        flags: ["-a", "--args <args>"],
        description: "Args to append to the script command",
      },
      noPrefix: {
        flags: ["-N", "--no-prefix"],
        description: "Do not prefix the workspace name to the script output",
      },
      inline: {
        flags: ["-i", "--inline"],
        description:
          "Run the script as an inline command from the workspace directory",
      },
      inlineName: {
        flags: ["-I", "--inline-name <name>"],
        description: "An optional name for the script when --inline is passed",
      },
      shell: {
        flags: ["-s", "--shell <shell>"],
        values: [...SCRIPT_SHELL_OPTIONS, "default"],
        description: `When using --inline, the shell to use to run the script`,
      },
      depOrder: {
        flags: ["-d", "--dep-order"],
        description:
          "Scripts for dependent workspaces run only after their dependencies",
      },
      ignoreDepFailure: {
        flags: ["-c", "--ignore-dep-failure"],
        description:
          "Continue running scripts even if a dependency fails (Only relevant when --dep-order is passed)",
      },
      jsonOutfile: {
        flags: ["-j", "--json-outfile <file>"],
        description: "Output results in a JSON file",
      },
    },
  },
} as const satisfies Record<string, CliCommandConfig>;

export const getCliCommandConfig = (commandName: CliCommandName) =>
  CLI_COMMANDS_CONFIG[commandName];

export const getCliCommandNames = () =>
  Object.keys(CLI_COMMANDS_CONFIG) as CliCommandName[];
