mod agent_server_manager;
mod configuration_manager;
mod credential_manager;
mod extension_manager;
mod extension_registry;
mod file_operations;
mod font_manager;
mod git; // Modular native Git implementation
mod help_manager;
mod language_server_manager;
#[cfg(target_os = "macos")]
mod menu_manager; // Native macOS menu support
mod project_manager;
mod terminal_manager;
mod update_manager;
mod window_manager; // Inngest/AgentKit sidecar manager

#[tauri::command]
fn open_windows_terminal(app: tauri::AppHandle, cwd: Option<String>) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    // Construir argumentos dinámicamente para Windows Terminal
    let mut command = app.shell().command("wt.exe");
    command = command.args(["--window", "0"]);
    if let Some(dir) = cwd.as_deref() {
        command = command.args(["-d", dir]);
    }

    match command.spawn() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open Windows Terminal: {}", e)),
    }
}

#[tauri::command]
fn open_in_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use std::path::PathBuf;
    use tauri_plugin_shell::ShellExt;

    let p = PathBuf::from(path);
    let mut command = app.shell().command("explorer.exe");

    // Si es un directorio, abrir directamente. Si es archivo, usar /select,
    if p.is_dir() {
        command = command.args([p.to_string_lossy().to_string().as_str()]);
    } else {
        let arg = format!("/select,{}", p.to_string_lossy());
        command = command.args([arg.as_str()]);
    }

    match command.spawn() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open in Explorer: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .manage(project_manager::WatcherState {
            watcher: std::sync::Arc::new(std::sync::Mutex::new(None)),
        })
        .manage(terminal_manager::TerminalState::default())
        .manage(language_server_manager::LanguageServerManager::new())
        .manage(agent_server_manager::AgentServerState::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build());

    // Desktop-only: register global shortcuts and emit events to frontend
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use tauri::Emitter;
        builder = builder.setup(|app| {
            // macOS-only: Set up native application menu
            #[cfg(target_os = "macos")]
            {
                match menu_manager::build_menu(app.handle()) {
                    Ok(menu) => {
                        if let Err(e) = app.set_menu(menu) {
                            eprintln!("Failed to set macOS menu: {}", e);
                        } else {
                            println!("[MenuManager] ✓ Native macOS menu set successfully");
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to build macOS menu: {}", e);
                    }
                }

                // Handle menu events by emitting to frontend (outside the match)
                app.on_menu_event(move |app_handle, event| {
                    let id = event.id().as_ref();
                    println!("[MenuManager] Menu action triggered: {}", id);
                    if let Err(e) = app_handle.emit("menu-action", id) {
                        eprintln!("[MenuManager] Failed to emit menu action: {}", e);
                    }
                });
            }

            // Attach plugin following official example, and emit events on press
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, shortcut, event| {
                        use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
                        if event.state() == ShortcutState::Pressed {
                            let _ = app.emit("shortcut/trigger", shortcut.to_string());
                            // Map to specific IDE actions
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyP)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyP)
                            {
                                let _ = app.emit("shortcut/quick-open", ());
                            }
                            if (shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyP))
                                || (shortcut
                                    .matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyP))
                            {
                                let _ = app.emit("shortcut/command-palette", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::Comma)
                                || shortcut.matches(Modifiers::SUPER, Code::Comma)
                            {
                                let _ = app.emit("shortcut/open-settings", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyS)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyS)
                            {
                                let _ = app.emit("shortcut/save-file", ());
                            }
                            if (shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyS))
                                || (shortcut.matches(Modifiers::SUPER | Modifiers::ALT, Code::KeyS))
                            {
                                let _ = app.emit("shortcut/save-all", ());
                            }
                            if (shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyS))
                                || (shortcut
                                    .matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyS))
                            {
                                let _ = app.emit("shortcut/save-as", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyW)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyW)
                            {
                                let _ = app.emit("shortcut/close-file", ());
                            }
                            // Tab switching
                            if shortcut.matches(Modifiers::CONTROL, Code::Tab)
                                || shortcut.matches(Modifiers::SUPER, Code::Tab)
                            {
                                let _ = app.emit("shortcut/tab-next", ());
                            }
                            if (shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::Tab))
                                || (shortcut
                                    .matches(Modifiers::SUPER | Modifiers::SHIFT, Code::Tab))
                            {
                                let _ = app.emit("shortcut/tab-prev", ());
                            }
                            // Editor navigation and search
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyG)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyG)
                            {
                                let _ = app.emit("shortcut/go-to-line", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyF)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyF)
                            {
                                let _ = app.emit("shortcut/find", ());
                            }
                            if shortcut.matches(Modifiers::empty(), Code::F3) {
                                let _ = app.emit("shortcut/find-next", ());
                            }
                            if (shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyH))
                                || (shortcut
                                    .matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyH))
                            {
                                let _ = app.emit("shortcut/replace-all", ());
                            }
                            if shortcut.matches(Modifiers::ALT, Code::KeyZ) {
                                let _ = app.emit("shortcut/toggle-wrap", ());
                            }
                            // Project and UI
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyO)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyO)
                            {
                                let _ = app.emit("shortcut/open-project", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyN)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyN)
                            {
                                let _ = app.emit("shortcut/new-file", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::KeyB)
                                || shortcut.matches(Modifiers::SUPER, Code::KeyB)
                            {
                                let _ = app.emit("shortcut/toggle-sidebar", ());
                            }
                            if shortcut.matches(Modifiers::CONTROL, Code::Backquote)
                                || shortcut.matches(Modifiers::SUPER, Code::Backquote)
                            {
                                let _ = app.emit("shortcut/toggle-terminal", ());
                            }
                            if (shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyZ))
                                || (shortcut
                                    .matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyZ))
                            {
                                let _ = app.emit("shortcut/redo", ());
                            }
                        }
                    })
                    .build(),
            )?;

            Ok(())
        });
    }

    builder = builder.invoke_handler(tauri::generate_handler![
        open_windows_terminal,
        open_in_directory,
        // Window management
        window_manager::window_open_new,
        window_manager::window_show_ready, // NEW: Show window when frontend is ready
        window_manager::window_get_all,
        window_manager::window_focus,
        window_manager::window_close,
        window_manager::window_maximize,
        window_manager::window_minimize,
        window_manager::window_unmaximize,
        window_manager::window_toggle_fullscreen,
        window_manager::window_is_maximized,
        window_manager::window_is_fullscreen,
        window_manager::window_get_position,
        window_manager::window_set_position,
        window_manager::window_set_size,
        window_manager::window_center,
        window_manager::window_set_title,
        window_manager::window_reload,
        window_manager::reveal_in_explorer,
        window_manager::open_system_terminal,
        window_manager::get_system_info,
        window_manager::get_platform_name,
        window_manager::is_wsl,
        window_manager::open_external_url,
        // Help and documentation
        help_manager::get_keyboard_shortcuts,
        help_manager::get_documentation_links,
        help_manager::get_app_info,
        help_manager::get_available_commands,
        project_manager::get_cwd,
        project_manager::open_project_dialog,
        project_manager::load_project_structure,
        project_manager::load_directory_children,
        project_manager::list_directory,
        project_manager::get_file_content,
        project_manager::save_file_content,
        project_manager::watch_project_changes,
        project_manager::create_file,
        project_manager::create_folder,
        project_manager::rename_path,
        project_manager::delete_path,
        project_manager::get_temp_dir,
        project_manager::search_in_workspace,
        project_manager::replace_in_file,
        project_manager::execute_command,
        terminal_manager::terminal_create,
        terminal_manager::terminal_write,
        terminal_manager::terminal_resize,
        terminal_manager::terminal_kill,
        terminal_manager::terminal_change_directory,
        terminal_manager::terminal_get_session,
        terminal_manager::terminal_list_sessions,
        terminal_manager::terminal_get_profiles,
        terminal_manager::terminal_init_profiles,
        // Git integration - Native libgit2 implementation
        // Status operations
        git::status::git_is_repo,
        git::status::git_status,
        git::status::git_stage_file,
        git::status::git_stage_all,
        git::status::git_unstage_file,
        git::status::git_unstage_all,
        git::status::git_discard_changes,
        git::status::git_discard_files,
        // History operations
        git::history::git_log,
        git::history::git_show_files,
        git::history::git_diff,
        git::history::git_diff_file,
        git::history::git_diff_commit,
        git::history::git_diff_commit_file,
        git::history::git_unpushed,
        git::history::git_sync_status,
        // Branch operations
        git::branch::git_branches,
        git::branch::git_get_current_branch,
        git::branch::git_create_branch,
        git::branch::git_delete_branch,
        git::branch::git_checkout_branch,
        git::branch::git_rename_branch,
        // Commit operations
        git::commit::git_commit,
        git::commit::git_amend_commit,
        git::commit::git_reset,
        git::commit::git_revert,
        git::commit::git_cherry_pick,
        // Remote operations
        git::remote::git_push,
        git::remote::git_pull,
        git::remote::git_fetch,
        git::remote::git_clone,
        git::remote::git_list_remotes,
        git::remote::git_add_remote,
        git::remote::git_remove_remote,
        git::remote::git_set_remote_url,
        // Stash operations
        git::stash::git_stash_list,
        git::stash::git_stash_push,
        git::stash::git_stash_pop,
        // Merge & Conflict operations
        git::merge::git_merge,
        git::merge::git_merge_abort,
        git::merge::git_list_conflicts,
        git::merge::git_get_conflict_content,
        git::merge::git_resolve_conflict,
        git::merge::git_accept_ours,
        git::merge::git_accept_theirs,
        // Agent credential management
        credential_manager::agent_store_credential,
        credential_manager::agent_get_credential,
        credential_manager::agent_delete_credential,
        credential_manager::agent_has_credential,
        // Agent tool file operations
        file_operations::tool_read_file,
        file_operations::tool_write_file,
        file_operations::tool_edit_file,
        file_operations::tool_delete_file,
        file_operations::tool_rename_file,
        file_operations::tool_copy_file,
        file_operations::tool_batch_read_files,
        // Extension management
        extension_manager::load_installed_extensions,
        extension_manager::save_installed_extensions,
        extension_manager::extract_extension,
        extension_manager::remove_directory,
        extension_manager::create_extension_directory,
        extension_manager::list_extension_files,
        extension_manager::read_extension_file,
        extension_manager::load_extensions_manifest,
        extension_manager::save_extensions_manifest,
        extension_manager::get_app_data_directory,
        extension_manager::ensure_extensions_directory,
        // Extension Registry
        extension_registry::get_extension_registry,
        extension_registry::update_extension_registry,
        extension_registry::add_extension_to_registry,
        extension_registry::remove_extension_from_registry,
        extension_registry::enable_extension_in_registry,
        extension_registry::disable_extension_in_registry,
        extension_registry::get_extension_cache_dir,
        extension_registry::clear_extension_cache,
        extension_registry::get_extension_stats,
        // Update management
        update_manager::check_for_updates,
        update_manager::install_update,
        update_manager::get_app_version,
        // Language Server Protocol
        language_server_manager::lsp_start_server,
        language_server_manager::lsp_stop_server,
        language_server_manager::lsp_send_message,
        language_server_manager::lsp_get_stats,
        // Configuration management
        configuration_manager::load_user_configuration,
        configuration_manager::load_workspace_configuration,
        configuration_manager::save_user_configuration,
        configuration_manager::save_workspace_configuration,
        configuration_manager::get_configuration_value,
        configuration_manager::set_configuration_value,
        configuration_manager::delete_configuration_value,
        configuration_manager::validate_configuration_value,
        configuration_manager::list_configuration_keys,
        // Font management
        font_manager::load_font_manifest,
        font_manager::save_font_manifest,
        font_manager::download_font_file,
        font_manager::read_font_file_base64,
        font_manager::import_custom_font_file,
        font_manager::delete_font_file,
        font_manager::validate_font_file,
        font_manager::get_font_file_info,
        // Agent server management (Inngest/AgentKit sidecar)
        agent_server_manager::agent_server_start,
        agent_server_manager::agent_server_stop,
        agent_server_manager::agent_server_status,
        agent_server_manager::agent_server_health,
    ]);

    if let Err(error) = builder.run(tauri::generate_context!()) {
        eprintln!("Error while running Tauri application: {}", error);
        eprintln!("The application will now exit. Please report this error.");
        std::process::exit(1);
    }
}
