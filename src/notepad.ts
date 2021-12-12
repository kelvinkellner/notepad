import * as vscode from 'vscode';

export class Notepad {
    private notes: NotesProvider;

	constructor(context: vscode.ExtensionContext) {
        this.notes = new NotesProvider();
		const view = vscode.window.createTreeView('notepadNotes', { treeDataProvider: this.notes });
		context.subscriptions.push(view);

        vscode.commands.registerCommand('notepad.newNote', async () => {
            const key = await vscode.window.showInputBox({ prompt: 'Enter a name for this Note:' });
            if (key) {
                this.notes.newItem(key);
            }
        });

        vscode.commands.registerCommand('notepad.deleteNote', async (note: Note) => {
            this.notes.deleteItem(note);
        });
	}
}

class NotesProvider implements vscode.TreeDataProvider<Note> {
    private _onDidChangeTreeData: vscode.EventEmitter<Note | undefined | null | void> = new vscode.EventEmitter<Note | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Note | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

	data: Note[];
    id: number = 0;

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

    newItem(key: string): Note {
        const note = new Note(key, 'New Note');
        this.data.push(note);
        this.refresh();
        return note;
    }

    deleteItem(note: Note): void {
        this.data.splice(this.data.indexOf(note), 1);
        this.refresh();
    }
}

class Note extends vscode.TreeItem {
    label: string;
	children: Note[]|undefined;
    message: string|undefined;
    parent: Note|undefined;
    private idNote: number;
    static idNext: number = 0;

	constructor(label: string, message?: string, children?: Note[]) {
		super(
			label,
			children === undefined
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed
        );

        this.command = { command: 'notepad.openNote', title: 'Open Note', arguments: [this] };
        this.contextValue = 'note';
        
        this.label = label;
        this.children = children;
        this.message = message;
        this.idNote = Note.idNext++;
    }

    getId(): number {
        return this.idNote;
    }
}