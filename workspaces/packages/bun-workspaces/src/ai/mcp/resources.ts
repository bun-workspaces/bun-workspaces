import {
  DOC_API,
  DOC_CLI,
  DOC_CONCEPTS,
  DOC_CONFIG,
  DOC_OVERVIEW,
} from "../../internal/generated/aiDocs/docs";
import type { FileSystemProject } from "../../project/implementations/fileSystemProject";
import type { McpServer, ReadResourceResult } from "./core";

const textResource = (uri: string, text: string): ReadResourceResult => ({
  contents: [{ uri, mimeType: "text/markdown", text }],
});

export const registerBwResources = (
  server: McpServer,
  project: FileSystemProject,
): void => {
  server.registerResource(
    {
      uri: "bw://project",
      name: "Project overview",
      description:
        "Overview of this bun-workspaces project: name, root directory, and all workspace metadata.",
      mimeType: "application/json",
    },
    (uri) => ({
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              name: project.name,
              rootDirectory: project.rootDirectory,
              workspaces: project.workspaces,
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    {
      uri: "bw://docs/overview",
      name: "bun-workspaces overview",
      description:
        "What bun-workspaces is, its domain model, and core concepts.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, DOC_OVERVIEW),
  );

  server.registerResource(
    {
      uri: "bw://docs/concepts",
      name: "bun-workspaces concepts",
      description:
        "Workspace patterns, workspace script metadata, and how to run scripts via the CLI.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, DOC_CONCEPTS),
  );

  server.registerResource(
    {
      uri: "bw://docs/cli",
      name: "bun-workspaces CLI reference",
      description:
        "Full CLI command reference with examples, including run-script and all global options.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, DOC_CLI),
  );

  server.registerResource(
    {
      uri: "bw://docs/api",
      name: "bun-workspaces TypeScript API reference",
      description:
        "TypeScript API examples for createFileSystemProject and the Project/Workspace interfaces.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, DOC_API),
  );

  server.registerResource(
    {
      uri: "bw://docs/config",
      name: "bun-workspaces config reference",
      description:
        "Root config (bw.root.jsonc) and workspace config (bw.workspace.jsonc) schema and options.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, DOC_CONFIG),
  );
};
