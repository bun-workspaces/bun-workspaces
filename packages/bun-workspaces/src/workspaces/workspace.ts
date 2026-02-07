/** Metadata about a nested package within a Bun monorepo */
export type Workspace = {
  /** The name of the workspace from its `package.json` */
  name: string;
  /** Whether the workspace is the root workspace */
  isRoot: boolean;
  /** The relative path to the workspace from the root `package.json` */
  path: string;
  /** The pattern from `"workspaces"` in the root `package.json`that this workspace was matched from*/
  matchPattern: string;
  /** The scripts available in package.json */
  scripts: string[];
  /** Aliases assigned to the workspace via the `"workspaceAliases"` field in the config */
  aliases: string[];
  /** Names of workspaces that this workspace depends on */
  dependencies: string[];
  /** Names of workspaces that depend on this workspace */
  dependents: string[];
};
