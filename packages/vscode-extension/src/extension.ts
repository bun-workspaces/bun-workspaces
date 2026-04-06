import * as vscode from "vscode";
import { WorkspacesTreeProvider } from "./workspacesTreeProvider";

export const activate = (context: vscode.ExtensionContext): void => {
  const workspacesTreeProvider = new WorkspacesTreeProvider();

  vscode.window.registerTreeDataProvider(
    "bunWorkspaces.workspacesView",
    workspacesTreeProvider,
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("bunWorkspaces.refreshWorkspaces", () => {
      workspacesTreeProvider.refresh();
    }),

    vscode.commands.registerCommand("bunWorkspaces.runScript", () => {
      // TODO
    }),
  );

  vscode.commands.executeCommand("setContext", "bunWorkspaces.active", true);
};

export const deactivate = (): void => {};
