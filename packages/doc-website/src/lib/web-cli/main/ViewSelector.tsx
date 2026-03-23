import { FaTerminal, FaFolderOpen } from "react-icons/fa";

export const ViewSelector = () => {
  return (
    <div className="web-cli-view-selector">
      <button className="web-cli-view-selector-button">
        <FaFolderOpen />
        Project Files
      </button>
      <button className="web-cli-view-selector-button">
        <FaTerminal />
        Terminal
      </button>
    </div>
  );
};
