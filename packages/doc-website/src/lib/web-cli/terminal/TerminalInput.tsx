import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaTerminal } from "react-icons/fa";
import { parse } from "shell-quote";
import { useApiHealth } from "../../service";
import {
  useAddCommandToHistory,
  useDecrementCommandHistoryIndex,
  useHistoryCommand,
  useHistoryIndex,
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

const parseArgv = (input: string) => {
  const parsed = parse(input);

  const argv: string[] = [];
  const operations: string[] = [];

  for (const entry of parsed) {
    if (typeof entry === "object" && "op" in entry) {
      if (entry.op === "glob") {
        argv.push(entry.pattern);
      } else {
        argv.push(entry.op);
        if (!operations.includes(entry.op)) {
          operations.push(entry.op);
        }
      }
    } else if (typeof entry === "string") {
      argv.push(entry);
    }
  }

  return {
    argv: argv.filter((entry, i) => !(i === 0 && entry.trim() === "bw")),
    operations,
  };
};

const getRandomExampleCommand = (previous?: ExampleCommand) => {
  let newExample = previous;
  while (newExample === previous) {
    newExample =
      EXAMPLE_COMMANDS[Math.floor(Math.random() * EXAMPLE_COMMANDS.length)];
  }
  return newExample ?? EXAMPLE_COMMANDS[0];
};

export const TerminalInput = () => {
  const input = useWebCliInput();
  const setInput = useSetWebCliInput();

  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const resetHistoryIndex = useResetHistoryIndex();
  const historyCommand = useHistoryCommand();
  const incrementHistoryIndex = useIncrementCommandHistoryIndex();
  const decrementHistoryIndex = useDecrementCommandHistoryIndex();
  const historyIndex = useHistoryIndex();
  const addCommandToHistory = useAddCommandToHistory();

  const [placeholderExample, setPlaceholderExample] = useState<ExampleCommand>(
    getRandomExampleCommand()
  );

  const { argv, operations } = useMemo(() => parseArgv(input), [input]);

  useEffect(() => {
    if (input.trim()) return;
    const timeout = setTimeout(() => {
      setPlaceholderExample(getRandomExampleCommand(placeholderExample));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [input, placeholderExample]);

  const { isHealthy, isLoading, error } = useApiHealth();

  const { isLoading: isInvoking, invokeWebCli } = useInvokeWebCli();

  const isError = !!error || (!isLoading && !isHealthy);
  const disabled = !isHealthy || isError || isInvoking;

  useEffect(() => {
    if (historyCommand) {
      setInput(historyCommand);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = inputRef.current?.value.length ?? 0;
        }
      });
    }
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
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        incrementHistoryIndex();
      } else if (e.key === "ArrowDown") {
        decrementHistoryIndex();
        if (historyIndex <= 0) {
          setInput("");
        }
      }
    },
    [incrementHistoryIndex, decrementHistoryIndex, historyIndex, setInput]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (disabled) return;
      if (!input.trim()) return;
      invokeWebCli({
        argv,
      });
      addCommandToHistory(input.trim());
      setInput("");
      inputRef.current?.focus();
    },
    [disabled, invokeWebCli, input, argv, addCommandToHistory, setInput]
  );

  return (
    <div>
      <form
        onSubmit={handleSubmit}
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
            maxLength={200}
            placeholder={` Enter a command (like: ${placeholderExample?.command.replace("bw ", "")})`}
            autoFocus
          />
        )}
        <button
          disabled={disabled || !argv.length}
          type="submit"
          className="web-cli-input-submit"
          ref={submitRef}
        >
          <FaTerminal />
        </button>
      </form>
      <div className="web-cli-input-warning">
        {operations.length > 0 && (
          <>
            Warning: Shell operations like{" "}
            <code>{operations.join(" or ")}</code> are not supported. This only
            passes arguments to <code>bw</code>.
          </>
        )}
      </div>
    </div>
  );
};
