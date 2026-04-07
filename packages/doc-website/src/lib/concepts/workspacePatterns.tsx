import { type WorkspacePatternTarget } from "bun-workspaces/src/workspaces/workspacePattern";
import { Link } from "rspress/theme";
import { SyntaxHighlighter } from "../util/highlight";

export const WORKSPACE_PATTERN_CONTENT: Record<
  WorkspacePatternTarget,
  {
    title: string;
    description: React.ReactNode;
    cliExamples: string[];
  }
> = {
  name: {
    title: "Name",
    description:
      "Match by the workspace name (from package.json). Accepts wildcards.",
    cliExamples: [
      'bw ls name:my-workspace "name:my-workspace-*"',
      `bw run lint "name:my-workspace-*"`,
    ],
  },
  alias: {
    title: "Alias",
    description: (
      <span>
        Match by the{" "}
        <Link href="/concepts/workspace-aliases" className="inline-link">
          workspace alias
        </Link>
        . Accepts wildcards.
      </span>
    ),
    cliExamples: ['bw ls "alias:my-alias-*"', `bw run lint "alias:my-alias-b"`],
  },
  path: {
    title: "Path",
    description:
      "Match by the relative workspace path, with glob syntax supported.",
    cliExamples: [
      'bw ls "path:packages/**/*"',
      `bw run lint "path:packages/**/*"`,
    ],
  },
  tag: {
    title: "Tag",
    description:
      "Match by the tag assigned to the workspace. Tags are defined in a workspace's configuration file.",
    cliExamples: ['bw ls "tag:my-tag"', `bw run lint "tag:my-tag-pattern-*"`],
  },
};

export const WORKSPACE_PATTERN_API_EXAMPLE = `
import { createFileSystemProject } from "bun-workspaces";

const project = createFileSystemProject();

project.findWorkspacesByPattern(
  "name:my-workspace-*", 
  "alias:my-alias-*", 
  "path:packages/**/*",
  "tag:my-tag",
);

project.runScriptAcrossWorkspaces({
  workspacePatterns: [
    "name:my-workspace-*",
    "alias:my-alias-*",
    "path:packages/**/*",
    "tag:my-tag",
  ],
  script: "bun lint",
});
`.trim();

export const WorkspacePatternDoc = ({
  target,
}: {
  target: WorkspacePatternTarget;
}) => {
  return (
    <div className="workspace-pattern-doc">
      <p>{WORKSPACE_PATTERN_CONTENT[target].description}</p>
      <SyntaxHighlighter language="bash">
        {WORKSPACE_PATTERN_CONTENT[target].cliExamples.join("\n")}
      </SyntaxHighlighter>
    </div>
  );
};
