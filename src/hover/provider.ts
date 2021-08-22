import * as vscode from 'vscode';
import { Hover } from 'vscode';
import { Registry, parseRawGrammar, IRawGrammar, IGrammar, IToken } from "vscode-textmate";

const { promises: { readFile } } = require("fs");

import { readFileSync } from "fs";

import { join } from "path";

import * as oniguruma from 'vscode-oniguruma'


export class HoverProvider implements vscode.HoverProvider {
    private _registry: Registry;
    private _grammar: IGrammar | null | undefined = null;

    constructor() {
        const wasmBin = readFileSync(join(__dirname, '../../node_modules/vscode-oniguruma/release/onig.wasm')).buffer;

        const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
            return {
                createOnigScanner(patterns: string[]) {
                    return new oniguruma.OnigScanner(patterns);
                },
                createOnigString(s: string) {
                    return new oniguruma.OnigString(s);
                }
            };
        });

        this._registry = new Registry({
            onigLib: vscodeOnigurumaLib,

            loadGrammar: (scopeName) => {
                if (scopeName === 'source.memeasm') {
                    return readFile(join(__dirname, '../../syntaxes/memeasm.tmLanguage.json')).then((data: any) => parseRawGrammar(data.toString(), "memeasm.tmLanguage.json"))
                }
                console.log(`Unknown scope name: ${scopeName}`);
                return null;
            }
        })

        this._registry.loadGrammar('source.memeasm').then(g => this._grammar = g)
    }


    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
        if (!this._grammar) {
            return;
        }

        var line = document.lineAt(position.line);

        var tokenized = this._grammar?.tokenizeLine(line.text, null)
        if (tokenized.tokens.length == 0) {
            return;
        }


        var hoveredTokenIndex = tokenized.tokens.findIndex((t: IToken) => {
            return t.startIndex <= position.character && t.endIndex > position.character;
        });
        if (hoveredTokenIndex < 0) {
            return;
        }

        // Now search left for tokens on the same level (skipping lower ones)
        var currentTokenLength = tokenized.tokens[hoveredTokenIndex].scopes.length;
        var l = hoveredTokenIndex;
        while (l > 0 && tokenized.tokens[l - 1].scopes.length >= currentTokenLength || tokenized.tokens[l - 1].scopes.length === 1) {
            l--;
        }

        var r = hoveredTokenIndex;
        while (r < tokenized.tokens.length - 1 && (tokenized.tokens[r + 1].scopes.length >= currentTokenLength || tokenized.tokens[r + 1].scopes.length === 1)) {
            r++;
        }

        var start = tokenized.tokens[l].startIndex;
        var end = tokenized.tokens[r].endIndex;

        var tokenRange = new vscode.Range(
            new vscode.Position(position.line, start),
            new vscode.Position(position.line, end));


        return new Hover(line.text.substring(start, end), tokenRange);
    }
}
