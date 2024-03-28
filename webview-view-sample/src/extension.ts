import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import markdownIt = require('markdown-it');
//import MarkdownIt from 'markdown-it';
// export function activate(context: vscode.ExtensionContext) {

// 	const provider = new ColorsViewProvider(context.extensionUri);

// 	context.subscriptions.push(
// 		vscode.window.registerWebviewViewProvider(ColorsViewProvider.viewType, provider));

// 	context.subscriptions.push(
// 		vscode.commands.registerCommand('calicoColors.addColor', () => {
// 			provider.addColor();
// 		}));

// 	context.subscriptions.push(
// 		vscode.commands.registerCommand('calicoColors.clearColors', () => {
// 			provider.clearColors();
// 		}));
// }

export function activate(context: vscode.ExtensionContext) {

	const provider = new NoteViewProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(NoteViewProvider.viewType, provider));

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('calicoColors.addColor', () => {
	// 		provider.addColor();
	// 	}));

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('calicoColors.clearColors', () => {
	// 		provider.clearColors();
	// 	}));
}

class NoteViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'commandListsView';

	private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    constructor(
		private readonly context: vscode.ExtensionContext

		) {
			this._extensionUri = this.context.extensionUri;
		}

    public resolveWebviewView(
		webviewView: vscode.WebviewView
		) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this.updateContent();
    }

	private getWebviewContent(data: string ) {
		const md =  new markdownIt();
		const html = md.render(data);
		return html;
	}

	private updateContent() {
        if (!this._view) {
            return;
		}
		const notePath = path.join(this.context.extensionPath, 'note.md');
        //const notePath = ('/home/dev/note.md');
        const data = fs.readFileSync(notePath, 'utf8');
		if (this._view){
			// this._view.webview.html = `<h1>Note</h1><md-block>${data}</md-block>`;
			this._view.webview.html = this.getWebviewContent(data);
			console.log(data);
		}

		// fs.readFile(notePath, 'utf8', (err, data) => {
        //     if (err) {
        //         if (this._view){
		// 			this._view.webview.html = `<h1>Error</h1><p>Could not read note.md</p>`;
		// 		}
		// 	} else {
		// 		if (this._view){
		// 			this._view.webview.html = `<h1>Error</h1><p>Could not read note.md</p>`;
		// 			//this._view.webview.html = `<h1>Note</h1><pre>${data}</pre>`;
		// 			console.log(data);
		// 		}
        //     }
        // });

	}
}


class ColorsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'calicoColors.colorsView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	public addColor() {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>

				<button class="add-color-button">Add Color</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
