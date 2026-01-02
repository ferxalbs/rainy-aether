// Native macOS menu manager for Rainy Aether IDE
// This module builds the native menu bar for macOS only
// Supports dynamic menu switching between startup (minimal) and editor (full) modes

use tauri::{
    menu::{AboutMetadata, Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter,
};

/// Build a minimal menu for the startup page (macOS)
/// Only includes: Rainy Aether, File (Open Project), Window, Help
pub fn build_startup_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    // ===== Rainy Aether (App) Menu =====
    let app_menu = SubmenuBuilder::new(app, "Rainy Aether")
        .item(&PredefinedMenuItem::about(
            app,
            Some("About Rainy Aether"),
            Some(AboutMetadata::default()),
        )?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("app:settings", "Settings...")
                .accelerator("Cmd+,")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::services(app, Some("Services"))?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Hide Rainy Aether"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("Hide Others"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("Show All"))?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Quit Rainy Aether"))?)
        .build()?;

    // ===== File Menu (minimal - only open project) =====
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("file:open-project", "Open Project...")
                .accelerator("Cmd+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("file:quick-open", "Quick Open...")
                .accelerator("Cmd+P")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("file:new-file", "New Untitled File")
                .accelerator("Cmd+N")
                .build(app)?,
        )
        .build()?;

    // ===== Window Menu =====
    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(
            &MenuItemBuilder::with_id("window:new", "New Window")
                .accelerator("Cmd+Shift+N")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::minimize(app, Some("Minimize"))?)
        .item(&PredefinedMenuItem::maximize(app, Some("Zoom"))?)
        .separator()
        .item(&PredefinedMenuItem::close_window(
            app,
            Some("Close Window"),
        )?)
        .build()?;

    // ===== Help Menu =====
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(
            &MenuItemBuilder::with_id("help:commands", "Show All Commands")
                .accelerator("Cmd+Shift+P")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("help:getting-started", "Getting Started").build(app)?)
        .item(&MenuItemBuilder::with_id("help:documentation", "Documentation").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help:about", "About Rainy Aether").build(app)?)
        .build()?;

    // Build the minimal startup menu bar
    let menu = MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()?;

    Ok(menu)
}

/// Set menu mode: "startup" for minimal menu, "full" for complete editor menu
/// Called from lib.rs wrapper (not directly as a Tauri command here)
pub fn set_menu_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let menu_result = if mode == "startup" {
        eprintln!("[MenuManager] Switching to startup (minimal) menu");
        build_startup_menu(&app)
    } else {
        eprintln!("[MenuManager] Switching to full editor menu");
        build_menu(&app)
    };

    match menu_result {
        Ok(menu) => {
            if let Err(e) = app.set_menu(menu) {
                eprintln!("[MenuManager] Failed to set menu: {}", e);
                return Err(format!("Failed to set menu: {}", e));
            }
            // Emit event to notify frontend of menu change
            let _ = app.emit("menu-mode-changed", &mode);
            Ok(())
        }
        Err(e) => {
            eprintln!("[MenuManager] Failed to build menu: {}", e);
            Err(format!("Failed to build menu: {}", e))
        }
    }
}

/// Build the native macOS application menu
/// This is only called on macOS platforms
pub fn build_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    // ===== Rainy Aether (App) Menu =====
    let app_menu = SubmenuBuilder::new(app, "Rainy Aether")
        .item(&PredefinedMenuItem::about(
            app,
            Some("About Rainy Aether"),
            Some(AboutMetadata::default()),
        )?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("app:settings", "Settings...")
                .accelerator("Cmd+,")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::services(app, Some("Services"))?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Hide Rainy Aether"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("Hide Others"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("Show All"))?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Quit Rainy Aether"))?)
        .build()?;

    // ===== File Menu =====
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("file:open-project", "Open Project...")
                .accelerator("Cmd+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("file:quick-open", "Quick Open...")
                .accelerator("Cmd+P")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("file:close-project", "Close Project").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("file:new-file", "New Untitled File")
                .accelerator("Cmd+N")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("file:new-file-in-project", "New File...").build(app)?)
        .item(&MenuItemBuilder::with_id("file:new-folder", "New Folder...").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("file:close-editor", "Close Editor")
                .accelerator("Cmd+W")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("file:close-all", "Close All Editors").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("file:save", "Save")
                .accelerator("Cmd+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("file:save-as", "Save As...")
                .accelerator("Cmd+Shift+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("file:save-all", "Save All")
                .accelerator("Cmd+Option+S")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("file:reveal-file", "Reveal Active File in Finder")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("file:reveal-workspace", "Open Workspace in Finder")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("file:toggle-autosave", "Toggle Auto Save").build(app)?)
        .build()?;

    // ===== Edit Menu =====
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(
            &MenuItemBuilder::with_id("edit:undo", "Undo")
                .accelerator("Cmd+Z")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:redo", "Redo")
                .accelerator("Cmd+Shift+Z")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Cut"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Copy"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Paste"))?)
        .separator()
        .item(&PredefinedMenuItem::select_all(app, Some("Select All"))?)
        .item(
            &MenuItemBuilder::with_id("edit:copy-line-up", "Copy Line Up")
                .accelerator("Option+Shift+Up")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:copy-line-down", "Copy Line Down")
                .accelerator("Option+Shift+Down")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:move-line-up", "Move Line Up")
                .accelerator("Option+Up")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:move-line-down", "Move Line Down")
                .accelerator("Option+Down")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("edit:find", "Find...")
                .accelerator("Cmd+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:find-next", "Find Next")
                .accelerator("Cmd+G")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:find-previous", "Find Previous")
                .accelerator("Cmd+Shift+G")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:replace", "Replace...")
                .accelerator("Cmd+H")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("edit:go-to-line", "Go to Line/Column...")
                .accelerator("Ctrl+G")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("edit:indent", "Indent Line").build(app)?)
        .item(&MenuItemBuilder::with_id("edit:outdent", "Outdent Line").build(app)?)
        .item(
            &MenuItemBuilder::with_id("edit:comment-line", "Toggle Line Comment")
                .accelerator("Cmd+/")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("edit:block-comment", "Toggle Block Comment")
                .accelerator("Cmd+Shift+/")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("edit:toggle-wrap", "Toggle Word Wrap")
                .accelerator("Option+Z")
                .build(app)?,
        )
        .build()?;

    // ===== View Menu =====
    let appearance_submenu = SubmenuBuilder::new(app, "Appearance")
        .item(
            &MenuItemBuilder::with_id("view:toggle-sidebar", "Toggle Sidebar")
                .accelerator("Cmd+B")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:toggle-zen-mode", "Toggle Zen Mode")
                .accelerator("Cmd+K Z")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("view:toggle-fullscreen", "Toggle Full Screen")
                .accelerator("Ctrl+Cmd+F")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("view:toggle-minimap", "Toggle Minimap").build(app)?)
        .item(
            &MenuItemBuilder::with_id("view:toggle-breadcrumbs", "Toggle Breadcrumbs")
                .build(app)?,
        )
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("view:command-palette", "Command Palette...")
                .accelerator("Cmd+Shift+P")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:quick-open", "Open View...")
                .accelerator("Cmd+Q")
                .build(app)?,
        )
        .separator()
        .item(&appearance_submenu)
        .separator()
        .item(
            &MenuItemBuilder::with_id("view:explorer", "Explorer")
                .accelerator("Cmd+Shift+E")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:search", "Search")
                .accelerator("Cmd+Shift+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:git", "Source Control")
                .accelerator("Cmd+Shift+G")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:extensions", "Extensions")
                .accelerator("Cmd+Shift+X")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("view:terminal", "Terminal")
                .accelerator("Cmd+`")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:problems", "Problems")
                .accelerator("Cmd+Shift+M")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view:output", "Output")
                .accelerator("Cmd+Shift+U")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("view:color-theme", "Color Theme...")
                .accelerator("Cmd+K Cmd+T")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("view:toggle-theme", "Toggle Light/Dark Theme").build(app)?)
        .build()?;

    // ===== Selection Menu =====
    let selection_menu = SubmenuBuilder::new(app, "Selection")
        .item(
            &MenuItemBuilder::with_id("selection:select-all", "Select All")
                .accelerator("Cmd+A")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:expand", "Expand Selection")
                .accelerator("Option+Shift+Right")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:shrink", "Shrink Selection")
                .accelerator("Option+Shift+Left")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("selection:copy-line-up", "Copy Line Up")
                .accelerator("Option+Shift+Up")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:copy-line-down", "Copy Line Down")
                .accelerator("Option+Shift+Down")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:move-line-up", "Move Line Up")
                .accelerator("Option+Up")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:move-line-down", "Move Line Down")
                .accelerator("Option+Down")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("selection:add-cursor-above", "Add Cursor Above")
                .accelerator("Cmd+Option+Up")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:add-cursor-below", "Add Cursor Below")
                .accelerator("Cmd+Option+Down")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:add-next-occurrence", "Add Next Occurrence")
                .accelerator("Cmd+D")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:select-all-occurrences", "Select All Occurrences")
                .accelerator("Cmd+Shift+L")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("selection:select-line", "Select Line")
                .accelerator("Cmd+L")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("selection:delete-line", "Delete Line")
                .accelerator("Cmd+Shift+K")
                .build(app)?,
        )
        .build()?;

    // ===== Go Menu =====
    let go_menu = SubmenuBuilder::new(app, "Go")
        .item(
            &MenuItemBuilder::with_id("go:definition", "Go to Definition")
                .accelerator("F12")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("go:type-definition", "Go to Type Definition").build(app)?)
        .item(
            &MenuItemBuilder::with_id("go:references", "Go to References")
                .accelerator("Shift+F12")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("go:line", "Go to Line/Column...")
                .accelerator("Ctrl+G")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("go:symbol", "Go to Symbol in Editor...")
                .accelerator("Cmd+Shift+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("go:file", "Go to File...")
                .accelerator("Cmd+P")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("go:next-editor", "Next Editor")
                .accelerator("Cmd+Tab")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("go:prev-editor", "Previous Editor")
                .accelerator("Cmd+Shift+Tab")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("go:back", "Go Back")
                .accelerator("Cmd+Option+Left")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("go:forward", "Go Forward")
                .accelerator("Cmd+Option+Right")
                .build(app)?,
        )
        .build()?;

    // ===== Git Menu =====
    let git_menu = SubmenuBuilder::new(app, "Git")
        .item(&MenuItemBuilder::with_id("git:clone", "Clone Repository...").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("git:refresh", "Refresh Status").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("git:open-source-control", "Open Source Control")
                .build(app)?,
        )
        .build()?;

    // ===== Extensions Menu =====
    let extensions_menu = SubmenuBuilder::new(app, "Extensions")
        .item(
            &MenuItemBuilder::with_id("extensions:marketplace", "Open Extension Marketplace...")
                .accelerator("Cmd+Shift+X")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("extensions:manage", "Manage Extensions...").build(app)?)
        .build()?;

    // ===== Terminal Menu =====
    let terminal_menu = SubmenuBuilder::new(app, "Terminal")
        .item(
            &MenuItemBuilder::with_id("terminal:new", "New Terminal")
                .accelerator("Cmd+Shift+`")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("terminal:kill", "Kill Terminal")
                .accelerator("Cmd+Shift+W")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("terminal:toggle", "Toggle Terminal Panel")
                .accelerator("Cmd+`")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("terminal:toggle-search", "Toggle Search in Terminal")
                .accelerator("Cmd+Shift+F")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("terminal:external", "Open External Terminal").build(app)?)
        .build()?;

    // ===== Window Menu =====
    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(
            &MenuItemBuilder::with_id("window:new", "New Window")
                .accelerator("Cmd+Shift+N")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::minimize(app, Some("Minimize"))?)
        .item(&PredefinedMenuItem::maximize(app, Some("Zoom"))?)
        .item(
            &MenuItemBuilder::with_id("window:toggle-fullscreen", "Toggle Full Screen")
                .accelerator("Ctrl+Cmd+F")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("window:center", "Center Window").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("window:reload", "Reload Window")
                .accelerator("Cmd+R")
                .build(app)?,
        )
        .item(&PredefinedMenuItem::close_window(
            app,
            Some("Close Window"),
        )?)
        .build()?;

    // ===== Help Menu =====
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(
            &MenuItemBuilder::with_id("help:commands", "Show All Commands")
                .accelerator("Cmd+Shift+P")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("help:getting-started", "Getting Started").build(app)?)
        .item(&MenuItemBuilder::with_id("help:documentation", "Documentation").build(app)?)
        .item(&MenuItemBuilder::with_id("help:release-notes", "Release Notes").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("help:keyboard-shortcuts", "Keyboard Shortcuts Reference")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("help:report-issue", "Report Issue").build(app)?)
        .item(&MenuItemBuilder::with_id("help:github", "View on GitHub").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help:website", "Visit Our Website").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help:about", "About Rainy Aether").build(app)?)
        .build()?;

    // Build the complete menu bar
    let menu = MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&selection_menu)
        .item(&go_menu)
        .item(&git_menu)
        .item(&extensions_menu)
        .item(&terminal_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()?;

    Ok(menu)
}
