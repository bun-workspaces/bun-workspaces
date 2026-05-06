import type { BunLockVersionMap } from "../internal/bun/bunLock";
import type { Workspace } from "../workspaces";

/**
 * A version delta for a single workspace's external dependency between
 * two reference points (typically `baseRef` vs `headRef`).
 *
 * `baseVersion`/`headVersion` are `null` when the dep was absent at that
 * side of the comparison (added or removed). When both are non-null and
 * differ, the version was upgraded/downgraded.
 */
export type ExternalDependencyChange = {
  /** The package name */
  name: string;
  /** Whether the dep is dev-only on this workspace */
  dev: boolean;
  /** Version at the base point; `null` if absent */
  baseVersion: string | null;
  /** Version at the head point; `null` if absent */
  headVersion: string | null;
};

export type ExternalDependencyChangesByWorkspace = Map<
  string,
  ExternalDependencyChange[]
>;

/**
 * Given each workspace's declared external deps and lockfile version maps
 * at base vs head, emit per-workspace change entries for any external dep
 * whose resolved version differs (including added/removed).
 *
 * Pure function. No I/O.
 */
export const computeExternalDependencyChanges = ({
  workspaces,
  baseLock,
  headLock,
}: {
  workspaces: Workspace[];
  baseLock: BunLockVersionMap;
  headLock: BunLockVersionMap;
}): ExternalDependencyChangesByWorkspace => {
  const result: ExternalDependencyChangesByWorkspace = new Map();
  for (const workspace of workspaces) {
    const changes: ExternalDependencyChange[] = [];
    for (const { name, dev } of workspace.externalDependencies) {
      const baseVersion = baseLock.get(name) ?? null;
      const headVersion = headLock.get(name) ?? null;
      if (baseVersion === headVersion) continue;
      changes.push({ name, dev, baseVersion, headVersion });
    }
    if (changes.length) result.set(workspace.name, changes);
  }
  return result;
};
