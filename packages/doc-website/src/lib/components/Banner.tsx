import { useState } from "react";
import { FaXmark, FaMugHot, FaGithub, FaStar } from "react-icons/fa6";
import { Link } from "rspress/theme";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useOnMount } from "../util/useOnMount";

const useClosed = create<{
  isClosed: boolean;
  setIsClosed: (isClosed: boolean) => void;
}>()((set) => ({
  isClosed: true,
  setIsClosed: (isClosed) => set({ isClosed }),
}));

const useDismissed = create<{
  isDismissed: boolean;
  setIsDismissed: (isClosed: boolean) => void;
}>()(
  persist(
    (set) => ({
      isDismissed: false,
      setIsDismissed: (isDismissed) => set({ isDismissed }),
    }),
    {
      name: "banner",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

export const Banner = () => {
  const isClosed = useClosed((state) => state.isClosed);
  const setIsClosed = useClosed((state) => state.setIsClosed);
  const isDismissed = useDismissed((state) => state.isDismissed);
  const setIsDismissed = useDismissed((state) => state.setIsDismissed);

  const isOpen = !isClosed && !isDismissed;

  useOnMount(() => {
    setIsClosed(false);
  });

  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="banner">
      <div>
        Hi, I'm Scott, the solo creator and maintainer of this project. I try my
        best to be responsive to users and keep about a weekly release cadence,
        with up-to-date tests and docs right away for all changes.
      </div>
      <div>
        This is my favorite project, but it has all been for free so far, so if
        this tool is useful for you, or you wish to see it continue to grow,
        consider supporting:
        <span className="banner-links">
          <Link
            className="banner-link"
            href="https://github.com/sponsors/bun-workspaces"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
            GitHub Sponsors
          </Link>
          <Link
            className="banner-link"
            href="https://www.buymeacoffee.com/scottmorse"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaMugHot />
            Buy Me a Coffee
          </Link>
        </span>
      </div>
      <div>
        If you're a fan but can't donate, no problem! Consider giving it a{" "}
        <Link
          className="inline-link star-link"
          href="https://github.com/bun-workspaces/bun-workspaces"
        >
          <FaStar />
          star
        </Link>
        !
      </div>
      <div className="banner-actions">
        <div className="dont-show-again-container">
          <input
            id="dontShowAgain"
            type="checkbox"
            className="banner-checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <label htmlFor="dontShowAgain">Don't show again</label>
        </div>
        <button
          className="banner-close"
          onClick={() => {
            setIsClosed(true);
            if (dontShowAgain) {
              setIsDismissed(true);
            }
          }}
        >
          <FaXmark />
          Close
        </button>
      </div>
    </div>
  );
};
