/** A non-workspace package the workspace declares (resolved via package.json + bun.lock) */
export type ExternalDependency = {
  /** The package name as it appears in `node_modules` */
  name: string;
  /**
   * True iff the dep was found ONLY in `devDependencies`. False if it appears in
   * `dependencies`, `peerDependencies`, or `optionalDependencies` — those install at
   * runtime so are treated as runtime deps. One entry per unique name.
   */
  dev: boolean;
};

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
  /** Aliases assigned via the `"alias"` field in the workspace's config */
  aliases: string[];
  /** Tags assigned via the `"tags"` field in the workspace's config */
  tags: string[];
  /** Names of workspaces that this workspace depends on */
  dependencies: string[];
  /** Names of workspaces that depend on this workspace */
  dependents: string[];
  /** Non-workspace package dependencies declared by this workspace */
  externalDependencies: ExternalDependency[];
};
