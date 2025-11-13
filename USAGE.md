# Diff Checker - Usage Guide

## 📖 Overview

The **Diff Checker** extension allows you to compare two texts side-by-side with difference highlighting and VS Code diff view integration. It's perfect for comparing code snippets, configuration files, or any text content.

## 🚀 Getting Started

### Opening Diff Checker

There are two ways to open the Diff Checker:

#### 1. **Keyboard Shortcut** (Recommended)
- Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)
- The Diff Checker panel opens in column 2

#### 2. **Command Palette**
- Press `F1` or `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- Type "Show Diff Checker" and press Enter

## 📝 Using Diff Checker

### Adding Text to Compare

#### Method 1: Manual Input
1. Click in the "Original text" textbox (left side)
2. Type or paste your first text
3. Click in the "Changed text" textbox (right side)
4. Type or paste your second text

#### Method 2: Load from Active File
1. Click the **"↑ Open file"** button above a textbox
2. If no text is selected, it loads the entire active file
3. The file name appears in the header (e.g., "Original text (file.txt)")

#### Method 3: Load Selected Text
1. Select text in your active editor
2. Click **"↑ Open file"** button
3. The selected text is loaded into the textbox

#### Method 4: Smart Loading on Open
When you open Diff Checker with text selected:
- **Both boxes empty** → Text goes to "Original text" (left)
- **"Original text" has content** → Text goes to "Changed text" (right)

### Finding Differences

1. After adding text to both boxes, click the **"Find difference"** button
2. The extension will:
   - Compare the two texts
   - Show if they are identical (✅) or different (❌)
   - Display the number of difference blocks found
   - Show total lines and words for each text

### Understanding Difference Blocks

**Difference blocks** are contiguous sections of changes between the two texts. For example:

- **Text A**: 10 lines
- **Text B**: 12 lines  
- **2 difference blocks found** means there are 2 separate sections where changes occurred

Each block can contain multiple lines that were added or removed.

### Viewing Differences in VS Code

1. After clicking "Find difference", if differences are found, a **"See Differences"** link appears
2. Click the link to open VS Code's built-in diff editor
3. The diff opens in **column 1** (left side)
4. The Diff Checker panel stays in **column 2** (right side) for reference

### Resetting

- Click **"Reset"** below any textbox to:
  - Clear the textbox content
  - Reset line and word counts
  - Reset height to default
  - Clear file name from header

## 📊 Understanding the Interface

### Line Numbers
- Line numbers appear on the left side of each textbox
- They scroll synchronously with the text
- Helpful for referencing specific lines

### Statistics Display
Above each Reset button, you'll see:
- **Left side**: Total number of lines (e.g., "10 lines")
- **Right side**: Total number of words (e.g., "45 words")

### Result Message
After clicking "Find difference":
- **✅ Texts are identical!** - No differences found
- **❌ X difference block(s) found.** - Shows number of difference blocks
- **"See Differences"** link appears when differences are found

## 🎯 Common Use Cases

### Compare Two Code Files
1. Open Diff Checker (`Ctrl+Shift+D`)
2. Click "↑ Open file" above "Original text"
3. Switch to another file
4. Click "↑ Open file" above "Changed text"
5. Click "Find difference"
6. Click "See Differences" to view in VS Code diff editor

### Compare Code Snippets
1. Select code snippet A in your editor
2. Open Diff Checker (`Ctrl+Shift+D`) - snippet loads automatically
3. Select code snippet B
4. Click "↑ Open file" above "Changed text" - snippet B loads
5. Click "Find difference"

### Compare Configuration Files
1. Open Diff Checker
2. Load first config file using "↑ Open file"
3. Load second config file using "↑ Open file"
4. Compare and view differences

### Quick Text Comparison
1. Copy text A to clipboard
2. Open Diff Checker
3. Paste into "Original text"
4. Copy text B to clipboard
5. Paste into "Changed text"
6. Click "Find difference"

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | Open Diff Checker |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Command Palette (then type "Show Diff Checker") |

## 💡 Tips & Tricks

1. **Quick Access**: Use `Ctrl+Shift+D` for instant access
2. **Smart Loading**: Select text before opening for automatic loading
3. **File Tracking**: The extension remembers the last active file, so "Open file" works even when the preview has focus
4. **Line Reference**: Use line numbers to quickly identify where differences occur
5. **VS Code Diff**: Use "See Differences" to leverage VS Code's powerful diff editor
6. **Reset Quickly**: Use Reset buttons to clear and start fresh

## 🔧 Technical Details

### Temporary Files
- Temporary files for diff view are created in the system temp directory
- Files are automatically cleaned up when the preview closes
- No files are created in your workspace

### Difference Detection
- Uses the `diff` library for text comparison
- Compares line by line
- Groups contiguous changes into blocks
- Shows count of difference blocks, not individual lines

### File Loading
- **With selection**: Loads selected text only
- **Without selection**: Loads entire file
- **Last active file**: Remembers last file you worked on

## 🐛 Troubleshooting

### Diff Checker doesn't open
- Check if VS Code version is 1.85.0 or higher
- Try using Command Palette instead of keyboard shortcut
- Check if extension is enabled

### "Open file" doesn't work
- Make sure you have an active editor open
- The extension remembers the last active file, even if preview has focus
- Try selecting text first, then clicking "Open file"

### Differences not showing correctly
- Make sure both textboxes have content
- Click "Find difference" button
- Check that texts are actually different

### VS Code diff doesn't open
- Make sure you clicked "Find difference" first
- Only appears when differences are found
- Requires a workspace folder for temporary files

## 📚 Additional Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [diff library documentation](https://github.com/kpdecker/jsdiff)

---

**Enjoy using Diff Checker!** 🎉
