import * as vscode from 'vscode';
import { LocalStorageService } from './storage';

const NOTEPAD_KEY = 'notepad-storage';

export class Notepad {
    private notes: NotesProvider;

	constructor(context: vscode.ExtensionContext) {
        let storage = new LocalStorageService(context.workspaceState);
        this.notes = new NotesProvider(storage);

		context.subscriptions.push(vscode.window.createTreeView('notepadNotes', { treeDataProvider: this.notes }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.newNote', async () => {
            const key = await vscode.window.showInputBox({ prompt: 'Enter a name for this Note:' });
            if (key) {
                this.notes.newItem(key);
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.renameNote', async (note: Note) => {
            const key = await vscode.window.showInputBox({ prompt: 'Enter a new name for this Note:' });
            if (key) {
                note.renameNote(key);
                this.notes.refresh();
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.deleteNote', async (note: Note) => {
            this.notes.deleteItem(note);
        }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.openNote', async (note: Note) => {
            note.openNote();
        }));
	}
}

class NotesProvider implements vscode.TreeDataProvider<Note> {
    private _onDidChangeTreeData: vscode.EventEmitter<Note | undefined | null | void> = new vscode.EventEmitter<Note | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Note | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

	data: Note[] = [];
    storage: LocalStorageService|undefined;

	constructor(storage?: LocalStorageService) {
        this.storage = storage;
        this.loadFromStorage();
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

    newItem(key: string, message?: string|undefined, children?:Note[]|undefined): Note {
        const note = new Note(key, message, children);
        this.data.push(note);
        this.saveToStorage();
        this.refresh();
        return note;
    }

    deleteItem(note: Note): void {
        note.deleteNote();
        this.data.splice(this.data.indexOf(note), 1);
        this.refresh();
    }

    saveToStorage(): void {
        this.storage?.setValue(NOTEPAD_KEY, this.notesToGeneric(this.data));
    }

    loadFromStorage(): void {
        const data: any|undefined = this.storage?.getValue<Note[]>(NOTEPAD_KEY);
        if (data) {
            this.data = this.notesFromGeneric(data)||[];
        } else {
            this.data = [];
        }
    }

    private notesToGeneric(arr: Note[]): any[]|undefined {
        if (arr.length === 0) {
            return undefined;
        }
        const notes: any[] = [];
        arr.forEach(note => {
            notes.push({
                label: note.label,
                message: note.message,
                children: note.children ? this.notesToGeneric(note.children) : undefined
            });
        });
        return notes;
    }

    private notesFromGeneric(notes: any[]): Note[]|undefined {
        if (notes.length === 0) {
            return undefined;
        }
        const arr: Note[] = [];
        notes.forEach(note => {
            arr.push(new Note(note['label'], note['message'], note['children'] ? this.notesFromGeneric(note['children']) : undefined));
        });
        return arr;
    }
}

class Note extends vscode.TreeItem {
    label: string;
	children: Note[]|undefined;
    message: string|undefined;
    parent: Note|undefined;
    filePath: vscode.Uri|undefined;
    // static nextId: number = 0;
    // noteId: number;

	constructor(label: string, message?: string, children?: Note[], id?: number) {
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

        // if (id && Note.nextId < id) {
        //     Note.nextId = id;
        // }
        // this.noteId = Note.nextId++;
        this.createNote();
    }

    renameNote(name: string): void {
        this.label = name;
        if(this.filePath) {
            const newFilePath = this.getPath(name);
            vscode.workspace.fs.rename(this.filePath, newFilePath, {
                overwrite: false
            }).then();
            this.filePath = newFilePath;
        } else {
            this.openNote();
        }
    }

    openNote(): void {
        vscode.window.showInformationMessage(`Opening note ${this.label}`);
        if (this.filePath) {
            vscode.workspace.openTextDocument(this.filePath).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        } else {
            this.createNote();
        }
    }

    createNote(): void {
        vscode.window.showInformationMessage(`Creating note ${this.label}`);
        const wsedit = new vscode.WorkspaceEdit();
        const filePath = this.getPath();
        vscode.window.showInformationMessage(filePath.toString());
        wsedit.createFile(filePath, { ignoreIfExists: true });
        vscode.workspace.applyEdit(wsedit).then(() => {
            this.filePath = filePath;
            this.openNote();
        });
    }

    deleteNote(): void {
        vscode.window.showInformationMessage(`Delete note ${this.label}`);
        if (this.filePath) {
            vscode.workspace.fs.delete(this.filePath);
        }
    }
    
    getPath(label?: string): vscode.Uri {
        const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; // gets the path of the first workspace folder
        return vscode.Uri.file(wsPath + '/notepad/' + (label ? label : this.label ? this.label : '') + '.note');
    }
}