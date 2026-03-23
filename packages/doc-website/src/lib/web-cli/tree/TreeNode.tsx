import { useCallback } from "react";
import type { NodeRendererProps, SimpleTreeData } from "react-arborist";
import { useSelectedFile, useSetSelectedFile } from "./selection";

export const TreeNode = ({
  node,
  style,
}: NodeRendererProps<SimpleTreeData>) => {
  const selectedFile = useSelectedFile();
  const setSelectedFile = useSetSelectedFile();

  const onClick = useCallback(() => {
    setSelectedFile(node.data.id);
  }, [setSelectedFile, node.data.id]);

  return (
    <button
      style={style}
      className={`web-cli-tree-node ${selectedFile === node.data.id ? "selected" : ""}`}
      onClick={onClick}
    >
      <div>{node.data.name}</div>
    </button>
  );
};
