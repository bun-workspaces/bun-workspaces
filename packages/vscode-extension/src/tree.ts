import * as vscode from "vscode";
import { listWorkspaces, type Workspace } from "./cli";

export class BwTreeProvider implements vscode.TreeDataProvider<BwTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    BwTreeItem | undefined | null
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BwTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BwTreeItem): Promise<BwTreeItem[]> {
    if (element instanceof WorkspaceTreeItem) {
      return element.workspace.scripts.map(
        (script) => new ScriptTreeItem(script, element.workspace),
      );
    }

    const workspaces = await listWorkspaces();
    return workspaces.map(
      (workspace) =>
        new WorkspaceTreeItem(
          workspace,
          workspace.scripts.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        ),
    );
  }
}

export class BwTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
  }
}

export class WorkspaceTreeItem extends BwTreeItem {
  constructor(
    readonly workspace: Workspace,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(workspace.name, collapsibleState);
    this.description = workspace.path;
    this.contextValue = "workspace";
  }
}

export class ScriptTreeItem extends BwTreeItem {
  constructor(
    readonly scriptName: string,
    readonly workspace: Workspace,
  ) {
    super(scriptName, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "script";
  }
}
