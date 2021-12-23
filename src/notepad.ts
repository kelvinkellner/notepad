import * as vscode from 'vscode';
import * as fs from 'fs';
import { LocalStorageService } from './storage';

const NOTEPAD_KEY = 'notepad-storage';

export class Notepad {
    private notes: NotesProvider;
    private storageUri: vscode.Uri;
    private storage: LocalStorageService;

	constructor(context: vscode.ExtensionContext) {

        this.storageUri = context.storageUri ? context.storageUri : context.globalStorageUri;
        this.storage = new LocalStorageService(context.workspaceState);
        this.notes = new NotesProvider(this.storageUri, this.storage);

		context.subscriptions.push(vscode.window.createTreeView('notepadNotes', { treeDataProvider: this.notes }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.newNote', async () => {
            const key = await vscode.window.showInputBox({ prompt: 'Enter a name for this Note:' });
            if (key) {
                this.notes.newItem(key);
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.deleteNote', async (note: Note) => {
            this.notes.deleteItem(note);
        }));

        context.subscriptions.push(vscode.commands.registerCommand('notepad.renameNote', async (note: Note) => {
            const key = await vscode.window.showInputBox({ prompt: 'Enter a new name for this Note:' });
            if (key) {
                this.notes.renameItem(note, key);
            }
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
    storageUri: vscode.Uri;
    storage: LocalStorageService|undefined;

	constructor(storageUri: vscode.Uri, storage?: LocalStorageService) {
        this.storageUri = storageUri;
        this.storage = storage;
        this.loadFromStorage();

        vscode.workspace.onDidSaveTextDocument(doc => {
            this.data.forEach(note => {
                if (doc.fileName === note.uri.fsPath) {
                    note.setText(doc.getText());
                    this.saveToStorage();
                }
            });
        });
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

    newItem(key: string, text?: string|undefined, children?:Note[]|undefined): Note {
        const note = new Note(key, this.getPath(key), text, children);
        this.data.push(note);
        this.saveToStorage();
        this.refresh();
        return note;
    }

    deleteItem(note: Note): void {
        note.deleteNote();
        this.data.splice(this.data.indexOf(note), 1);
        this.saveToStorage();
        this.refresh();
    }

    renameItem(note: Note, label: string): void {
        note.renameNote(label, this.getPath(label));
        this.saveToStorage();
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
                text: note.text,
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
            arr.push(new Note(note['label'], this.getPath(note['label']), note['text'], note['children'] ? this.notesFromGeneric(note['children']) : undefined));
        });
        return arr;
    }
    
    getPath(label: string): vscode.Uri {
        const path = this.storageUri.fsPath;
        //vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; // gets the path of the first workspace folder
        return vscode.Uri.file(path + '/notepad/' + label + '.note');
    }
}

class Note extends vscode.TreeItem {
    label: string;
	children: Note[]|undefined;
    text: string|undefined;
    parent: Note|undefined;
    uri: vscode.Uri;
    // static nextId: number = 0;
    // noteId: number;

	constructor(label: string, uri: vscode.Uri, text?: string, children?: Note[], id?: number) {
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
        this.text = text;
        this.uri = uri;

        // if (id && Note.nextId < id) {
        //     Note.nextId = id;
        // }
        // this.noteId = Note.nextId++;
        this.createNote();
    }

    renameNote(name: string, newUri: vscode.Uri): void {
        this.label = name;
        if(this.uri) {
            vscode.workspace.fs.rename(this.uri, newUri, {
                overwrite: false
            }).then();
            this.uri = newUri;
        } else {
            this.openNote();
        }
    }

    openNote(): void {
        vscode.window.showInformationMessage(`Opening note ${this.label}`);
        if (fs.existsSync(this.uri.fsPath)) {
            vscode.workspace.openTextDocument(this.uri).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        } else {
            this.createNote();
            // this.openNote();
        }
    }

    createNote(): void {
        vscode.window.showInformationMessage(`Creating note ${this.label}`);
        const wsedit = new vscode.WorkspaceEdit();
        if (fs.existsSync(this.uri.fsPath)) {
            vscode.workspace.openTextDocument(this.uri).then(doc => {
                if (!this.text || doc.getText() !== this.text) {
                    this.setText(doc.getText());
                }
            });
        } else {
            wsedit.createFile(this.uri);
            vscode.workspace.applyEdit(wsedit).then(() => {
                fs.writeFile(this.uri.fsPath, this.text ? this.text : "", (error: any) => {
                    if (error) {
                        vscode.window.showErrorMessage("Could not write to file: " + this.uri + ": " + error.message);
                    } else {
                        vscode.window.showInformationMessage(this.uri.fsPath + ' -- ' + fs.existsSync(this.uri.fsPath));
                        vscode.workspace.openTextDocument(this.uri).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                    }
                });
            });
        }
    }

    deleteNote(): void {
        vscode.window.showInformationMessage(`Delete note ${this.label}`);
        if (this.uri) {
            vscode.workspace.fs.delete(this.uri);
        }
    }

    setText(text: string): void {
        this.text = text;
    }
}