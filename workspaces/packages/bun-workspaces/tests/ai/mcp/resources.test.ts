import { afterEach, describe, expect, test } from "bun:test";
import { createMcpServer } from "../../../src/ai/mcp/core/server";
import { createMemoryTransport } from "../../../src/ai/mcp/core/transport";
import { registerBwResources } from "../../../src/ai/mcp/resources";
import { setServerWorkingDirectory } from "../../../src/ai/mcp/serverState";
import { getProjectRoot } from "../../fixtures/testProjects";

afterEach(() => setServerWorkingDirectory(null));

const setupServer = (withProject = true) => {
  if (withProject) {
    setServerWorkingDirectory(getProjectRoot("fullProject"));
  }
  const server = createMcpServer({ name: "bun-workspaces", version: "0.0.0" });
  registerBwResources(server);
  return server;
};

const readResource = async (uri: string, withProject = true) => {
  const server = setupServer(withProject);
  const transport = createMemoryTransport([
    { jsonrpc: "2.0", id: 1, method: "resources/read", params: { uri } },
  ]);
  await server.start(transport);
  const response = transport.sent[0] as {
    result?: { contents: { uri: string; mimeType: string; text: string }[] };
    error?: { code: number; message: string };
  };
  return response;
};

const listResources = async () => {
  const server = setupServer();
  const transport = createMemoryTransport([
    { jsonrpc: "2.0", id: 1, method: "resources/list", params: {} },
  ]);
  await server.start(transport);
  return (
    transport.sent[0] as {
      result: { resources: { uri: string; name: string; mimeType?: string }[] };
    }
  ).result.resources;
};

describe("bw MCP resources", () => {
  describe("resources/list", () => {
    test("lists all 6 bw resources", async () => {
      const resources = await listResources();
      const uris = resources.map((r) => r.uri);
      expect(uris).toEqual([
        "bw://project",
        "bw://docs/overview",
        "bw://docs/concepts",
        "bw://docs/cli",
        "bw://docs/api",
        "bw://docs/config",
      ]);
    });

    test("bw://project has application/json mimeType", async () => {
      const resources = await listResources();
      const project = resources.find((r) => r.uri === "bw://project");
      expect(project?.mimeType).toBe("application/json");
    });

    test("doc resources have text/markdown mimeType", async () => {
      const resources = await listResources();
      const docResources = resources.filter((r) =>
        r.uri.startsWith("bw://docs/"),
      );
      for (const r of docResources) {
        expect(r.mimeType).toBe("text/markdown");
      }
    });
  });

  describe("bw://project", () => {
    test("returns project JSON with workspaces", async () => {
      const response = await readResource("bw://project");
      expect(response.error).toBeUndefined();
      const content = response.result!.contents[0];
      expect(content.uri).toBe("bw://project");
      expect(content.mimeType).toBe("application/json");
      const projectData = JSON.parse(content.text) as {
        available: boolean;
        name: string;
        rootDirectory: string;
        workspaces: { name: string }[];
      };
      expect(projectData.available).toBe(true);
      expect(typeof projectData.name).toBe("string");
      expect(typeof projectData.rootDirectory).toBe("string");
      expect(projectData.workspaces.map((w) => w.name)).toEqual([
        "application-a",
        "application-b",
        "library-a",
        "library-b",
        "library-c",
      ]);
    });

    test("returns available: false without a project", async () => {
      const response = await readResource("bw://project", false);
      expect(response.error).toBeUndefined();
      const content = response.result!.contents[0];
      expect(content.mimeType).toBe("application/json");
      const data = JSON.parse(content.text) as {
        available: boolean;
        message: string;
      };
      expect(data.available).toBe(false);
      expect(typeof data.message).toBe("string");
    });
  });

  describe("doc resources", () => {
    const DOC_RESOURCES = [
      "bw://docs/overview",
      "bw://docs/concepts",
      "bw://docs/cli",
      "bw://docs/api",
      "bw://docs/config",
    ] as const;

    for (const uri of DOC_RESOURCES) {
      test(`${uri} returns non-empty markdown content`, async () => {
        const response = await readResource(uri);
        expect(response.error).toBeUndefined();
        const content = response.result!.contents[0];
        expect(content.uri).toBe(uri);
        expect(content.mimeType).toBe("text/markdown");
        expect(content.text.length).toBeGreaterThan(0);
      });
    }

    test("bw://docs/cli contains run-script examples", async () => {
      const response = await readResource("bw://docs/cli");
      expect(response.result!.contents[0].text).toContain("run");
    });

    test("bw://docs/overview mentions bun-workspaces", async () => {
      const response = await readResource("bw://docs/overview");
      expect(response.result!.contents[0].text).toContain("bun-workspaces");
    });

    test("bw://docs/config mentions bw.root.jsonc", async () => {
      const response = await readResource("bw://docs/config");
      expect(response.result!.contents[0].text).toContain("bw.root.jsonc");
    });
  });
});
