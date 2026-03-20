export type ExampleCommand = {
  name: string;
  description: string;
  command: string;
};

export const EXAMPLE_COMMANDS = [
  {
    name: "List Workspaces",
    description: "List all workspaces",
    command: "bw list-workspaces",
  },
  {
    name: "List Workspaces (JSON)",
    description: "List all workspaces as JSON",
    command: "bw list-workspaces --json --pretty",
  },
  {
    name: "List Scripts",
    description: "List all scripts available with their",
    command: "bw list-scripts",
  },
  {
    name: "Workspace Info (JSON)",
    description: "Show metadata about a workspace as JSON",
    command: "bw workspace-info my-workspace --json",
  },
] satisfies ExampleCommand[];
