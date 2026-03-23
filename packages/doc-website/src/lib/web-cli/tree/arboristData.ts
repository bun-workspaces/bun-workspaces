import { demoProject, type DemoProjectFile } from "bw-web-service-shared";
import { type SimpleTreeData } from "react-arborist";

type BuilderNode = {
  id: string;
  name: string;
  children: Map<string, BuilderNode>;
  isFile: boolean;
};

const compareTreeNodes = (a: BuilderNode, b: BuilderNode): number => {
  if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
  return a.name.localeCompare(b.name);
};

const builderMapToArboristNodes = (
  map: Map<string, BuilderNode>,
): SimpleTreeData[] =>
  [...map.values()].sort(compareTreeNodes).map((node) => {
    const children = builderMapToArboristNodes(node.children);
    if (children.length === 0) {
      return { id: node.id, name: node.name };
    }
    return { id: node.id, name: node.name, children };
  });

/** Turn flat demo project files into a nested tree for react-arborist. */
export const demoProjectFilesToArboristTree = (
  files: readonly DemoProjectFile[],
): SimpleTreeData[] => {
  const root = new Map<string, BuilderNode>();

  for (const file of files) {
    const segments = file.relativePath.split("/").filter((s) => s.length > 0);
    if (segments.length === 0) continue;

    let pathAcc = "";
    let level = root;

    for (let i = 0; i < segments.length; i++) {
      const name = segments[i]!;
      pathAcc = pathAcc ? `${pathAcc}/${name}` : name;
      const isLast = i === segments.length - 1;

      let node = level.get(name);
      if (!node) {
        node = {
          id: pathAcc,
          name,
          children: new Map(),
          isFile: isLast,
        };
        level.set(name, node);
      } else if (isLast) {
        node.isFile = true;
      }

      if (!isLast) {
        level = node.children;
      }
    }
  }

  return builderMapToArboristNodes(root);
};

export const REACT_ARBORIST_DATA = demoProjectFilesToArboristTree(
  demoProject.files,
);
