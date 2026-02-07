import { Link } from "rspress/theme";
import { RequiredBunVersion } from "../components/RequiredBunVersion";

const LINKS = {
  home: "/api",
  reference: "/api/reference",
  examples: "/api/examples",
} as const;

export interface ApiHeaderProps {
  activeHref: keyof typeof LINKS;
  divider?: boolean;
}

export const ApiHeader = ({ activeHref, divider }: ApiHeaderProps) => {
  return (
    <div className="sub-header">
      <div className="sub-header-links">
        <Link
          href={LINKS.home}
          className={activeHref === "home" ? "active" : ""}
        >
          Quick Start
        </Link>
        <Link
          href={LINKS.reference}
          className={activeHref === "reference" ? "active" : ""}
        >
          Reference
        </Link>
      </div>
      <p className="note" style={{ marginTop: "1rem" }}>
        Install the package via <code>bun add --dev bun-workspaces</code> to use
        the API.
      </p>

      <p className="note" style={{ marginTop: "1rem" }}>
        Note that you need to run <code>bun install</code> in your project for
        <code>bun-workspaces</code> to find your project's workspaces, and you
        likely must run this again after you've updated your workspaces.
      </p>
      <p className="note" style={{ marginTop: "1rem" }}>
        See the{" "}
        <Link href="/concepts/glossary" style={{ color: "var(--rp-c-link)" }}>
          Glossary
        </Link>{" "}
        for more fundamental concepts.
      </p>
      <RequiredBunVersion className="bun-version sub-header-bun-version" />
      {divider && <hr />}
    </div>
  );
};
