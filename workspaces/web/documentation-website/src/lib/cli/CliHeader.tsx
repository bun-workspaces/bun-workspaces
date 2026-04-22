import { Link } from "rspress/theme";
import { RequiredBunVersion } from "../components/RequiredBunVersion";

const LINKS = {
  home: "/cli",
  globalOptions: "/cli/global-options",
  commands: "/cli/commands",
  examples: "/cli/examples",
} as const;

export interface CliHeaderProps {
  activeHref: keyof typeof LINKS;
}

export const CliHeader = ({ activeHref }: CliHeaderProps) => {
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
          href={LINKS.globalOptions}
          className={activeHref === "globalOptions" ? "active" : ""}
        >
          Global Options
        </Link>
        <Link
          href={LINKS.commands}
          className={activeHref === "commands" ? "active" : ""}
        >
          Commands
        </Link>
      </div>
      <p className="note" style={{ marginTop: "1rem" }}>
        Try the{" "}
        <Link className="inline-link" href="/web-cli">
          Web CLI demo
        </Link>{" "}
        right here in your browser!
      </p>
      <h4 style={{ marginTop: "1rem" }}>Running the CLI</h4>
      <p className="note" style={{ marginTop: "1rem" }}>
        Run the CLI via <code>bunx bun-workspaces</code> or alias it to{" "}
        <code>bw</code>, such as via <code>alias bw="bunx bun-workspaces"</code>
        , which can be placed in your shell configuration file, like{" "}
        <code>.bashrc</code>, <code>.zshrc</code>, or similar.
      </p>
      <p className="note" style={{ marginTop: "1rem" }}>
        You can also invoke <code>bw</code> in your root{" "}
        <code>package.json</code> scripts directly even without an alias set up.
      </p>
      <p className="note" style={{ marginTop: "1rem" }}>
        Examples use an implied <code>bw</code> alias for brevity instead of{" "}
        <code>bunx bun-workspaces</code>.
      </p>
      <h4 style={{ marginTop: "1rem" }}>Ensuring Workspace Data is Current</h4>
      <p className="note" style={{ marginTop: "1rem" }}>
        Note that you need to run <code>bun install</code> in your project for
        <code>bun-workspaces</code> to find your project's workspaces, and you
        likely must run this again after you've updated your workspaces, such as
        changing a name or adding/removing one. This is because{" "}
        <code>bun.lock</code> lists workspaces and is used as the source of
        truth.
      </p>
      <RequiredBunVersion className="bun-version sub-header-bun-version" />
      <hr />
    </div>
  );
};
