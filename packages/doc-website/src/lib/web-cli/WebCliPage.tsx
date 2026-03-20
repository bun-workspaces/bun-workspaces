import { useCallback } from "react";
import { useLoadApiHealth } from "../service/apiHealth";
import { Terminal, type TerminalProps } from "./terminal/Terminal";
import { useSetWebCliTerminalWidth } from "./util/invokeWebCli";

export const WebCliPage = () => {
  useLoadApiHealth();

  const setTerminalWidth = useSetWebCliTerminalWidth();

  return (
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
  );
};
