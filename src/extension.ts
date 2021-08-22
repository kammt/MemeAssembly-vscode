import * as vscode from 'vscode';

import { HoverProvider } from './hover/provider';

export function activate(context: vscode.ExtensionContext) {

    var disposable = vscode.languages.registerHoverProvider('memeasm', new HoverProvider())

    context.subscriptions.push(disposable);
}
