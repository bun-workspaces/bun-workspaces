import { useCallback } from "react";
import { useLoadApiHealth } from "../service/apiHealth";
import { Terminal, type TerminalProps } from "./terminal/Terminal";
import { useSetWebCliTerminalWidth } from "./util/invokeWebCli";

export const WebCliPage = () => {
  useLoadApiHealth();

  const setTerminalWidth = useSetWebCliTerminalWidth();

  return (
    <div className="web-cli-page">
      <div className="web-cli-page-header">
        <h1>Web CLI</h1>
        <p>
          Try the CLI right here in your browser!
          <br />
          This uses a demo project you can view in the File Tree below.
        </p>
        <div className="web-cli-mobile-warning">
          Note: You may have a better experience with the Web CLI on desktop.
        </div>
      </div>
      <div className="web-cli-container">
        <Terminal
          onTerminalResize={useCallback<
            NonNullable<TerminalProps["onTerminalResize"]>
          >(
            ({ cols }) => {
              setTerminalWidth(cols);
            },
            [setTerminalWidth]
          )}
        />
      </div>
    </div>
  );
};
