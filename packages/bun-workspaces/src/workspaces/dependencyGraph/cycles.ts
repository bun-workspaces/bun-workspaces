import type { Workspace } from "../workspace";

export type DependencyCycleEdge = { dependency: string; dependent: string };

export const preventDependencyCycles = (
  workspaces: Workspace[],
): { workspaces: Workspace[]; cycles: DependencyCycleEdge[] } => {
  const byName = new Map(workspaces.map((n) => [n.name, n] as const));

  // memo: name -> chains that end at `name`
  const memo = new Map<string, string[][]>();

  // recursion stack in order (root -> ... -> current)
  const stack: string[] = [];
  const inStack = new Set<string>();

  // dedupe cycle edges
  const cyclesKeyed = new Map<string, DependencyCycleEdge>();

  const recordCycleEdge = (dependency: string, dependent: string) => {
    const key = `${dependency}\u0000${dependent}`;
    if (!cyclesKeyed.has(key)) cyclesKeyed.set(key, { dependency, dependent });
  };

  const chainsTo = (name: string): string[][] => {
    const cached = memo.get(name);
    if (cached) return cached;

    stack.push(name);
    inStack.add(name);

    const node = byName.get(name);
    const deps = node?.dependsOn ?? [];

    const result: string[][] = [];

    if (deps.length === 0) {
      memo.set(name, result);
      inStack.delete(name);
      stack.pop();
      return result;
    }

    for (const dep of deps) {
      // Cycle edge: current `name` depends on `dep`, and `dep` is already in the active stack
      if (inStack.has(dep)) {
        recordCycleEdge(dep, name);
        continue;
      }

      // Missing dependency name: treat as a leaf chain [dep, name]
      if (!byName.has(dep)) {
        result.push([dep, name]);
        continue;
      }

      const depChains = chainsTo(dep);

      if (depChains.length === 0) {
        // dep is a leaf => base chain
        result.push([dep, name]);
      } else {
        // extend each dep chain with current dependent
        for (const c of depChains) result.push([...c, name]);
      }
    }

    memo.set(name, result);
    inStack.delete(name);
    stack.pop();
    return result;
  };

  workspaces.forEach((workspace) => {
    chainsTo(workspace.name);
  });

  workspaces = workspaces.map((workspace) => ({ ...workspace }));

  const cycles = [...cyclesKeyed.values()];

  for (const cycle of cycles) {
    const { dependency, dependent } = cycle;
    const dependencyWorkspace = workspaces.find((w) => w.name === dependency);
    const dependentWorkspace = workspaces.find((w) => w.name === dependent);
    if (dependencyWorkspace) {
      dependencyWorkspace.dependsOn = dependencyWorkspace.dependsOn.filter(
        (d) => d !== dependent,
      );
    }
    if (dependentWorkspace) {
      dependentWorkspace.dependents = dependentWorkspace.dependents.filter(
        (d) => d !== dependency,
      );
    }
  }

  return { workspaces, cycles };
};
