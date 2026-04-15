import throttle from "lodash/throttle";
import { useEffect, useState } from "react";

export const FOOTER_HEIGHT_PX = 50;

export const useLayout = () => {
  const win = typeof window !== "undefined" ? window : null;

  const [windowSize, setWindowSize] = useState({
    width: win?.innerWidth ?? 0,
    height: win?.innerHeight ?? 0,
  });

  useEffect(() => {
    const listener = throttle(() => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }, 100);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  useEffect(() => {
    const rspressNav = document.querySelector(".rspress-nav") as HTMLElement;
    const rspressDoc = document.querySelector(".rspress-doc") as HTMLElement;

    if (rspressDoc && rspressNav) {
      const height =
        windowSize.height - rspressNav.clientHeight - FOOTER_HEIGHT_PX;
      rspressDoc.style.minHeight = `${height}px`;
    }
  }, [windowSize]);
};
