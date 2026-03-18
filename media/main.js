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

			// Build left (Original) and right (Changed) line arrays
			const leftLines = [];
			const rightLines = [];

			diffData.forEach(part => {
				const lines = part.value.split('\n');
				// The diff library includes a trailing empty entry when the part ends with \n
				if (lines[lines.length - 1] === '') { lines.pop(); }

				if (part.removed) {
					// Only in original (left side)
					lines.forEach(line => {
						leftLines.push({ text: line, type: 'removed' });
						rightLines.push({ text: '', type: 'spacer' });
					});
				} else if (part.added) {
					// Only in changed (right side)
					lines.forEach(line => {
						leftLines.push({ text: '', type: 'spacer' });
						rightLines.push({ text: line, type: 'added' });
					});
				} else {
					// Unchanged – shown on both sides
					lines.forEach(line => {
						leftLines.push({ text: line, type: 'unchanged' });
						rightLines.push({ text: line, type: 'unchanged' });
					});
				}
			});

			function buildColHtml(lines) {
				return lines.map((l, i) => {
					const lineNum = i + 1;
					const escaped = l.text
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');

					if (l.type === 'removed') {
						return `<div class="diff-line removed"><span class="diff-line-num">${lineNum}</span><span class="diff-sign">−</span><span class="diff-text">${escaped}</span></div>`;
					} else if (l.type === 'added') {
						return `<div class="diff-line added"><span class="diff-line-num">${lineNum}</span><span class="diff-sign">+</span><span class="diff-text">${escaped}</span></div>`;
					} else if (l.type === 'spacer') {
						return `<div class="diff-line spacer"><span class="diff-line-num"></span><span class="diff-sign"></span><span class="diff-text"></span></div>`;
					} else {
						return `<div class="diff-line unchanged"><span class="diff-line-num">${lineNum}</span><span class="diff-sign"> </span><span class="diff-text">${escaped}</span></div>`;
					}
				}).join('');
			}

			diffColA.innerHTML = buildColHtml(leftLines);
			diffColB.innerHTML = buildColHtml(rightLines);
			diffView.style.display = 'block';
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
			// Reset header label
			const headerLabelA = document.querySelector('.header-item:first-child .header-label');
			if (headerLabelA) {
				headerLabelA.textContent = 'Original text';
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
			// Reset header label
			const headerLabelB = document.querySelector('.header-item:last-child .header-label');
			if (headerLabelB) {
				headerLabelB.textContent = 'Changed text';
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
		
		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			
			switch (message.command) {
				case 'setTextA':
					textA.value = message.text;
					updateLineNumbers(textA, lineNumbersA, lineCountA);
					// Update header label if fileName is provided
					if (message.fileName) {
						const headerLabelA = document.querySelector('.header-item:first-child .header-label');
						if (headerLabelA) {
							headerLabelA.textContent = `Original text (${message.fileName})`;
						}
					}
					vscode.postMessage({
						command: 'updateTextA',
						text: message.text
					});
					break;
				case 'setTextB':
					textB.value = message.text;
					updateLineNumbers(textB, lineNumbersB, lineCountB);
					// Update header label if fileName is provided
					if (message.fileName) {
						const headerLabelB = document.querySelector('.header-item:last-child .header-label');
						if (headerLabelB) {
							headerLabelB.textContent = `Changed text (${message.fileName})`;
						}
					}
					vscode.postMessage({
						command: 'updateTextB',
						text: message.text
					});
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
