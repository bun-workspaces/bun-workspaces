import * as vscode from "vscode";

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

  getChildren(_element?: BwTreeItem): vscode.ProviderResult<BwTreeItem[]> {
    // TODO: use createFileSystemProject() to get workspaces
    return [];
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
