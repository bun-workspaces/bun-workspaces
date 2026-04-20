import { Link } from "rspress/theme";

const LINKS = {
  home: "/config",
  root: "/config/root",
  workspace: "/config/workspace",
  workspacePatternConfigs: "/config/workspace-pattern-configs",
  envVars: "/config/env-vars",
} as const;

export interface ConfigHeaderProps {
  activeHref: keyof typeof LINKS;
  divider?: boolean;
}

export const ConfigHeader = ({ activeHref, divider }: ConfigHeaderProps) => {
  return (
    <div className="sub-header">
      <div className="sub-header-links">
        <Link
          href={LINKS.home}
          className={activeHref === "home" ? "active" : ""}
        >
          General
        </Link>
        <Link
          href={LINKS.root}
          className={activeHref === "root" ? "active" : ""}
        >
          Root Config
        </Link>
        <Link
          href={LINKS.workspace}
          className={activeHref === "workspace" ? "active" : ""}
        >
          Workspace Config
        </Link>
        <Link
          href={LINKS.workspacePatternConfigs}
          className={activeHref === "workspacePatternConfigs" ? "active" : ""}
        >
          Workspace Pattern Configs
        </Link>
        <Link
          href={LINKS.envVars}
          className={activeHref === "envVars" ? "active" : ""}
        >
          Environment Variables
        </Link>
      </div>
      {divider && <hr className="config-divider" />}
    </div>
  );
};
