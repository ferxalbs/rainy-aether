use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// Keyboard shortcut definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardShortcut {
    pub id: String,
    pub label: String,
    pub description: String,
    pub keys: Vec<String>, // Multiple key combinations per platform
    pub category: String,
    pub when: Option<String>, // Context when shortcut is active
}

/// Help documentation link
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentationLink {
    pub id: String,
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

/// Get all keyboard shortcuts
#[tauri::command]
pub fn get_keyboard_shortcuts() -> Result<Vec<KeyboardShortcut>, String> {
    let shortcuts = vec![
        // File operations
        KeyboardShortcut {
            id: "file.new".to_string(),
            label: "New File".to_string(),
            description: "Create a new file".to_string(),
            keys: vec!["Ctrl+N".to_string(), "Cmd+N".to_string()],
            category: "File".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "file.open".to_string(),
            label: "Open File".to_string(),
            description: "Open a file or project".to_string(),
            keys: vec!["Ctrl+O".to_string(), "Cmd+O".to_string()],
            category: "File".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "file.save".to_string(),
            label: "Save".to_string(),
            description: "Save the current file".to_string(),
            keys: vec!["Ctrl+S".to_string(), "Cmd+S".to_string()],
            category: "File".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "file.save_as".to_string(),
            label: "Save As".to_string(),
            description: "Save the current file with a new name".to_string(),
            keys: vec!["Ctrl+Shift+S".to_string(), "Cmd+Shift+S".to_string()],
            category: "File".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "file.save_all".to_string(),
            label: "Save All".to_string(),
            description: "Save all open files".to_string(),
            keys: vec!["Ctrl+Alt+S".to_string(), "Cmd+Alt+S".to_string()],
            category: "File".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "file.close".to_string(),
            label: "Close File".to_string(),
            description: "Close the current file".to_string(),
            keys: vec!["Ctrl+W".to_string(), "Cmd+W".to_string()],
            category: "File".to_string(),
            when: None,
        },
        // Edit operations
        KeyboardShortcut {
            id: "edit.undo".to_string(),
            label: "Undo".to_string(),
            description: "Undo the last action".to_string(),
            keys: vec!["Ctrl+Z".to_string(), "Cmd+Z".to_string()],
            category: "Edit".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "edit.redo".to_string(),
            label: "Redo".to_string(),
            description: "Redo the last undone action".to_string(),
            keys: vec!["Ctrl+Shift+Z".to_string(), "Cmd+Shift+Z".to_string()],
            category: "Edit".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "edit.cut".to_string(),
            label: "Cut".to_string(),
            description: "Cut the selection".to_string(),
            keys: vec!["Ctrl+X".to_string(), "Cmd+X".to_string()],
            category: "Edit".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "edit.copy".to_string(),
            label: "Copy".to_string(),
            description: "Copy the selection".to_string(),
            keys: vec!["Ctrl+C".to_string(), "Cmd+C".to_string()],
            category: "Edit".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "edit.paste".to_string(),
            label: "Paste".to_string(),
            description: "Paste from clipboard".to_string(),
            keys: vec!["Ctrl+V".to_string(), "Cmd+V".to_string()],
            category: "Edit".to_string(),
            when: None,
        },
        // Search operations
        KeyboardShortcut {
            id: "search.find".to_string(),
            label: "Find".to_string(),
            description: "Find in current file".to_string(),
            keys: vec!["Ctrl+F".to_string(), "Cmd+F".to_string()],
            category: "Search".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "search.replace".to_string(),
            label: "Replace".to_string(),
            description: "Find and replace in current file".to_string(),
            keys: vec!["Ctrl+H".to_string(), "Cmd+Alt+F".to_string()],
            category: "Search".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "search.find_in_files".to_string(),
            label: "Find in Files".to_string(),
            description: "Search across all files".to_string(),
            keys: vec!["Ctrl+Shift+F".to_string(), "Cmd+Shift+F".to_string()],
            category: "Search".to_string(),
            when: None,
        },
        // Navigation
        KeyboardShortcut {
            id: "navigation.quick_open".to_string(),
            label: "Quick Open".to_string(),
            description: "Quickly open files".to_string(),
            keys: vec!["Ctrl+P".to_string(), "Cmd+P".to_string()],
            category: "Navigation".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "navigation.command_palette".to_string(),
            label: "Command Palette".to_string(),
            description: "Open command palette".to_string(),
            keys: vec!["Ctrl+Shift+P".to_string(), "Cmd+Shift+P".to_string()],
            category: "Navigation".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "navigation.go_to_line".to_string(),
            label: "Go to Line".to_string(),
            description: "Jump to a specific line".to_string(),
            keys: vec!["Ctrl+G".to_string(), "Cmd+G".to_string()],
            category: "Navigation".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "navigation.next_tab".to_string(),
            label: "Next Tab".to_string(),
            description: "Switch to next editor tab".to_string(),
            keys: vec!["Ctrl+Tab".to_string(), "Cmd+Tab".to_string()],
            category: "Navigation".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "navigation.prev_tab".to_string(),
            label: "Previous Tab".to_string(),
            description: "Switch to previous editor tab".to_string(),
            keys: vec!["Ctrl+Shift+Tab".to_string(), "Cmd+Shift+Tab".to_string()],
            category: "Navigation".to_string(),
            when: None,
        },
        // View operations
        KeyboardShortcut {
            id: "view.toggle_sidebar".to_string(),
            label: "Toggle Sidebar".to_string(),
            description: "Show or hide the sidebar".to_string(),
            keys: vec!["Ctrl+B".to_string(), "Cmd+B".to_string()],
            category: "View".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "view.toggle_terminal".to_string(),
            label: "Toggle Terminal".to_string(),
            description: "Show or hide the integrated terminal".to_string(),
            keys: vec!["Ctrl+`".to_string(), "Cmd+`".to_string()],
            category: "View".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "view.toggle_problems".to_string(),
            label: "Toggle Problems".to_string(),
            description: "Show or hide the problems panel".to_string(),
            keys: vec!["Ctrl+Shift+M".to_string(), "Cmd+Shift+M".to_string()],
            category: "View".to_string(),
            when: None,
        },
        // Terminal operations
        KeyboardShortcut {
            id: "terminal.new".to_string(),
            label: "New Terminal".to_string(),
            description: "Create a new terminal".to_string(),
            keys: vec!["Ctrl+Shift+`".to_string(), "Cmd+Shift+`".to_string()],
            category: "Terminal".to_string(),
            when: None,
        },
        KeyboardShortcut {
            id: "terminal.kill".to_string(),
            label: "Kill Terminal".to_string(),
            description: "Kill the active terminal".to_string(),
            keys: vec!["Ctrl+Shift+W".to_string(), "Cmd+Shift+W".to_string()],
            category: "Terminal".to_string(),
            when: None,
        },
        // Settings
        KeyboardShortcut {
            id: "settings.open".to_string(),
            label: "Open Settings".to_string(),
            description: "Open the settings editor".to_string(),
            keys: vec!["Ctrl+,".to_string(), "Cmd+,".to_string()],
            category: "Settings".to_string(),
            when: None,
        },
    ];

    Ok(shortcuts)
}

/// Get documentation links
#[tauri::command]
pub fn get_documentation_links() -> Result<Vec<DocumentationLink>, String> {
    let links = vec![
        DocumentationLink {
            id: "getting_started".to_string(),
            title: "Getting Started".to_string(),
            url: "https://github.com/enosislabs/rainy-aether#readme".to_string(),
            description: Some("Learn the basics of Rainy Aether".to_string()),
            icon: Some("book-open".to_string()),
        },
        DocumentationLink {
            id: "keyboard_shortcuts".to_string(),
            title: "Keyboard Shortcuts".to_string(),
            url: "keyboard-shortcuts://local".to_string(),
            description: Some("View all keyboard shortcuts".to_string()),
            icon: Some("keyboard".to_string()),
        },
        DocumentationLink {
            id: "report_issue".to_string(),
            title: "Report Issue".to_string(),
            url: "https://github.com/enosislabs/rainy-aether/issues/new".to_string(),
            description: Some("Report a bug or request a feature".to_string()),
            icon: Some("bug".to_string()),
        },
        DocumentationLink {
            id: "release_notes".to_string(),
            title: "Release Notes".to_string(),
            url: "https://github.com/enosislabs/rainy-aether/releases".to_string(),
            description: Some("See what's new in Rainy Aether".to_string()),
            icon: Some("sparkles".to_string()),
        },
        DocumentationLink {
            id: "github".to_string(),
            title: "GitHub Repository".to_string(),
            url: "https://github.com/enosislabs/rainy-aether".to_string(),
            description: Some("View the source code".to_string()),
            icon: Some("github".to_string()),
        },
        DocumentationLink {
            id: "website".to_string(),
            title: "Official Website".to_string(),
            url: "https://docs.enosislabs.com".to_string(),
            description: Some("Visit our website".to_string()),
            icon: Some("globe".to_string()),
        },
    ];

    Ok(links)
}

/// Get application information for About dialog
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> Result<AppInfo, String> {
    let version = app.package_info().version.to_string();

    Ok(AppInfo {
        name: "Rainy Aether".to_string(),
        version,
        description: "Next-Generation AI-Native Code Editor".to_string(),
        author: "Enosis Labs, Inc.".to_string(),
        license: "MIT".to_string(),
        repository: "https://github.com/enosislabs/rainy-aether".to_string(),
        homepage: "https://docs.enosislabs.com".to_string(),
        electron_version: None, // Not using Electron
        chrome_version: None,   // Using system WebView
        node_version: None,     // Not using Node.js
        v8_version: None,
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}

/// Get available commands for command palette
#[tauri::command]
pub fn get_available_commands() -> Result<Vec<Command>, String> {
    let commands = vec![
        // File commands
        Command {
            id: "file.newFile".to_string(),
            label: "New File".to_string(),
            description: Some("Create a new file".to_string()),
            category: "File".to_string(),
            keybinding: Some("Ctrl+N".to_string()),
        },
        Command {
            id: "file.openProject".to_string(),
            label: "Open Project".to_string(),
            description: Some("Open a project folder".to_string()),
            category: "File".to_string(),
            keybinding: Some("Ctrl+O".to_string()),
        },
        Command {
            id: "file.save".to_string(),
            label: "Save".to_string(),
            description: Some("Save the current file".to_string()),
            category: "File".to_string(),
            keybinding: Some("Ctrl+S".to_string()),
        },
        // View commands
        Command {
            id: "view.toggleSidebar".to_string(),
            label: "Toggle Sidebar".to_string(),
            description: Some("Show or hide the sidebar".to_string()),
            category: "View".to_string(),
            keybinding: Some("Ctrl+B".to_string()),
        },
        Command {
            id: "view.toggleTerminal".to_string(),
            label: "Toggle Terminal".to_string(),
            description: Some("Show or hide the integrated terminal".to_string()),
            category: "View".to_string(),
            keybinding: Some("Ctrl+`".to_string()),
        },
        Command {
            id: "view.toggleProblems".to_string(),
            label: "Toggle Problems Panel".to_string(),
            description: Some("Show or hide the problems panel".to_string()),
            category: "View".to_string(),
            keybinding: Some("Ctrl+Shift+M".to_string()),
        },
        // Terminal commands
        Command {
            id: "terminal.new".to_string(),
            label: "New Terminal".to_string(),
            description: Some("Create a new terminal".to_string()),
            category: "Terminal".to_string(),
            keybinding: Some("Ctrl+Shift+`".to_string()),
        },
        Command {
            id: "terminal.kill".to_string(),
            label: "Kill Terminal".to_string(),
            description: Some("Kill the active terminal".to_string()),
            category: "Terminal".to_string(),
            keybinding: Some("Ctrl+Shift+W".to_string()),
        },
        // Window commands
        Command {
            id: "window.newWindow".to_string(),
            label: "New Window".to_string(),
            description: Some("Open a new window".to_string()),
            category: "Window".to_string(),
            keybinding: None,
        },
        Command {
            id: "window.revealInExplorer".to_string(),
            label: "Reveal in Explorer".to_string(),
            description: Some("Show the current file in system file explorer".to_string()),
            category: "Window".to_string(),
            keybinding: None,
        },
        // Help commands
        Command {
            id: "help.keyboardShortcuts".to_string(),
            label: "Keyboard Shortcuts Reference".to_string(),
            description: Some("View all keyboard shortcuts".to_string()),
            category: "Help".to_string(),
            keybinding: None,
        },
        Command {
            id: "help.documentation".to_string(),
            label: "Documentation".to_string(),
            description: Some("View documentation".to_string()),
            category: "Help".to_string(),
            keybinding: None,
        },
        Command {
            id: "help.reportIssue".to_string(),
            label: "Report Issue".to_string(),
            description: Some("Report a bug or request a feature".to_string()),
            category: "Help".to_string(),
            keybinding: None,
        },
        Command {
            id: "help.about".to_string(),
            label: "About Rainy Aether".to_string(),
            description: Some("Show information about Rainy Aether".to_string()),
            category: "Help".to_string(),
            keybinding: None,
        },
        // Settings commands
        Command {
            id: "settings.open".to_string(),
            label: "Open Settings".to_string(),
            description: Some("Open the settings editor".to_string()),
            category: "Settings".to_string(),
            keybinding: Some("Ctrl+,".to_string()),
        },
    ];

    Ok(commands)
}

// Helper types

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub license: String,
    pub repository: String,
    pub homepage: String,
    pub electron_version: Option<String>,
    pub chrome_version: Option<String>,
    pub node_version: Option<String>,
    pub v8_version: Option<String>,
    pub os: String,
    pub arch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    pub id: String,
    pub label: String,
    pub description: Option<String>,
    pub category: String,
    pub keybinding: Option<String>,
}
