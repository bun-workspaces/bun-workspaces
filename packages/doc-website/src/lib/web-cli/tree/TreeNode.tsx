import { useCallback } from "react";
import type { NodeRendererProps } from "react-arborist";
import { type TreeNodeData } from "./arboristData";
import { useSelectedFile, useSetSelectedFile } from "./selection";

export const TreeNode = ({ node, style }: NodeRendererProps<TreeNodeData>) => {
  const selectedFile = useSelectedFile();
  const setSelectedFile = useSetSelectedFile();

  const onClick = useCallback(() => {
    setSelectedFile(node.data.id);
  }, [setSelectedFile, node.data.id]);

  return node.data.isFile ? (
    <button
      style={style}
      className={`web-cli-tree-node${selectedFile === node.data.id ? " selected" : ""}`}
      onClick={onClick}
    >
      <span>{node.data.name}</span>
    </button>
  ) : (
    <div style={style} className="web-cli-tree-node directory">
      <span>{node.data.name}/</span>
    </div>
  );
};
