import { Tree as ReactArboristTree } from "react-arborist";
import { REACT_ARBORIST_DATA } from "./arboristData";
import { TreeContent } from "./TreeContent";
import { TreeNode } from "./TreeNode";

export const Tree = () => {
  return (
    <div className="web-cli-tree-container">
      <div className="web-cli-tree">
        <div className="web-cli-tree-files">
          <ReactArboristTree
            data={REACT_ARBORIST_DATA}
            rowHeight={26}
            width={240}
          >
            {TreeNode}
          </ReactArboristTree>
        </div>
        <TreeContent />
      </div>
      <div className="web-cli-tree-note">
        Note: This is a read-only demo project
      </div>
    </div>
  );
};
