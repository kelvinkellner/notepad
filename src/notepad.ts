import * as vscode from 'vscode';

export class Notepad {
	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView('notepadNotes', { treeDataProvider: new NotesProvider() });
		context.subscriptions.push(view);
	}
}

class NotesProvider implements vscode.TreeDataProvider<Note> {
	onDidChangeTreeData?: vscode.Event<Note|null|undefined>|undefined;

	data: Note[];

	constructor() {
		this.data = [new Note('test','test message')];
	}

	getTreeItem(element: Note): vscode.TreeItem|Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: Note|undefined): vscode.ProviderResult<Note[]> {
		if (element === undefined) {
			return this.data;
		}
		return element.children;
	}

    getMessage(element: Note): string|undefined {
        return element.message;
    }
}

class Note extends vscode.TreeItem {
    label: string;
	children: Note[]|undefined;
    message: string|undefined;

	constructor(label: string, message?: string, children?: Note[]) {
		super(
			label,
			children === undefined
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed
        );
        
        this.label = label;
        this.children = children;
        this.message = message;
    }
}