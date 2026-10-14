import * as diff from 'diff';

export interface DiffOptions {
	ignoreWhitespace?: boolean;
	ignoreCase?: boolean;
	ignoreBlankLines?: boolean;
}

// A piece of a line; `changed` marks the words that differ in a modified line
export interface Segment {
	text: string;
	changed: boolean;
}

export interface DiffSide {
	num: number;
	segments: Segment[];
}

// One row of the side-by-side view
export interface DiffRow {
	type: 'unchanged' | 'removed' | 'added' | 'modified' | 'ignored';
	left?: DiffSide;
	right?: DiffSide;
}

export interface DiffResult {
	rows: DiffRow[];
	blocks: number; // Groups of consecutive changed lines
	modified: number;
	added: number;
	removed: number;
}

function splitLines(text: string): string[] {
	const lines = text.split('\n');
	if (lines.length > 1 && lines[lines.length - 1] === '') {
		lines.pop();
	}
	return lines;
}

function normalize(line: string, options: DiffOptions): string {
	let value = options.ignoreWhitespace ? line.replace(/\s+/g, ' ').trim() : line;
	if (options.ignoreCase) {
		value = value.toLowerCase();
	}
	return value;
}

function whole(text: string): Segment[] {
	return [{ text, changed: false }];
}

/**
 * Pairs an old line with its new version and marks the words that changed on each side
 */
function wordDiff(oldLine: string, newLine: string, options: DiffOptions): { left: Segment[]; right: Segment[] } {
	const parts = options.ignoreWhitespace
		? diff.diffWords(oldLine, newLine, { ignoreCase: !!options.ignoreCase })
		: diff.diffWordsWithSpace(oldLine, newLine, { ignoreCase: !!options.ignoreCase } as any);
	const left: Segment[] = [];
	const right: Segment[] = [];
	for (const part of parts) {
		// Spaces never count as a change when whitespace is ignored
		const changed = !(options.ignoreWhitespace && part.value.trim() === '');
		if (part.removed) {
			left.push({ text: part.value, changed });
		} else if (part.added) {
			right.push({ text: part.value, changed });
		} else {
			left.push({ text: part.value, changed: false });
			right.push({ text: part.value, changed: false });
		}
	}
	return { left, right };
}

/**
 * Compares two texts line by line, pairing changed lines side by side
 */
export function computeDiff(textA: string, textB: string, options: DiffOptions = {}): DiffResult {
	const linesA = splitLines(textA);
	const linesB = splitLines(textB);
	const parts = diff.diffArrays(
		linesA.map(line => normalize(line, options)),
		linesB.map(line => normalize(line, options))
	);

	const result: DiffResult = { rows: [], blocks: 0, modified: 0, added: 0, removed: 0 };
	let a = 0;
	let b = 0;
	let inBlock = false;
	const isBlank = (line: string) => line.trim() === '';

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const count = part.count ?? part.value.length;

		if (!part.added && !part.removed) {
			for (let k = 0; k < count; k++) {
				result.rows.push({
					type: 'unchanged',
					left: { num: a + 1, segments: whole(linesA[a]) },
					right: { num: b + 1, segments: whole(linesB[b]) }
				});
				a++;
				b++;
			}
			inBlock = false;
			continue;
		}

		// A removed block followed by an added block is a modification: pair the lines
		let removedLines: number[] = [];
		let addedLines: number[] = [];
		if (part.removed) {
			removedLines = Array.from({ length: count }, (_, k) => a + k);
			a += count;
			const next = parts[i + 1];
			if (next && next.added) {
				const nextCount = next.count ?? next.value.length;
				addedLines = Array.from({ length: nextCount }, (_, k) => b + k);
				b += nextCount;
				i++;
			}
		} else {
			addedLines = Array.from({ length: count }, (_, k) => b + k);
			b += count;
		}

		// Rows of this block, sorted by their position in the block at the end
		const blockRows: { order: number; row: DiffRow }[] = [];
		const removedOrder = new Map(removedLines.map((n, k) => [n, k]));
		const addedOrder = new Map(addedLines.map((n, k) => [n, k]));

		// Blank lines are never paired with text: they are shown on their own,
		// and don't count as differences when blank lines are ignored
		const blankRows: DiffRow[] = [];
		const blankType = options.ignoreBlankLines ? 'ignored' : undefined;
		for (const index of removedLines.filter(n => isBlank(linesA[n]))) {
			blankRows.push({ type: blankType || 'removed', left: { num: index + 1, segments: whole(linesA[index]) } });
		}
		for (const index of addedLines.filter(n => isBlank(linesB[n]))) {
			blankRows.push({ type: blankType || 'added', right: { num: index + 1, segments: whole(linesB[index]) } });
		}
		const blankRemoved = options.ignoreBlankLines ? 0 : removedLines.filter(n => isBlank(linesA[n])).length;
		const blankAdded = options.ignoreBlankLines ? 0 : addedLines.filter(n => isBlank(linesB[n])).length;
		removedLines = removedLines.filter(n => !isBlank(linesA[n]));
		addedLines = addedLines.filter(n => !isBlank(linesB[n]));

		const paired = Math.min(removedLines.length, addedLines.length);
		for (let k = 0; k < paired; k++) {
			const oldIndex = removedLines[k];
			const newIndex = addedLines[k];
			const words = wordDiff(linesA[oldIndex], linesB[newIndex], options);
			blockRows.push({
				order: Math.max(removedOrder.get(oldIndex)!, addedOrder.get(newIndex)!),
				row: {
					type: 'modified',
					left: { num: oldIndex + 1, segments: words.left },
					right: { num: newIndex + 1, segments: words.right }
				}
			});
		}
		for (const index of removedLines.slice(paired)) {
			blockRows.push({ order: removedOrder.get(index)!, row: { type: 'removed', left: { num: index + 1, segments: whole(linesA[index]) } } });
		}
		for (const index of addedLines.slice(paired)) {
			blockRows.push({ order: addedOrder.get(index)!, row: { type: 'added', right: { num: index + 1, segments: whole(linesB[index]) } } });
		}
		for (const row of blankRows) {
			const order = row.left ? removedOrder.get(row.left.num - 1)! : addedOrder.get(row.right!.num - 1)!;
			blockRows.push({ order, row });
		}
		// Stable sort: rows keep their order when positions are equal
		blockRows.sort((x, y) => x.order - y.order);
		result.rows.push(...blockRows.map(item => item.row));

		result.modified += paired;
		result.removed += removedLines.length - paired + blankRemoved;
		result.added += addedLines.length - paired + blankAdded;
		const changed = removedLines.length + addedLines.length + blankRemoved + blankAdded > 0;
		if (changed && !inBlock) {
			result.blocks++;
		}
		inBlock = inBlock || changed;
	}

	return result;
}

/**
 * Sentence describing the result, e.g. "3 differences: 2 changed lines, 1 added"
 */
export function describeDiff(result: DiffResult): string {
	const parts: string[] = [];
	if (result.modified) {
		parts.push(`${result.modified} changed line${result.modified !== 1 ? 's' : ''}`);
	}
	if (result.added) {
		parts.push(`${result.added} added`);
	}
	if (result.removed) {
		parts.push(`${result.removed} removed`);
	}
	return `${result.blocks} difference${result.blocks !== 1 ? 's' : ''}: ${parts.join(', ')}`;
}
