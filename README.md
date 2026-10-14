# Diff Checker

A Visual Studio Code extension that allows you to compare two texts side-by-side with difference highlighting and VS Code diff view integration.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/MCCProgrammer.diff-checker?label=VS%20Code%20Marketplace&logo=visualstudiocode&style=flat-square&color=1f2328)](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.diff-checker)
[![Open VSX](https://img.shields.io/open-vsx/v/MCCProgrammer/diff-checker?label=Open%20VSX&logo=eclipseide&style=flat-square&color=1f2328)](https://open-vsx.org/extension/MCCProgrammer/diff-checker)

[![Support me on Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20me-FF5E5B?logo=ko-fi&logoColor=white&style=flat-square)](https://ko-fi.com/mccprogrammer)

## ✨ Features

- 📝 **Side-by-Side Comparison**: Compare two texts in a clean, organized interface
- 🔍 **Difference Detection**: Automatically detects and counts difference blocks between texts
- 📊 **Statistics**: Shows total lines and words for each text
- 🔢 **Line Numbers**: Visual line numbers for easy reference
- 📁 **File Support**: Load entire files or selected text into comparison boxes
- 🎯 **VS Code Diff Integration**: Open differences in VS Code's built-in diff editor
- ⌨️ **Keyboard Shortcut**: Quick access with `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)
- 🎨 **VS Code Theme Integration**: Automatically adapts to your VS Code theme

## 🚀 Installation

Install it from the [**VS Code Marketplace**](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.diff-checker), or from [**Open VSX**](https://open-vsx.org/extension/MCCProgrammer/diff-checker) if you use VSCodium, Cursor, Windsurf or another editor based on VS Code.

Or from inside the editor:

1. Open VS Code
2. Go to Extensions section (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Diff Checker"
4. Click "Install"

## 📖 How to Use

### Open Diff Checker

There are two ways to open the Diff Checker:

1. **Keyboard Shortcut**: Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)
2. **Command Palette**: Press `F1` or `Ctrl+Shift+P` and type "Show Diff Checker"

### Compare Texts

1. **Manual Input**: Type or paste text directly into the "Original text" and "Changed text" boxes
2. **Load from Editor**: 
   - Click "↑ Open file" button above each textbox to load the active file
   - Or use commands "Load Selection to Text A" / "Load Selection to Text B" to load selected text
3. **Smart Loading**: When opening Diff Checker with text selected:
   - If both boxes are empty → loads into "Original text"
   - If "Original text" has content → loads into "Changed text"

### Find Differences

1. Click the **"Find difference"** button
2. The extension will:
   - Show if texts are identical or different
   - Display the number of difference blocks found
   - Show total lines and words for each text

### View Differences in VS Code

1. After finding differences, click **"See Differences"** link
2. VS Code's built-in diff editor opens in column 1
3. The Diff Checker panel stays in column 2 for reference

### Reset

- Click **"Reset"** button below each textbox to clear its content
- Resets line count, word count, and height

## ⚙️ Features Details

### Difference Blocks

The extension counts "difference blocks" - contiguous sections of changes between the two texts. Each block can contain multiple lines that were added or removed.

**Example:**
- If you have 2 separate sections with changes, it shows "2 difference blocks found"
- This is more meaningful than counting individual lines, as it shows how many distinct areas differ

### Statistics

Each textbox displays:
- **Left side**: Total number of lines (e.g., "10 lines")
- **Right side**: Total number of words (e.g., "45 words")

### File Loading

- **"↑ Open file" button**: Loads the entire active file when no text is selected
- **With selection**: Loads only the selected text
- **Last active file**: Remembers the last file you were working on, so "Open file" uses that file even if the preview panel has focus

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | Open Diff Checker |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Command Palette (then type "Show Diff Checker") |

## 📚 Requirements

- Visual Studio Code 1.85.0 or higher

## 🐛 Known Issues

No known issues at this time.

## 📝 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

## 📬 Contact & Support

Questions, feedback or ideas: [contact@mccprogrammer.com](mailto:contact@mccprogrammer.com).

If the extension helps you, a coffee on [Ko-fi](https://ko-fi.com/mccprogrammer) makes a big difference.

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request in the repository.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [diff](https://github.com/kpdecker/jsdiff) library for text comparison
- VS Code Extension API

---

**Enjoy the Diff Checker extension!** 🎉
