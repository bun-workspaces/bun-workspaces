import { useCallback, useEffect, useRef, useState } from "react";
import { FaTerminal } from "react-icons/fa";
import { useApiHealth } from "../../service";
import {
  useDecrementCommandHistoryIndex,
  useHistoryCommand,
  useIncrementCommandHistoryIndex,
  useResetHistoryIndex,
} from "../util/commandHistory";
import {
  useInvokeWebCli,
  useSetWebCliInput,
  useWebCliInput,
} from "../util/invokeWebCli";
import { EXAMPLE_COMMANDS, type ExampleCommand } from "./exampleCommands";

export const WEB_CLI_INPUT_ID = "web-cli-input";

export const TerminalInput = () => {
  const input = useWebCliInput();
  const setInput = useSetWebCliInput();

  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const resetHistoryIndex = useResetHistoryIndex();
  const historyCommand = useHistoryCommand();
  const incrementHistoryIndex = useIncrementCommandHistoryIndex();
  const decrementHistoryIndex = useDecrementCommandHistoryIndex();

  const [placeholderExample, setPlaceholderExample] = useState<ExampleCommand>(
    EXAMPLE_COMMANDS[0]
  );

  useEffect(() => {
    const example =
      EXAMPLE_COMMANDS[Math.floor(Math.random() * EXAMPLE_COMMANDS.length)];
    setTimeout(() => {
      setPlaceholderExample(example);
    }, 4000);
  }, []);

  const { isHealthy, isLoading, error } = useApiHealth();

  const { isLoading: isInvoking, invokeWebCli } = useInvokeWebCli();

  const isError = !!error || (!isLoading && !isHealthy);
  const disabled = !isHealthy || isError || isInvoking;

  useEffect(() => {
    setInput(historyCommand?.join(" ") ?? "");
  }, [historyCommand, setInput]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
      resetHistoryIndex();
    },
    [resetHistoryIndex, setInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        incrementHistoryIndex();
      } else if (e.key === "ArrowDown") {
        decrementHistoryIndex();
      }
    },
    [incrementHistoryIndex, decrementHistoryIndex]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        if (!input.trim()) return;
        invokeWebCli({
          argv: input.split(/\s+/).filter(Boolean),
        });
        setInput("");
        inputRef.current?.focus();
      }}
      className="web-cli-input-form"
      onClick={(e) => {
        if (
          (e.target as HTMLElement) !== inputRef.current &&
          (e.target as HTMLElement) !== submitRef.current &&
          !submitRef.current?.contains(e.target as Node)
        ) {
          inputRef.current?.focus();
        }
      }}
    >
      <span className="web-cli-input-label">$ bw</span>
      {isError ? (
        <div className="web-cli-input-error">
          Something went wrong! Try reloading or try again later. <br />
          Report recurring issues on{" "}
          <a
            href="https://github.com/bun-workspaces/bun-workspaces"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      ) : (
        <input
          ref={inputRef}
          className="web-cli-input"
          id={WEB_CLI_INPUT_ID}
          type="text"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          placeholder={` Enter a command (like: ${placeholderExample?.command.replace("bw ", "")})`}
          autoFocus
        />
      )}
      <button
        disabled={disabled || !input.trim()}
        type="submit"
        className="web-cli-input-submit"
        ref={submitRef}
      >
        <FaTerminal />
      </button>
    </form>
  );
};
