import * as vscode from 'vscode';
import { computeDiff, describeDiff, DiffOptions } from './diffRows';

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
	private _lastActiveFileUri?: vscode.Uri;
	private _globalStorageUri?: vscode.Uri;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _extensionUri: vscode.Uri,
		globalStorageUri?: vscode.Uri
	) {
		this._globalStorageUri = globalStorageUri;
	}

	/**
	 * Creates or reveals the preview panel
	 */
	public createOrShowPreview() {
		// Always open in column 2 (beside the active editor)
		const targetColumn = vscode.ViewColumn.Two;

		// If we already have a panel, show it
		if (this._panel) {
			this._panel.reveal(targetColumn);
			// Update last active file when panel gains focus
			this._updateLastActiveFile();
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

		// Update last active file when panel gains focus
		this._updateLastActiveFile();

		// Handle panel focus to track last active file
		this._panel.onDidChangeViewState((e) => {
			if (e.webviewPanel.visible && e.webviewPanel.active) {
				this._updateLastActiveFile();
			}
		});

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
						this._compareTexts(message.options || {});
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
					case 'openFileDialogA':
						this._openFileDialog('a');
						break;
					case 'openFileDialogB':
						this._openFileDialog('b');
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
			this._extensionContext.subscriptions
		);

		// Global listener for active editor changes to track focus
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.uri.scheme !== 'vscode-webview') {
				this._lastActiveFileUri = editor.document.uri;
			}
		}, null, this._extensionContext.subscriptions);

		// Handle panel disposal
		this._panel.onDidDispose(async () => {
			// Clean up temporary files
			await this._cleanupTempFiles();
			this._panel = undefined;
		}, null, this._extensionContext.subscriptions);
	}

	/**
	 * Updates the last active file URI
	 * Only updates if there's an active text editor (not webview)
	 */
	private _updateLastActiveFile() {
		const editor = vscode.window.activeTextEditor;
		// Only update if there's an active editor and it's not a webview
		if (editor && editor.document.uri.scheme !== 'vscode-webview') {
			this._lastActiveFileUri = editor.document.uri;
		}
	}

	/**
	 * Handles activation when command is executed
	 * Logic: 
	 * - If no text in boxes and text is selected → paste to Original text (left)
	 * - If Original text has text and text is selected → paste to Changed text (right)
	 */
	public async handleActivation() {
		// Capture last active file BEFORE creating/showing preview (which may change active editor)
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor) {
			this._lastActiveFileUri = activeEditor.document.uri;
		}
		
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
		
		// If no active editor, try to use the last active file
		if (!editor) {
			if (this._lastActiveFileUri) {
				try {
					const fileContent = await vscode.workspace.fs.readFile(this._lastActiveFileUri);
					const text = new TextDecoder().decode(fileContent);
					this._textA = text;
					const fileName = this._lastActiveFileUri.fsPath.split(/[/\\]/).pop() || 'file';
					this._filePathA = this._lastActiveFileUri;
					
					if (this._panel) {
						this._panel.webview.postMessage({
							command: 'setTextA',
							text: text,
							fileName: fileName
						});
					}
					return;
				} catch (error) {
					vscode.window.showErrorMessage(`Error reading file: ${error}`);
					return;
				}
			} else {
				vscode.window.showWarningMessage('No active editor found.');
				return;
			}
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			// No selection - use the last active file if available, otherwise current file
			const fileUri = this._lastActiveFileUri || editor.document.uri;
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
		
		// If no active editor, try to use the last active file
		if (!editor) {
			if (this._lastActiveFileUri) {
				try {
					const fileContent = await vscode.workspace.fs.readFile(this._lastActiveFileUri);
					const text = new TextDecoder().decode(fileContent);
					this._textB = text;
					const fileName = this._lastActiveFileUri.fsPath.split(/[/\\]/).pop() || 'file';
					this._filePathB = this._lastActiveFileUri;
					
					if (this._panel) {
						this._panel.webview.postMessage({
							command: 'setTextB',
							text: text,
							fileName: fileName
						});
					}
					return;
				} catch (error) {
					vscode.window.showErrorMessage(`Error reading file: ${error}`);
					return;
				}
			} else {
				vscode.window.showWarningMessage('No active editor found.');
				return;
			}
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			// No selection - use the last active file if available, otherwise current file
			const fileUri = this._lastActiveFileUri || editor.document.uri;
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
	private _compareTexts(options: DiffOptions = {}) {
		if (!this._panel) {
			return;
		}

		// Normalize newlines to avoid invisible character differences
		const textA = this._textA.replace(/\r\n/g, '\n');
		const textB = this._textB.replace(/\r\n/g, '\n');

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

		const result = computeDiff(textA, textB, options);
		const ignoring = [
			options.ignoreWhitespace ? 'whitespace' : '',
			options.ignoreCase ? 'case' : '',
			options.ignoreBlankLines ? 'blank lines' : ''
		].filter(Boolean);

		if (result.blocks === 0) {
			this._panel.webview.postMessage({
				command: 'showResult',
				isIdentical: true,
				differences: 0,
				message: textA === textB || ignoring.length === 0
					? '✅ Texts are identical!'
					: `✅ Texts are identical when ignoring ${ignoring.join(', ')}.`,
				statistics: null
			});
			return;
		}

		this._panel.webview.postMessage({
			command: 'showResult',
			isIdentical: false,
			differences: result.blocks,
			message: `❌ ${describeDiff(result)}.`,
			rows: result.rows,
			statistics: {
				lines: {
					totalA: textA.split('\n').length,
					totalB: textB.split('\n').length
				},
				words: {
					totalA: textA.split(/\s+/).filter(w => w.trim() !== '').length,
					totalB: textB.split(/\s+/).filter(w => w.trim() !== '').length
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
	 * Gets the temporary directory for diff files
	 * Uses VS Code's global storage URI which is in a system temp directory
	 */
	private _getTempDir(): vscode.Uri {
		// Use VS Code's global storage path which is in a temp location
		// This will be in a system temp directory, not in the workspace
		if (this._globalStorageUri) {
			return vscode.Uri.joinPath(this._globalStorageUri, 'diff-temp');
		}
		
		// Fallback: use workspace hidden folder if global storage not available
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			return vscode.Uri.joinPath(workspaceFolder.uri, '.tmp-vscode-diff-checker');
		}
		
		// Last resort fallback
		return vscode.Uri.parse(`file:///tmp/vscode-diff-checker`);
	}

	/**
	 * Opens VS Code's built-in diff view with the two texts or files
	 */
	private async _openDiffView() {
		// Clean up old temp files first
		await this._cleanupTempFiles();

		// Ensure panel is in column 2 before opening diff
		if (this._panel) {
			this._panel.reveal(vscode.ViewColumn.Two);
		}

		// If we have file paths, use them directly (always read from files)
		if (this._filePathA && this._filePathB) {
			// Open diff - it will open in the active column, so we need to ensure column 1 is active first
			await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
			await new Promise(resolve => setTimeout(resolve, 100));
			
			await vscode.commands.executeCommand(
				'vscode.diff',
				this._filePathA,
				this._filePathB,
				`${this._filePathA.fsPath.split(/[/\\]/).pop()} ↔ ${this._filePathB.fsPath.split(/[/\\]/).pop()}`
			);
			// Wait a bit for diff to open
			await new Promise(resolve => setTimeout(resolve, 200));
			// Move to first column
			await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
			return;
		}

		// If we have file path A, use it with temp file for text B
		if (this._filePathA && this._textB !== '') {
			const tempDir = this._getTempDir();
			try {
				await vscode.workspace.fs.createDirectory(tempDir);
			} catch (error) {
				// Directory might already exist, ignore
			}

			const uriB = vscode.Uri.joinPath(tempDir, 'text-b.txt');
			const encoder = new TextEncoder();
			await vscode.workspace.fs.writeFile(uriB, encoder.encode(this._textB));
			this._tempFileB = uriB;

			// Focus column 1 first
			await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
			await new Promise(resolve => setTimeout(resolve, 100));

			await vscode.commands.executeCommand(
				'vscode.diff',
				this._filePathA,
				uriB,
				`${this._filePathA.fsPath.split(/[/\\]/).pop()} ↔ Text B`
			);
			// Wait a bit for diff to open
			await new Promise(resolve => setTimeout(resolve, 200));
			// Move to first column
			await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
			return;
		}

		if (this._filePathB && this._textA !== '') {
			const tempDir = this._getTempDir();
			try {
				await vscode.workspace.fs.createDirectory(tempDir);
			} catch (error) {
				// Directory might already exist, ignore
			}

			const uriA = vscode.Uri.joinPath(tempDir, 'text-a.txt');
			const encoder = new TextEncoder();
			await vscode.workspace.fs.writeFile(uriA, encoder.encode(this._textA));
			this._tempFileA = uriA;

			// Focus column 1 first
			await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
			await new Promise(resolve => setTimeout(resolve, 100));

			await vscode.commands.executeCommand(
				'vscode.diff',
				uriA,
				this._filePathB,
				`Text A ↔ ${this._filePathB.fsPath.split(/[/\\]/).pop()}`
			);
			// Wait a bit for diff to open
			await new Promise(resolve => setTimeout(resolve, 200));
			// Move to first column
			await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
			return;
		}

		// Otherwise, use text from boxes
		if (this._textA === '' && this._textB === '') {
			vscode.window.showWarningMessage('Both text boxes are empty.');
			return;
		}

		const tempDir = this._getTempDir();

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

		// Focus column 1 first
		await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
		await new Promise(resolve => setTimeout(resolve, 100));

		// Open diff view
		await vscode.commands.executeCommand(
			'vscode.diff',
			uriA,
			uriB,
			'Text A ↔ Text B'
		);
		// Wait a bit for diff to open
		await new Promise(resolve => setTimeout(resolve, 200));
		// Move to first column
		await vscode.commands.executeCommand('workbench.action.moveEditorToFirstColumn');
	}

	/**
	 * Opens a file dialog to select a file for either side
	 */
	private async _openFileDialog(target: 'a' | 'b') {
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			openLabel: 'Select File',
			filters: {
				'All files': ['*']
			}
		};
		const fileUri = await vscode.window.showOpenDialog(options);
		if (fileUri && fileUri[0]) {
			const content = await vscode.workspace.fs.readFile(fileUri[0]);
			const text = new TextDecoder().decode(content);
			const fileName = fileUri[0].path.split(/[/\\]/).pop() || 'File';
			const command = target === 'a' ? 'setTextA' : 'setTextB';
			
			if (target === 'a') {
				this._textA = text;
				this._filePathA = fileUri[0];
			} else {
				this._textB = text;
				this._filePathB = fileUri[0];
			}

			if (this._panel) {
				this._panel.webview.postMessage({
					command: command,
					text: text,
					fileName: fileName
				});
			}
		}
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
							<div class="header-actions">
								<button class="open-file-btn" id="openFileA" title="Load from active editor">↑ Active</button>
								<button class="open-file-btn" id="openFileDialogA" title="Select file from disk">📁 Browse...</button>
							</div>
						</div>
						<div class="header-item">
							<span class="header-label">Changed text</span>
							<div class="header-actions">
								<button class="open-file-btn" id="openFileB" title="Load from active editor">↑ Active</button>
								<button class="open-file-btn" id="openFileDialogB" title="Select file from disk">📁 Browse...</button>
							</div>
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
						</div>
						
						<div class="textbox-wrapper">
							<div class="textarea-container">
								<div class="line-numbers" id="lineNumbersB"></div>
								<textarea id="textB" placeholder="Paste or type text here" spellcheck="false"></textarea>
							</div>
							<div class="line-count" id="lineCountB">0 lines</div>
							<button class="reset-btn" id="resetB">Reset</button>
						</div>
					</div>
					
					<div class="result-container" id="resultContainer">
						<span class="result-message" id="resultMessage"></span>
					</div>

					<div class="options-row">
						<label><input type="checkbox" id="ignoreWhitespace"> Ignore whitespace</label>
						<label><input type="checkbox" id="ignoreCase"> Ignore case</label>
						<label><input type="checkbox" id="ignoreBlankLines"> Ignore blank lines</label>
					</div>

					<div class="button-container">
						<button class="compare-btn" id="compareBtn">See differences</button>
					</div>
					
					<div class="diff-view" id="diffView">
						<div class="diff-view-header">
							<span class="diff-col-header">Original</span>
							<span class="diff-col-header">Changed</span>
						</div>
						<div class="diff-view-body">
							<div class="diff-col" id="diffColA"></div>
							<div class="diff-col" id="diffColB"></div>
						</div>
						<div class="vscode-diff-container">
							<button class="vscode-diff-btn" id="vscodeDiffBtn">Open in VS Code's diff editor</button>
						</div>
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

	const provider = new DiffCheckerProvider(context, context.extensionUri, context.globalStorageUri);

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
