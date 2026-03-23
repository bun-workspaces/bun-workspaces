import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BUILD_ID } from "../../util/env";

const useSelection = create<{
  selectedFile: string;
  setSelectedFile: (selectedFile: string) => void;
}>()(
  persist(
    (set) => ({
      selectedFile: "package.json",
      setSelectedFile: (selectedFile) => set({ selectedFile }),
    }),
    {
      name: "bw-selection",
      storage: createJSONStorage(() => sessionStorage),
      version: BUILD_ID
        ? parseInt(BUILD_ID, 36)
        : Math.floor(Math.random() * 10000),
    },
  ),
);

export const useSelectedFile = () => {
  return useSelection((state) => state.selectedFile);
};

export const useSetSelectedFile = () => {
  return useSelection((state) => state.setSelectedFile);
};
