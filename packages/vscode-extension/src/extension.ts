import * as vscode from "vscode";
import { validateBunPath } from "./bunPath";
import { BwTreeProvider } from "./tree";

export const activate = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const isBunAvailable = await validateBunPath();
  if (!isBunAvailable) {
    const action = await vscode.window.showWarningMessage(
      "bun-workspaces: bun binary not found. Set the path in settings.",
      "Open Settings",
    );
    if (action === "Open Settings") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "bunWorkspaces.bunPath",
      );
    }
    return;
  }
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
