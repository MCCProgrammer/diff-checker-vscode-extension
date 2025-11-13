# Change Log

All notable changes to the "Diff Checker" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.1] - 2025-01-13

### Fixed
- 🎨 **Fixed styling consistency**: Replaced CSS variables with fixed values to ensure consistent appearance across all VS Code themes
- 🔧 **Line numbers styling**: Fixed line numbers display to match VS Code dark theme appearance

## [0.1.0] - 2025-11-13

### Added
- ✨ **Initial Release**: Diff Checker extension for VS Code
- 📝 **Side-by-Side Text Comparison**: Compare two texts in a clean interface
- 🔍 **Difference Detection**: Automatically detects and counts difference blocks
- 📊 **Statistics Display**: Shows total lines and words for each text
- 🔢 **Line Numbers**: Visual line numbers with synchronized scrolling
- 📁 **File Loading**: Load entire files or selected text into comparison boxes
  - "Open file" button to load active file
  - Commands to load selected text
  - Smart loading based on current state
- 🎯 **VS Code Diff Integration**: Open differences in VS Code's built-in diff editor
  - Diff opens in column 1
  - Preview panel stays in column 2
- ⌨️ **Keyboard Shortcut**: `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to open
- 🎨 **Theme Integration**: Automatically adapts to VS Code theme
- 🔄 **Reset Functionality**: Reset buttons to clear textboxes and restore default state
- 💾 **Temporary Files**: Uses system temp directory (not workspace) for diff files
- 📈 **Difference Blocks**: Shows count of difference blocks (contiguous change sections)
- 🎯 **Last Active File Tracking**: Remembers last active file for "Open file" functionality

### Features
- Two textboxes for "Original text" and "Changed text"
- Line numbers display with scroll synchronization
- Line and word count display above each Reset button
- "Find difference" button to compare texts
- "See Differences" link to open VS Code diff view
- Result message showing if texts are identical or number of difference blocks
- File name display in header when file is loaded
- Height management: fixed height textboxes that reset on clear
