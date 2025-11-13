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
		const diffLink = document.getElementById('diffLink');
		const statsA = document.getElementById('statsA');
		const statsB = document.getElementById('statsB');
		
		if (!textA || !textB || !lineNumbersA || !lineNumbersB) {
			console.error('Required elements not found');
			return;
		}
		
		// Function to render statistics
		function renderStatistics(container, stats, side) {
			if (!stats || !container) return;
			
			const linesTotal = side === 'A' ? stats.lines.totalA : stats.lines.totalB;
			const wordsTotal = side === 'A' ? stats.words.totalA : stats.words.totalB;
			
			const statsHtml = `
				<div class="stats-header">
					<span class="stats-label">${side === 'A' ? 'Original' : 'Changed'}</span>
				</div>
				<div class="stats-section">
					<div class="stats-title">Lines</div>
					<div class="stats-row">
						<span class="stats-label">Total</span>
						<span class="stats-value">${linesTotal}</span>
					</div>
				</div>
				<div class="stats-section">
					<div class="stats-title">Words</div>
					<div class="stats-row">
						<span class="stats-label">Total</span>
						<span class="stats-value">${wordsTotal}</span>
					</div>
				</div>
			`;
			container.innerHTML = statsHtml;
		}
		
		// Function to update line numbers
		function updateLineNumbers(textarea, lineNumbersElement, lineCountElement) {
			const lines = textarea.value.split('\n');
			const lineCount = lines.length;
			
			// Update line numbers
			let lineNumbersHtml = '';
			for (let i = 1; i <= lineCount; i++) {
				lineNumbersHtml += '<div>' + i + '</div>';
			}
			lineNumbersElement.innerHTML = lineNumbersHtml;
			
			// Update line count
			lineCountElement.textContent = lineCount + ' line' + (lineCount !== 1 ? 's' : '');
			
			// Sync scroll
			lineNumbersElement.scrollTop = textarea.scrollTop;
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
			// Hide statistics, diff link and result container
			statsA.style.display = 'none';
			diffLink.style.display = 'none';
			resultContainer.style.display = 'none';
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
			// Hide statistics, diff link and result container
			statsB.style.display = 'none';
			diffLink.style.display = 'none';
			resultContainer.style.display = 'none';
			vscode.postMessage({
				command: 'resetB'
			});
		});
		
		// Initialize line numbers on load
		updateLineNumbers(textA, lineNumbersA, lineCountA);
		updateLineNumbers(textB, lineNumbersB, lineCountB);
		
		// Ensure all result elements are hidden on initial load
		resultContainer.style.display = 'none';
		diffLink.style.display = 'none';
		statsA.style.display = 'none';
		statsB.style.display = 'none';
		
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
		
		// See differences button
		diffLink.addEventListener('click', (e) => {
			e.preventDefault();
			vscode.postMessage({
				command: 'openDiffView'
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
						// Hide diff link
						diffLink.style.display = 'none';
						// Hide statistics
						statsA.style.display = 'none';
						statsB.style.display = 'none';
					} else {
						resultMessage.className = 'result-message different';
						// Show diff link after the message
						diffLink.style.display = 'inline';
						
						// Show statistics if available
						if (message.statistics) {
							renderStatistics(statsA, message.statistics, 'A');
							renderStatistics(statsB, message.statistics, 'B');
							statsA.style.display = 'block';
							statsB.style.display = 'block';
						} else {
							statsA.style.display = 'none';
							statsB.style.display = 'none';
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
