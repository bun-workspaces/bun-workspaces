import { useEffect, useRef } from "react";
import { useLocation } from "rspress/runtime";
import Theme, { Link } from "rspress/theme";
import "@fontsource/unifontex";
import packageJson from "../../../bun-workspaces/package.json";
import { Footer } from "../lib/components/Footer";
import { PixelArtImage } from "../lib/util/pixelArt";
import { useLayout } from "../lib/util/useLayout";

const OnPageChange = () => {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location]);
  return null;
};

/** @todo The href-related code is all a pretty terrible hack to get around "/index" being forced as the home link. */
const HomeLink = () => {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute("href", "/");
    }
  }, []);

  return (
    <Link href="/." ref={ref}>
      <div className="nav-title-container">
        <PixelArtImage
          path="/images/png/bwunster_64x70.png"
          style={{
            width: "2rem",
          }}
          small
          height="auto"
        />
        <div className="nav-title-text-container">
          <div className="nav-title-text-container-inner">
            <PixelArtImage
              path="/images/png/bw-title--dark_99x10.png"
              style={{
                width: "7.5rem",
              }}
              height="auto"
              small
              className="dark-only nav-title-text"
              alt="bun-workspaces"
            />
            <PixelArtImage
              path="/images/png/bw-title--light_99x10.png"
              style={{
                width: "7.5rem",
              }}
              height="auto"
              small
              className="light-only nav-title-text"
              alt="bun-workspaces"
            />
          </div>
          <div className="nav-title-version">
            Latest: v{packageJson.version}
          </div>
        </div>
      </div>
    </Link>
  );
};

const Layout = () => {
  useLayout();
  return (
    <>
      <OnPageChange />
      <Theme.Layout navTitle={<HomeLink />} />
      <Footer />
    </>
  );
};

export default {
  ...Theme,
  Layout,
};

export * from "rspress/theme";

// eslint-disable-next-line no-console
console.log("\n" + process.env.BWUNSTER_ASCII);
// eslint-disable-next-line no-console
console.log("bun-workspaces Documentation:", process.env.BUILD_ID);
