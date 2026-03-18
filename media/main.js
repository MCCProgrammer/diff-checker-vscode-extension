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
		function renderDiff(diffData) {
			if (!diffView || !diffColA || !diffColB) { return; }

			const body = diffView.querySelector('.diff-view-body');
			if (!body) return;
			body.innerHTML = '';
			diffView.style.display = 'block';

			let leftLineNum = 1;
			let rightLineNum = 1;

			diffData.forEach(part => {
				const lines = part.value.split('\n');
				if (lines[lines.length - 1] === '') { lines.pop(); }

				lines.forEach(line => {
					const row = document.createElement('div');
					row.className = 'diff-row';
					
					const escaped = line
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');

					if (part.removed) {
						row.innerHTML = `
							<div class="diff-line removed">
								<span class="diff-line-num">${leftLineNum++}</span>
								<span class="diff-sign">−</span>
								<span class="diff-text">${escaped}</span>
							</div>
							<div class="diff-line spacer"></div>
						`;
					} else if (part.added) {
						row.innerHTML = `
							<div class="diff-line spacer"></div>
							<div class="diff-line added">
								<span class="diff-line-num">${rightLineNum++}</span>
								<span class="diff-sign">+</span>
								<span class="diff-text">${escaped}</span>
							</div>
						`;
					} else {
						row.innerHTML = `
							<div class="diff-line unchanged">
								<span class="diff-line-num">${leftLineNum++}</span>
								<span class="diff-sign"> </span>
								<span class="diff-text">${escaped}</span>
							</div>
							<div class="diff-line unchanged">
								<span class="diff-line-num">${rightLineNum++}</span>
								<span class="diff-sign"> </span>
								<span class="diff-text">${escaped}</span>
							</div>
						`;
					}
					body.appendChild(row);
				});
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
		compareBtn.addEventListener('click', () => {
			vscode.postMessage({
				command: 'compare'
			});
		});

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
						// Render inline colored diff
						if (message.diffData && diffView) {
							renderDiff(message.diffData);
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
