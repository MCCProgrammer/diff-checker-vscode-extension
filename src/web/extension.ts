import * as vscode from 'vscode';
import * as diff from 'diff';

/**
 * Provider for the Diff Checker preview panel
 */
class DiffCheckerProvider {
	private _panel?: vscode.WebviewPanel;
	private _textA: string = '';
	private _textB: string = '';
	private _filePathA?: vscode.Uri;
	private _filePathB?: vscode.Uri;
	private _tempFileA?: vscode.Uri;
	private _tempFileB?: vscode.Uri;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	/**
	 * Creates or reveals the preview panel
	 */
	public createOrShowPreview() {
		// Always open in column 2 (beside the active editor)
		const targetColumn = vscode.ViewColumn.Two;

		// If we already have a panel, show it
		if (this._panel) {
			this._panel.reveal(targetColumn);
			return;
		}

		// Otherwise, create a new panel
		this._panel = vscode.window.createWebviewPanel(
			'diffChecker',
			'Diff Checker',
			targetColumn,
			{
				enableScripts: true,
				localResourceRoots: [
					this._extensionUri
				],	
				retainContextWhenHidden: true
			}
		);

		// Set the webview's initial html content
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			(message: any) => {
				switch (message.command) {
					case 'updateTextA':
						this._textA = message.text;
						// Clear file path if user manually edits text
						if (this._filePathA) {
							this._filePathA = undefined;
						}
						break;
					case 'updateTextB':
						this._textB = message.text;
						// Clear file path if user manually edits text
						if (this._filePathB) {
							this._filePathB = undefined;
						}
						break;
					case 'compare':
						this._compareTexts();
						break;
					case 'openDiffView':
						this._openDiffView();
						break;
					case 'loadSelectionA':
						this._loadSelectionToA();
						break;
					case 'loadSelectionB':
						this._loadSelectionToB();
						break;
					case 'resetA':
						this._textA = '';
						this._filePathA = undefined;
						if (this._panel) {
							this._panel.webview.postMessage({
								command: 'setTextA',
								text: ''
							});
						}
						break;
					case 'resetB':
						this._textB = '';
						this._filePathB = undefined;
						if (this._panel) {
							this._panel.webview.postMessage({
								command: 'setTextB',
								text: ''
							});
						}
						break;
				}
			},
			null,
			[]
		);

		// Handle panel disposal
		this._panel.onDidDispose(async () => {
			// Clean up temporary files
			await this._cleanupTempFiles();
			// Reset state
			this._textA = '';
			this._textB = '';
			this._filePathA = undefined;
			this._filePathB = undefined;
			this._tempFileA = undefined;
			this._tempFileB = undefined;
			this._panel = undefined;
		}, null);
	}

	/**
	 * Handles activation when command is executed
	 * Logic: 
	 * - If no text in boxes and text is selected → paste to Original text (left)
	 * - If Original text has text and text is selected → paste to Changed text (right)
	 */
	public async handleActivation() {
		// Create or show the preview
		this.createOrShowPreview();

		// Wait a bit for the panel to be ready
		await new Promise(resolve => setTimeout(resolve, 100));

		const editor = vscode.window.activeTextEditor;
		let selectedText = '';
		
		if (editor) {
			const selection = editor.selection;
			if (!selection.isEmpty) {
				selectedText = editor.document.getText(selection);
			}
		}
		
		// If text is selected, apply smart logic
		if (selectedText) {
			if (this._textA === '' && this._textB === '') {
				// Both boxes empty → paste to Original text (left)
				this._textA = selectedText;
				if (this._panel) {
					this._panel.webview.postMessage({
						command: 'setTextA',
						text: selectedText
					});
				}
			} else if (this._textA !== '' && this._textB === '') {
				// Original text has content → paste to Changed text (right)
				this._textB = selectedText;
				if (this._panel) {
					this._panel.webview.postMessage({
						command: 'setTextB',
						text: selectedText
					});
				}
			}
		}
	}

	/**
	 * Loads the currently selected text into textbox A, or file path if nothing selected
	 */
	private async _loadSelectionToA() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor found.');
			return;
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			// No selection - use the file path
			const fileUri = editor.document.uri;
			this._filePathA = fileUri;
			const fileName = fileUri.fsPath.split(/[/\\]/).pop() || 'file';
			
			// Read file content
			try {
				const fileContent = await vscode.workspace.fs.readFile(fileUri);
				const text = new TextDecoder().decode(fileContent);
				this._textA = text;
				
				if (this._panel) {
					this._panel.webview.postMessage({
						command: 'setTextA',
						text: text,
						fileName: fileName
					});
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error reading file: ${error}`);
			}
			return;
		}

		// Has selection - use selected text
		this._filePathA = undefined;
		const selectedText = editor.document.getText(selection);
		this._textA = selectedText;
		
		if (this._panel) {
			this._panel.webview.postMessage({
				command: 'setTextA',
				text: selectedText
			});
		}
	}

	/**
	 * Loads the currently selected text into textbox B, or file path if nothing selected
	 */
	private async _loadSelectionToB() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor found.');
			return;
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			// No selection - use the file path
			const fileUri = editor.document.uri;
			this._filePathB = fileUri;
			const fileName = fileUri.fsPath.split(/[/\\]/).pop() || 'file';
			
			// Read file content
			try {
				const fileContent = await vscode.workspace.fs.readFile(fileUri);
				const text = new TextDecoder().decode(fileContent);
				this._textB = text;
				
				if (this._panel) {
					this._panel.webview.postMessage({
						command: 'setTextB',
						text: text,
						fileName: fileName
					});
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Error reading file: ${error}`);
			}
			return;
		}

		// Has selection - use selected text
		this._filePathB = undefined;
		const selectedText = editor.document.getText(selection);
		this._textB = selectedText;
		
		if (this._panel) {
			this._panel.webview.postMessage({
				command: 'setTextB',
				text: selectedText
			});
		}
	}

	/**
	 * Compares the two texts and shows the result
	 */
	private _compareTexts() {
		if (!this._panel) {
			return;
		}

		const textA = this._textA;
		const textB = this._textB;

		if (textA === '' && textB === '') {
			this._panel.webview.postMessage({
				command: 'showResult',
				isIdentical: true,
				differences: 0,
				message: 'Both text boxes are empty.',
				statistics: null
			});
			return;
		}

		if (textA === textB) {
			this._panel.webview.postMessage({
				command: 'showResult',
				isIdentical: true,
				differences: 0,
				message: '✅ Texts are identical!',
				statistics: null
			});
			return;
		}

		// Calculate differences using diff library
		const lineDifferences = diff.diffLines(textA, textB);
		
		// Calculate line statistics
		const linesA = textA.split('\n').length;
		const linesB = textB.split('\n').length;
		
		// Calculate word statistics
		const wordsA = textA.split(/\s+/).filter(w => w.trim() !== '').length;
		const wordsB = textB.split(/\s+/).filter(w => w.trim() !== '').length;
		
		const diffCount = lineDifferences.filter(p => p.added || p.removed).length;

		this._panel.webview.postMessage({
			command: 'showResult',
			isIdentical: false,
			differences: diffCount,
			message: `❌ ${diffCount} difference${diffCount !== 1 ? 's' : ''} found.`,
			statistics: {
				lines: {
					totalA: linesA,
					totalB: linesB
				},
				words: {
					totalA: wordsA,
					totalB: wordsB
				}
			}
		});
	}

	/**
	 * Cleans up temporary files
	 */
	private async _cleanupTempFiles() {
		try {
			if (this._tempFileA) {
				await vscode.workspace.fs.delete(this._tempFileA, { useTrash: false });
			}
			if (this._tempFileB) {
				await vscode.workspace.fs.delete(this._tempFileB, { useTrash: false });
			}
		} catch (error) {
			// Ignore errors when cleaning up
		}
		this._tempFileA = undefined;
		this._tempFileB = undefined;
	}

	/**
	 * Opens VS Code's built-in diff view with the two texts or files
	 */
	private async _openDiffView() {
		// Clean up old temp files first
		await this._cleanupTempFiles();

		// If we have file paths, use them directly (always read from files)
		if (this._filePathA && this._filePathB) {
			// Open diff in first column
			await vscode.commands.executeCommand(
				'vscode.diff',
				this._filePathA,
				this._filePathB,
				`${this._filePathA.fsPath.split(/[/\\]/).pop()} ↔ ${this._filePathB.fsPath.split(/[/\\]/).pop()}`
			);
			// Move to first column
			await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
			return;
		}

		// If we have file path A, use it with temp file for text B
		if (this._filePathA && this._textB !== '') {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('Please open a workspace folder to use the diff view feature.');
				return;
			}

			const tempDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode-diff-checker');
			try {
				await vscode.workspace.fs.createDirectory(tempDir);
			} catch (error) {
				// Directory might already exist, ignore
			}

			const uriB = vscode.Uri.joinPath(tempDir, 'text-b.txt');
			const encoder = new TextEncoder();
			await vscode.workspace.fs.writeFile(uriB, encoder.encode(this._textB));
			this._tempFileB = uriB;

			await vscode.commands.executeCommand(
				'vscode.diff',
				this._filePathA,
				uriB,
				`${this._filePathA.fsPath.split(/[/\\]/).pop()} ↔ Text B`
			);
			// Move to first column
			await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
			return;
		}

		if (this._filePathB && this._textA !== '') {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('Please open a workspace folder to use the diff view feature.');
				return;
			}

			const tempDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode-diff-checker');
			try {
				await vscode.workspace.fs.createDirectory(tempDir);
			} catch (error) {
				// Directory might already exist, ignore
			}

			const uriA = vscode.Uri.joinPath(tempDir, 'text-a.txt');
			const encoder = new TextEncoder();
			await vscode.workspace.fs.writeFile(uriA, encoder.encode(this._textA));
			this._tempFileA = uriA;

			await vscode.commands.executeCommand(
				'vscode.diff',
				uriA,
				this._filePathB,
				`Text A ↔ ${this._filePathB.fsPath.split(/[/\\]/).pop()}`
			);
			// Move to first column
			await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
			return;
		}

		// Otherwise, use text from boxes
		if (this._textA === '' && this._textB === '') {
			vscode.window.showWarningMessage('Both text boxes are empty.');
			return;
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('Please open a workspace folder to use the diff view feature.');
			return;
		}

		const tempDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode-diff-checker');

		try {
			// Ensure temp directory exists
			await vscode.workspace.fs.createDirectory(tempDir);
		} catch (error) {
			// Directory might already exist, ignore
		}

		const uriA = vscode.Uri.joinPath(tempDir, 'text-a.txt');
		const uriB = vscode.Uri.joinPath(tempDir, 'text-b.txt');

		const encoder = new TextEncoder();
		
		// Write texts to temporary files
		await vscode.workspace.fs.writeFile(uriA, encoder.encode(this._textA));
		await vscode.workspace.fs.writeFile(uriB, encoder.encode(this._textB));
		
		this._tempFileA = uriA;
		this._tempFileB = uriB;

		// Open diff view
		await vscode.commands.executeCommand(
			'vscode.diff',
			uriA,
			uriB,
			'Text A ↔ Text B'
		);
		// Move to first column
		await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
	}

	/**
	 * Loads selected text into textbox A (public method for command)
	 */
	public async loadSelectionA() {
		await this._loadSelectionToA();
	}

	/**
	 * Loads selected text into textbox B (public method for command)
	 */
	public async loadSelectionB() {
		await this._loadSelectionToB();
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to css file and convert to webview uri
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
		);
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
		);

		// Content Security Policy
		const cspSource = webview.cspSource;

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src ${cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
				<title>Diff Checker</title>
			</head>
			<body>
				<div class="container">
					<div class="header-row">
						<div class="header-item">
							<span class="header-label">Original text</span>
							<button class="open-file-btn" id="openFileA" title="Open file">↑ Open file</button>
						</div>
						<div class="header-item">
							<span class="header-label">Changed text</span>
							<button class="open-file-btn" id="openFileB" title="Open file">↑ Open file</button>
						</div>
					</div>
					
					<div class="textbox-container">
						<div class="textbox-wrapper">
							<div class="textarea-container">
								<div class="line-numbers" id="lineNumbersA"></div>
								<textarea id="textA" placeholder="Paste or type text here" spellcheck="false"></textarea>
							</div>
							<div class="line-count" id="lineCountA">0 lines</div>
							<button class="reset-btn" id="resetA">Reset</button>
							<div class="statistics-container" id="statsA" style="display: none;"></div>
						</div>
						
						<div class="textbox-wrapper">
							<div class="textarea-container">
								<div class="line-numbers" id="lineNumbersB"></div>
								<textarea id="textB" placeholder="Paste or type text here" spellcheck="false"></textarea>
							</div>
							<div class="line-count" id="lineCountB">0 lines</div>
							<button class="reset-btn" id="resetB">Reset</button>
							<div class="statistics-container" id="statsB" style="display: none;"></div>
						</div>
					</div>
					
					<div class="button-container">
						<button class="compare-btn" id="compareBtn">Find difference</button>
					</div>
					
					<div class="result-container" id="resultContainer" style="display: none;">
						<div class="result-message" id="resultMessage"></div>
						<button class="diff-btn" id="diffBtn" style="display: none;">See Differences</button>
					</div>
				</div>
				
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Diff Checker extension is now active!');

	const provider = new DiffCheckerProvider(context.extensionUri);

	// Register command to show diff checker preview
	const showCommand = vscode.commands.registerCommand(
		'diff-checker.showDiffChecker',
		async () => {
			await provider.handleActivation();
		}
	);

	// Register command to load selection to A
	const loadSelectionACommand = vscode.commands.registerCommand(
		'diff-checker.loadSelectionA',
		async () => {
			await provider.loadSelectionA();
		}
	);

	// Register command to load selection to B
	const loadSelectionBCommand = vscode.commands.registerCommand(
		'diff-checker.loadSelectionB',
		async () => {
			await provider.loadSelectionB();
		}
	);

	context.subscriptions.push(
		showCommand,
		loadSelectionACommand,
		loadSelectionBCommand
	);
}

/**
 * Extension deactivation function
 */
export function deactivate() {}
