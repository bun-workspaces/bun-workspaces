import { useEffect } from "react";
import { create } from "zustand";
import { useOnMount } from "../util/useOnMount";
import { serviceClient } from "./client";

const useHealthStore = create<{
  isPending: boolean;
  isLoading: boolean;
  isHealthy: boolean;
  error: Error | null;
  setIsPending: (isPending: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsHealthy: (isHealthy: boolean) => void;
  setError: (error: Error | null) => void;
}>((set) => ({
  isPending: true,
  isLoading: false,
  isHealthy: false,
  error: null,
  setIsPending: (isPending) => set({ isPending }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsHealthy: (isHealthy) => set({ isHealthy }),
  setError: (error) => set({ error }),
}));

export const useLoadApiHealth = () => {
  const isHealthy = useHealthStore((state) => state.isHealthy);
  const error = useHealthStore((state) => state.error);
  const isLoading = useHealthStore((state) => state.isLoading);
  const setIsPending = useHealthStore((state) => state.setIsPending);
  const setIsHealthy = useHealthStore((state) => state.setIsHealthy);
  const setError = useHealthStore((state) => state.setError);
  const setIsLoading = useHealthStore((state) => state.setIsLoading);

  useOnMount(() => {
    if (isLoading || isHealthy || error) return;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await serviceClient.health();
        const newIsHealthy = response.status === "ok";
        setIsHealthy(newIsHealthy);
        if (!newIsHealthy) {
          // eslint-disable-next-line no-console
          console.error("API is not healthy", response);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading API health", error);
        setError(error as Error);
      } finally {
        setIsPending(false);
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
};

export const useApiHealth = () => {
  const isPending = useHealthStore((state) => state.isPending);
  const isLoading = useHealthStore((state) => state.isLoading);
  const isHealthy = useHealthStore((state) => state.isHealthy);
  const error = useHealthStore((state) => state.error);

  return { isLoading: isPending || isLoading, isHealthy, error };
};
