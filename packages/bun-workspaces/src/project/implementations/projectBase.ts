import path from "path";
import { validateCurrentBunVersion } from "../../internal/bun";
import { validateJSType } from "../../internal/core";
import { logger } from "../../internal/logger";
import { createWorkspaceScriptCommand } from "../../runScript";
import { sortWorkspaces, type Workspace } from "../../workspaces";
import { matchWorkspacesByPatterns } from "../../workspaces/workspacePattern";
import { PROJECT_ERRORS } from "../errors";
import type {
  CreateProjectScriptCommandOptions,
  CreateProjectScriptCommandResult,
  Project,
  ProjectConfig,
  WorkspaceScriptMetadata,
} from "../project";

export const resolveWorkspacePath = (project: Project, workspace: Workspace) =>
  path.resolve(project.rootDirectory, workspace.path);

export const ROOT_WORKSPACE_SELECTOR = "@root";

export const resolveRootWorkspaceSelector = (
  workspacePattern: string,
  project: Project,
) =>
  workspacePattern === ROOT_WORKSPACE_SELECTOR
    ? project.rootWorkspace
    : project.findWorkspaceByNameOrAlias(workspacePattern);

export abstract class ProjectBase implements Project {
  public abstract readonly name: string;
  public abstract readonly rootDirectory: string;
  public abstract readonly rootWorkspace: Workspace;
  public abstract readonly workspaces: Workspace[];
  public abstract readonly sourceType: "fileSystem" | "memory";
  public abstract readonly config: ProjectConfig;

  constructor(_ignoreBunVersion = false) {
    const bunVersionError = validateCurrentBunVersion();
    if (bunVersionError && !_ignoreBunVersion) {
      logger.error(
        bunVersionError.message + " (Features may not work as expected)",
      );
    }
  }

  listWorkspacesWithScript(scriptName: string): Workspace[] {
    const typeError = validateJSType({
      value: scriptName,
      typeofName: "string",
      valueLabel: "scriptName",
    });
    if (typeError) throw typeError;

    return this.workspaces.filter((workspace) =>
      workspace.scripts.includes(scriptName),
    );
  }

  mapScriptsToWorkspaces(): Record<string, WorkspaceScriptMetadata> {
    const scripts = new Set<string>();
    this.workspaces.forEach((workspace) => {
      workspace.scripts.forEach((script) => scripts.add(script));
    });
    return Array.from(scripts)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        workspaces: this.listWorkspacesWithScript(name),
      }))
      .reduce(
        (acc, { name, workspaces }) => ({
          ...acc,
          [name]: { name, workspaces },
        }),
        {} as Record<string, WorkspaceScriptMetadata>,
      );
  }

  findWorkspaceByName(workspaceName: string): Workspace | null {
    const typeError = validateJSType({
      value: workspaceName,
      typeofName: "string",
      valueLabel: "workspaceName",
    });
    if (typeError) throw typeError;

    return (
      this.workspaces.find((workspace) => workspace.name === workspaceName) ??
      null
    );
  }

  findWorkspaceByAlias(alias: string): Workspace | null {
    const typeError = validateJSType({
      value: alias,
      typeofName: "string",
      valueLabel: "alias",
    });
    if (typeError) throw typeError;

    return (
      this.workspaces.find((workspace) => workspace.aliases.includes(alias)) ??
      null
    );
  }

  findWorkspaceByNameOrAlias(nameOrAlias: string): Workspace | null {
    const typeError = validateJSType({
      value: nameOrAlias,
      typeofName: "string",
      valueLabel: "nameOrAlias",
    });
    if (typeError) throw typeError;

    return (
      this.findWorkspaceByName(nameOrAlias) ||
      this.findWorkspaceByAlias(nameOrAlias)
    );
  }

  findWorkspacesByPattern(...workspacePatterns: string[]): Workspace[] {
    const workspaces: Workspace[] = [];
    if (workspacePatterns.includes(ROOT_WORKSPACE_SELECTOR)) {
      workspaces.push(this.rootWorkspace);
      workspacePatterns = workspacePatterns.filter(
        (pattern) => pattern !== ROOT_WORKSPACE_SELECTOR,
      );
    }

    workspaces.push(
      ...sortWorkspaces(
        matchWorkspacesByPatterns(workspacePatterns, this.workspaces),
      ),
    );

    return workspaces;
  }

  createScriptCommand(
    options: CreateProjectScriptCommandOptions,
  ): CreateProjectScriptCommandResult {
    const typeError =
      validateJSType({
        value: options.workspaceNameOrAlias,
        typeofName: "string",
        valueLabel: "workspaceNameOrAlias option",
      }) ??
      validateJSType({
        value: options.scriptName,
        typeofName: "string",
        valueLabel: "scriptName option",
      }) ??
      validateJSType({
        value: options.method,
        typeofName: "string",
        valueLabel: "method option",
        optional: true,
      }) ??
      validateJSType({
        value: options.args,
        typeofName: "string",
        valueLabel: "args option",
        optional: true,
      });
    if (typeError) throw typeError;

    const workspace = resolveRootWorkspaceSelector(
      options.workspaceNameOrAlias,
      this,
    );

    if (!workspace) {
      throw new PROJECT_ERRORS.ProjectWorkspaceNotFound(
        `Workspace not found: ${JSON.stringify(options.workspaceNameOrAlias)}`,
      );
    }
    if (!workspace.scripts.includes(options.scriptName)) {
      throw new PROJECT_ERRORS.WorkspaceScriptDoesNotExist(
        `Script not found in workspace ${JSON.stringify(
          workspace.name,
        )}: ${JSON.stringify(options.scriptName)} (available: ${
          workspace.scripts.join(", ") || "none"
        })`,
      );
    }
    return {
      workspace,
      scriptName: options.scriptName,
      commandDetails: createWorkspaceScriptCommand({
        ...options,
        workspace,
        rootDirectory: path.resolve(this.rootDirectory),
        method: options.method,
        args: options.args ?? "",
      }),
    };
  }
}
