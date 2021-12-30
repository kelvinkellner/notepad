import * as vscode from 'vscode';
import { NotepadEditorProvider } from './notepadEditorProvider';

export class NotepadNew {
    constructor(context: vscode.ExtensionContext) {
        // Register our custom editor provider
        context.subscriptions.push(NotepadEditorProvider.register(context));
    }
}