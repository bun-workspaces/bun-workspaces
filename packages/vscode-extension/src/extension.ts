import * as vscode from "vscode";
import { BwTreeProvider } from "./tree";

export const activate = (context: vscode.ExtensionContext): void => {
  const workspacesTreeProvider = new BwTreeProvider();

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
