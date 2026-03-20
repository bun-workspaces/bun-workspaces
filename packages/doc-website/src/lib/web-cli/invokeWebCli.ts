import type {
  InvokeCliRequestBody,
  InvokeCliResponseChunk,
} from "bw-web-service-shared";
import { useCallback } from "react";
import { create } from "zustand";
import { useApiHealth, serviceClient } from "../service";

export const DEFAULT_TERMINAL_WIDTH = 80;

const useInvokeWebCliStore = create<{
  isLoading: boolean;
  result: InvokeCliResponseChunk[];
  input: string;
  terminalWidth: number;
  setTerminalWidth: (terminalWidth: number) => void;
  setInput: (input: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setResult: (result: InvokeCliResponseChunk[]) => void;
  addResultChunk: (chunk: InvokeCliResponseChunk) => void;
}>((set) => ({
  isLoading: false,
  result: [],
  input: "",
  terminalWidth: DEFAULT_TERMINAL_WIDTH,
  setTerminalWidth: (terminalWidth) => set({ terminalWidth }),
  setInput: (input) => set({ input }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setResult: (result) => set({ result }),
  addResultChunk: (chunk) =>
    set((state) => ({ result: [...state.result, chunk] })),
}));

export const useInvokeWebCli = () => {
  const isLoading = useInvokeWebCliStore((state) => state.isLoading);
  const result = useInvokeWebCliStore((state) => state.result);
  const setIsLoading = useInvokeWebCliStore((state) => state.setIsLoading);
  const setResult = useInvokeWebCliStore((state) => state.setResult);
  const addResultChunk = useInvokeWebCliStore((state) => state.addResultChunk);
  const terminalWidth = useInvokeWebCliStore((state) => state.terminalWidth);
  const { isHealthy } = useApiHealth();

  const invokeWebCli = useCallback(
    async (request: Omit<InvokeCliRequestBody, "terminalWidth">) => {
      if (isLoading || !isHealthy) return;

      setIsLoading(true);
      setResult([]);

      for await (const chunk of serviceClient.invokeWebCli({
        ...request,
        terminalWidth,
      })) {
        addResultChunk(chunk);
      }

      setIsLoading(false);
    },
    [addResultChunk, isHealthy, isLoading, setIsLoading, setResult],
  );

  return { invokeWebCli, isLoading, result };
};

export const useWebCliLoading = () =>
  useInvokeWebCliStore((state) => state.isLoading);

export const useWebCliResult = () =>
  useInvokeWebCliStore((state) => state.result);

export const useWebCliInput = () =>
  useInvokeWebCliStore((state) => state.input);

export const useSetWebCliInput = () =>
  useInvokeWebCliStore((state) => state.setInput);

export const useWebCliTerminalWidth = () =>
  useInvokeWebCliStore((state) => state.terminalWidth);

export const useSetWebCliTerminalWidth = () =>
  useInvokeWebCliStore((state) => state.setTerminalWidth);
