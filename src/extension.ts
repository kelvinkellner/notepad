'use strict';

import * as vscode from 'vscode';

import { Notepad } from './notepad';
import { NotepadNew } from './notepadNew';

export function activate(context: vscode.ExtensionContext) {
	// let d1 = vscode.commands.registerCommand('notepad.newNote', () => vscode.window.showInformationMessage('New note pressed!'));

	new Notepad(context);
	new NotepadNew(context);

	// context.subscriptions.push(d1);
}

// this method is called when your extension is deactivated
export function deactivate() {}