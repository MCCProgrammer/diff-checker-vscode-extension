(function() {
	const vscode = acquireVsCodeApi();
	
	// Initialize when DOM is ready
	function init() {
		const textA = document.getElementById('textA');
		const textB = document.getElementById('textB');
		const lineNumbersA = document.getElementById('lineNumbersA');
		const lineNumbersB = document.getElementById('lineNumbersB');
		const lineCountA = document.getElementById('lineCountA');
		const lineCountB = document.getElementById('lineCountB');
		const compareBtn = document.getElementById('compareBtn');
		const resetBtnA = document.getElementById('resetA');
		const resetBtnB = document.getElementById('resetB');
		const openFileA = document.getElementById('openFileA');
		const openFileB = document.getElementById('openFileB');
		const resultContainer = document.getElementById('resultContainer');
		const resultMessage = document.getElementById('resultMessage');
		const diffView = document.getElementById('diffView');
		const diffColA = document.getElementById('diffColA');
		const diffColB = document.getElementById('diffColB');
		const vscodeDiffBtn = document.getElementById('vscodeDiffBtn');
		const openFileDialogA = document.getElementById('openFileDialogA');
		const openFileDialogB = document.getElementById('openFileDialogB');
		
		if (!textA || !textB || !lineNumbersA || !lineNumbersB) {
			console.error('Required elements not found');
			return;
		}
		
		// Function to update line numbers and word count
		function updateLineNumbers(textarea, lineNumbersElement, lineCountElement) {
			const lines = textarea.value.split('\n');
			const lineCount = lines.length;
			
			// Calculate word count
			const words = textarea.value.split(/\s+/).filter(w => w.trim() !== '').length;
			
			// Update line numbers
			let lineNumbersHtml = '';
			for (let i = 1; i <= lineCount; i++) {
				lineNumbersHtml += '<div>' + i + '</div>';
			}
			lineNumbersElement.innerHTML = lineNumbersHtml;
			
			// Update line count and word count
			lineCountElement.innerHTML = '<span>' + lineCount + ' line' + (lineCount !== 1 ? 's' : '') + '</span>' +
				'<span>' + words + ' word' + (words !== 1 ? 's' : '') + '</span>';
			
			// Sync scroll
			lineNumbersElement.scrollTop = textarea.scrollTop;
		}
		
		/**
		 * Renders the side-by-side diff view with colorful line highlights.
		 * @param {Array<{value: string, added: boolean, removed: boolean}>} diffData
		 */
		function escapeHtml(text) {
			return text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		}

		// One side of a row: line number, sign and the text, with changed words highlighted
		function sideHtml(side, kind) {
			if (!side) {
				return '<div class="diff-line spacer"></div>';
			}
			const sign = kind === 'removed' ? '−' : kind === 'added' ? '+' : ' ';
			const changedClass = kind === 'removed' ? 'chg-removed' : 'chg-added';
			const text = side.segments
				.map(segment => segment.changed
					? '<span class="' + changedClass + '">' + escapeHtml(segment.text) + '</span>'
					: escapeHtml(segment.text))
				.join('');
			return '<div class="diff-line ' + kind + '">' +
				'<span class="diff-line-num">' + side.num + '</span>' +
				'<span class="diff-sign">' + sign + '</span>' +
				'<span class="diff-text">' + text + '</span>' +
				'</div>';
		}

		/**
		 * Renders the side-by-side diff: changed lines face each other, changed words are highlighted.
		 * @param {Array<{type: string, left?: object, right?: object}>} rows
		 */
		function renderDiff(rows) {
			if (!diffView) { return; }

			const body = diffView.querySelector('.diff-view-body');
			if (!body) { return; }
			diffView.style.display = 'block';

			body.innerHTML = rows.map(row => {
				let left;
				let right;
				if (row.type === 'unchanged') {
					left = sideHtml(row.left, 'unchanged');
					right = sideHtml(row.right, 'unchanged');
				} else if (row.type === 'ignored') {
					left = sideHtml(row.left, 'ignored');
					right = sideHtml(row.right, 'ignored');
				} else {
					left = sideHtml(row.left, 'removed');
					right = sideHtml(row.right, 'added');
				}
				return '<div class="diff-row">' + left + right + '</div>';
			}).join('');
		}

		// Ignore options, remembered between sessions
		const optionIds = ['ignoreWhitespace', 'ignoreCase', 'ignoreBlankLines'];
		const savedState = vscode.getState() || {};
		optionIds.forEach(id => {
			const checkbox = document.getElementById(id);
			if (!checkbox) { return; }
			checkbox.checked = !!(savedState.options && savedState.options[id]);
			checkbox.addEventListener('change', () => {
				vscode.setState(Object.assign({}, vscode.getState(), { options: currentOptions() }));
				// Compare again if a result is already shown
				if (resultContainer && resultContainer.style.display === 'block') {
					compare();
				}
			});
		});

		function currentOptions() {
			const options = {};
			optionIds.forEach(id => {
				const checkbox = document.getElementById(id);
				options[id] = !!(checkbox && checkbox.checked);
			});
			return options;
		}

		function compare() {
			vscode.postMessage({
				command: 'compare',
				options: currentOptions()
			});
		}

		// Update text A
		textA.addEventListener('input', () => {
			updateLineNumbers(textA, lineNumbersA, lineCountA);
			vscode.postMessage({
				command: 'updateTextA',
				text: textA.value
			});
		});
		
		// Update text B
		textB.addEventListener('input', () => {
			updateLineNumbers(textB, lineNumbersB, lineCountB);
			vscode.postMessage({
				command: 'updateTextB',
				text: textB.value
			});
		});
		
		// Sync scroll for line numbers
		textA.addEventListener('scroll', () => {
			lineNumbersA.scrollTop = textA.scrollTop;
		});
		
		textB.addEventListener('scroll', () => {
			lineNumbersB.scrollTop = textB.scrollTop;
		});
		
		// Compare button
		compareBtn.addEventListener('click', compare);

		// VSCode diff button
		if (vscodeDiffBtn) {
			vscodeDiffBtn.addEventListener('click', () => {
				vscode.postMessage({
					command: 'openDiffView'
				});
			});
		}
		
		// Reset buttons
		resetBtnA.addEventListener('click', () => {
			textA.value = '';
			updateLineNumbers(textA, lineNumbersA, lineCountA);
			// Reset height
			textA.style.height = '';
			const containerA = textA.closest('.textarea-container');
			if (containerA) {
				containerA.style.height = '';
			}
			// Reset header label and button
			const headerLabelA = document.querySelector('.header-item:first-child .header-label');
			if (headerLabelA) {
				headerLabelA.textContent = 'Original text';
			}
			if (openFileA) {
				openFileA.textContent = '↑ Open file';
				openFileA.classList.remove('loaded');
			}
			// Hide result and diff view
			resultContainer.style.display = 'none';
			if (diffView) { diffView.style.display = 'none'; }
			vscode.postMessage({
				command: 'resetA'
			});
		});
		
		resetBtnB.addEventListener('click', () => {
			textB.value = '';
			updateLineNumbers(textB, lineNumbersB, lineCountB);
			// Reset height
			textB.style.height = '';
			const containerB = textB.closest('.textarea-container');
			if (containerB) {
				containerB.style.height = '';
			}
			// Reset header label and button
			const headerLabelB = document.querySelector('.header-item:last-child .header-label');
			if (headerLabelB) {
				headerLabelB.textContent = 'Changed text';
			}
			if (openFileB) {
				openFileB.textContent = '↑ Open file';
				openFileB.classList.remove('loaded');
			}
			// Hide result and diff view
			resultContainer.style.display = 'none';
			if (diffView) { diffView.style.display = 'none'; }
			vscode.postMessage({
				command: 'resetB'
			});
		});
		
		// Initialize line numbers on load
		updateLineNumbers(textA, lineNumbersA, lineCountA);
		updateLineNumbers(textB, lineNumbersB, lineCountB);
		
		// Ensure all result elements are hidden on initial load
		resultContainer.style.display = 'none';
		if (diffView) { diffView.style.display = 'none'; }
		
		// Open file buttons
		openFileA.addEventListener('click', () => {
			vscode.postMessage({
				command: 'loadSelectionA'
			});
		});
		
		openFileB.addEventListener('click', () => {
			vscode.postMessage({
				command: 'loadSelectionB'
			});
		});
		
		if (openFileDialogA) {
			openFileDialogA.addEventListener('click', () => {
				vscode.postMessage({
					command: 'openFileDialogA'
				});
			});
		}

		if (openFileDialogB) {
			openFileDialogB.addEventListener('click', () => {
				vscode.postMessage({
					command: 'openFileDialogB'
				});
			});
		}
		
		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			
			switch (message.command) {
				case 'setTextA':
					textA.value = message.text;
					updateLineNumbers(textA, lineNumbersA, lineCountA);
					// Update header label and button if fileName is provided
					if (message.fileName) {
						const headerLabelA = document.querySelector('.header-item:first-child .header-label');
						if (headerLabelA) {
							headerLabelA.textContent = `Original text (${message.fileName})`;
						}
						if (openFileA) {
							openFileA.textContent = `✓ ${message.fileName}`;
							openFileA.classList.add('loaded');
						}
					}
					break;
				case 'setTextB':
					textB.value = message.text;
					updateLineNumbers(textB, lineNumbersB, lineCountB);
					// Update header label and button if fileName is provided
					if (message.fileName) {
						const headerLabelB = document.querySelector('.header-item:last-child .header-label');
						if (headerLabelB) {
							headerLabelB.textContent = `Changed text (${message.fileName})`;
						}
						if (openFileB) {
							openFileB.textContent = `✓ ${message.fileName}`;
							openFileB.classList.add('loaded');
						}
					}
					break;
				case 'showResult':
					resultMessage.textContent = message.message;
					resultContainer.style.display = 'block';
					
					if (message.isIdentical) {
						resultMessage.className = 'result-message identical';
						if (diffView) { diffView.style.display = 'none'; }
					} else {
						resultMessage.className = 'result-message different';
						// Render the side-by-side diff
						if (message.rows && diffView) {
							renderDiff(message.rows);
						}
					}
					break;
			}
		});
	}
	
	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
