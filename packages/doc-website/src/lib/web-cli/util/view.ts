import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BUILD_ID } from "../../util/env";

const useViewStore = create<{
  view: "terminal" | "tree";
  setView: (view: "terminal" | "tree") => void;
}>()(
  persist(
    (set) => ({
      view: "tree",
      setView: (view) => set({ view }),
    }),
    {
      name: "bw-view",
      storage: createJSONStorage(() => sessionStorage),
      version: BUILD_ID
        ? parseInt(BUILD_ID, 36)
        : Math.floor(Math.random() * 10000),
    },
  ),
);

export const useView = () => {
  return useViewStore((state) => state.view);
};

export const useSetView = () => {
  return useViewStore((state) => state.setView);
};
