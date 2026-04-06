import * as vscode from "vscode";

export class WorkspacesTreeProvider implements vscode.TreeDataProvider<WorkspaceTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    WorkspaceTreeItem | undefined | null
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    _element?: WorkspaceTreeItem,
  ): vscode.ProviderResult<WorkspaceTreeItem[]> {
    // TODO: use createFileSystemProject() to get workspaces
    return [];
  }
}

export class WorkspaceTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
  }
}
