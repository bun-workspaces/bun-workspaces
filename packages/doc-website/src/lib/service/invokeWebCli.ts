import type {
  InvokeCliRequestBody,
  InvokeCliResponseChunk,
} from "bw-web-service-shared";
import { useCallback } from "react";
import { create } from "zustand";
import { useApiHealth } from "./apiHealth";
import { serviceClient } from "./client";

const useInvokeWebCliStore = create<{
  isLoading: boolean;
  result: InvokeCliResponseChunk[];
  setIsLoading: (isLoading: boolean) => void;
  setResult: (result: InvokeCliResponseChunk[]) => void;
  addResultChunk: (chunk: InvokeCliResponseChunk) => void;
}>((set) => ({
  isLoading: false,
  result: [],
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
  const { isHealthy } = useApiHealth();

  const invokeWebCli = useCallback(
    async (request: InvokeCliRequestBody) => {
      if (isLoading || !isHealthy) return;

      setIsLoading(true);
      setResult([]);

      for await (const chunk of serviceClient.invokeWebCli(request)) {
        addResultChunk(chunk);
      }

      setIsLoading(false);
    },
    [addResultChunk, isHealthy, isLoading, setIsLoading, setResult],
  );

  return { invokeWebCli, isLoading, result };
};

export const useInvokeWebCliLoading = () => {
  const isLoading = useInvokeWebCliStore((state) => state.isLoading);
  return isLoading;
};

export const useInvokeWebCliResult = () => {
  const result = useInvokeWebCliStore((state) => state.result);
  return result;
};
