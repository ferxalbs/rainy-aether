mod credential_manager;
mod extension_manager;
mod extension_registry;
mod file_operations;
mod git_manager;
mod git_native;  // New: Native libgit2 implementation
mod git_config;  // New: Feature flags for gradual migration
mod language_server_manager;
mod project_manager;
mod terminal_manager;
mod update_manager;

#[tauri::command]
fn open_windows_terminal(app: tauri::AppHandle, cwd: Option<String>) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    // Construir argumentos dinámicamente para Windows Terminal
    let mut command = app.shell().command("wt.exe");
    command = command.args(&["--window", "0"]);
    if let Some(dir) = cwd.as_deref() {
        command = command.args(&["-d", dir]);
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
        command = command.args(&[p.to_string_lossy().to_string().as_str()]);
    } else {
        let arg = format!("/select,{}", p.to_string_lossy());
        command = command.args(&[arg.as_str()]);
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
        project_manager::get_cwd,
        project_manager::open_project_dialog,
        project_manager::load_project_structure,
        project_manager::load_directory_children,
        project_manager::get_file_content,
        project_manager::save_file_content,
        project_manager::watch_project_changes,
        project_manager::create_file,
        project_manager::create_folder,
        project_manager::rename_path,
        project_manager::delete_path,
        terminal_manager::terminal_create,
        terminal_manager::terminal_write,
        terminal_manager::terminal_resize,
        terminal_manager::terminal_kill,
        terminal_manager::terminal_change_directory,
        terminal_manager::terminal_get_session,
        terminal_manager::terminal_list_sessions,
        terminal_manager::terminal_get_profiles,
        terminal_manager::terminal_init_profiles,
        // Git integration
        git_manager::git_is_repo,
        git_manager::git_log,
        git_manager::git_show_files,
        git_manager::git_diff,
        git_manager::git_status,
        git_manager::git_commit,
        git_manager::git_unpushed,
        git_manager::git_branches,
        git_manager::git_checkout_branch,
        git_manager::git_create_branch,
        git_manager::git_stage_file,
        git_manager::git_unstage_file,
        git_manager::git_discard_changes,
        git_manager::git_diff_file,
        git_manager::git_push,
        git_manager::git_pull,
        git_manager::git_stash_list,
        git_manager::git_stash_push,
        git_manager::git_stash_pop,
        // New commands for status bar integration
        git_manager::git_get_status,
        git_manager::git_get_current_branch,
        git_manager::git_get_commit_info,
        git_manager::git_stage_all,
        git_manager::git_unstage_all,
        git_manager::git_switch_branch,
        git_manager::git_get_branches,
        // Clone & Remote operations
        git_manager::git_clone,
        git_manager::git_list_remotes,
        git_manager::git_add_remote,
        git_manager::git_remove_remote,
        git_manager::git_rename_remote,
        git_manager::git_set_remote_url,
        git_manager::git_fetch,
        git_manager::git_fetch_all,
        // Merge & Rebase operations
        git_manager::git_merge,
        git_manager::git_merge_abort,
        git_manager::git_rebase,
        git_manager::git_rebase_abort,
        git_manager::git_rebase_continue,
        git_manager::git_rebase_skip,
        // Conflict resolution
        // git_manager::git_get_conflicts,
        git_manager::git_resolve_conflict,
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
        git_manager::git_list_conflicts,
        git_manager::git_get_conflict_content,
        git_manager::git_resolve_conflict,
        git_manager::git_accept_ours,
        git_manager::git_accept_theirs,
        // Tag operations
        git_manager::git_list_tags,
        git_manager::git_create_tag,
        git_manager::git_delete_tag,
        git_manager::git_push_tag,
        git_manager::git_push_all_tags,
        // Enhanced diff operations
        git_manager::git_diff_files,
        git_manager::git_diff_commit,
        git_manager::git_diff_between_commits,
        // Enhanced branch operations
        git_manager::git_delete_branch,
        git_manager::git_rename_branch,
        git_manager::git_set_upstream,
        // Enhanced commit operations
        git_manager::git_amend_commit,
        git_manager::git_reset,
        git_manager::git_revert,
        git_manager::git_cherry_pick,
        // Enhanced file operations
        git_manager::git_stage_files,
        git_manager::git_unstage_files,
        git_manager::git_discard_files,
        git_manager::git_show_file,
        // Repository info
        git_manager::git_get_config,
        git_manager::git_set_config,
        git_manager::git_get_repo_info,
        // Native Git implementation (libgit2)
        git_native::git_is_repo_native,
        git_native::git_status_native,
        git_native::git_get_current_branch_native,
        git_native::git_log_native,
        git_native::git_branches_native,
        git_native::git_create_branch_native,
        git_native::git_checkout_branch_native,
        git_native::git_show_files_native,
        git_native::git_diff_native,
        git_native::git_unpushed_native,
        // Git configuration and feature flags
        git_config::git_get_native_config,
        git_config::git_set_use_native,
        git_config::git_enable_native_operation,
        git_config::git_disable_native_operation,
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
        language_server_manager::lsp_is_server_running,
        language_server_manager::lsp_get_running_servers,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
