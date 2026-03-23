import { Link } from "rspress/theme";
import { useLoadApiHealth } from "../service/apiHealth";
import { WebCliMain } from "./main/WebCliMain";
import { WebCliNotes } from "./WebCliNotes";

export const WebCliPage = () => {
  useLoadApiHealth();

  return (
    <div className="web-cli-page">
      <div className="web-cli-page-header">
        <h1>Web CLI</h1>
        <p>
          Try the CLI right here in your browser!
          <br />
          This uses a demo{" "}
          <Link className="inline-link" href="/concepts/glossary#project">
            project
          </Link>{" "}
          you can view in the File Tree below.
        </p>
        <div className="web-cli-mobile-warning">
          Note: You may have a better experience with the Web CLI on desktop.
        </div>
      </div>
      <WebCliMain />
      <WebCliNotes />
    </div>
  );
};
