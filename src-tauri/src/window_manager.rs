use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::ShellExt;

/// Open a new window with the current or specified workspace
///
/// CRITICAL: Following Fluxium's EXACT pattern
/// - Load plain "index.html" (NO URL parameters)
/// - Just build the window, Tauri shows it automatically
/// - Use events for workspace communication AFTER window loads
/// - MUST be async to prevent blocking during window creation
#[tauri::command]
pub async fn window_open_new(app: AppHandle, workspace_path: Option<String>) -> Result<String, String> {
    let label = format!("main-{}", chrono::Utc::now().timestamp_millis());

    eprintln!("[window_manager] Creating new window '{}'", label);

    // Build window - EXACTLY like Fluxium (no visible, no show, just build)
    eprintln!("[window_manager] Building window with label: {}", label);
    let _window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title("Rainy Aether")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .decorations(true)
        .center()
        .build()
        .map_err(|e| format!("Failed to build window: {}", e))?;

    eprintln!("[window_manager] ✓ Window '{}' created successfully", label);

    // If workspace provided, emit event AFTER delay (window needs to load first)
    // Increased delay to 2000ms to ensure frontend is fully initialized and listener is registered
    if let Some(path) = workspace_path {
        let label_clone = label.clone();
        let app_clone = app.clone();
        tokio::spawn(async move {
            eprintln!("[window_manager] Waiting 2s before sending workspace event to '{}'...", label_clone);
            tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
            if let Err(e) = app_clone.emit_to(&label_clone, "rainy:load-workspace", path.clone()) {
                eprintln!("[window_manager] ⚠️ Failed to emit workspace event: {}", e);
            } else {
                eprintln!("[window_manager] ✓ Workspace event sent to '{}': {}", label_clone, path);
            }
        });
    } else {
        eprintln!("[window_manager] No workspace provided - window will show StartupPage");
    }

    Ok(label)
}

/// Show window when frontend is ready (called from frontend after initialization)
/// This matches Fluxium's pattern - windows start hidden, frontend shows when ready
#[tauri::command]
pub fn window_show_ready(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        // Get current window from app handle
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    eprintln!("[window_manager] ✓ Window shown (frontend ready)");
    Ok(())
}

/// Get list of all open windows
#[tauri::command]
pub fn window_get_all(app: AppHandle) -> Result<Vec<String>, String> {
    let windows: Vec<String> = app
        .webview_windows()
        .keys()
        .map(|s| s.to_string())
        .collect();
    Ok(windows)
}

/// Focus a specific window by label
#[tauri::command]
pub fn window_focus(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus window: {}", e))?;
        Ok(())
    } else {
        Err(format!("Window '{}' not found", label))
    }
}

/// Close a specific window by label
#[tauri::command]
pub fn window_close(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window
            .close()
            .map_err(|e| format!("Failed to close window: {}", e))?;
        Ok(())
    } else {
        Err(format!("Window '{}' not found", label))
    }
}

/// Reveal file or folder in the system file explorer (cross-platform)
#[tauri::command]
pub fn reveal_in_explorer(app: AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);

    // Validate path exists
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        let mut command = app.shell().command("explorer.exe");

        if p.is_dir() {
            command = command.args([path.as_str()]);
        } else {
            let arg = format!("/select,{}", path);
            command = command.args([arg.as_str()]);
        }

        command
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        let mut command = app.shell().command("open");

        if p.is_dir() {
            command = command.args(&[path.as_str()]);
        } else {
            command = command.args(&["-R", path.as_str()]);
        }

        command
            .spawn()
            .map_err(|e| format!("Failed to open Finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try different file managers in order of preference
        let file_managers = vec![
            ("nautilus", vec!["--select", path.as_str()]),
            ("dolphin", vec!["--select", path.as_str()]),
            ("thunar", vec![path.as_str()]),
            ("nemo", vec![path.as_str()]),
            ("caja", vec![path.as_str()]),
            ("pcmanfm", vec![path.as_str()]),
            (
                "xdg-open",
                vec![if p.is_dir() {
                    path.as_str()
                } else {
                    p.parent().unwrap_or(&p).to_str().unwrap_or(&path)
                }],
            ),
        ];

        let mut success = false;
        for (fm, args) in file_managers {
            if let Ok(_) = app.shell().command(fm).args(&args).spawn() {
                success = true;
                break;
            }
        }

        if !success {
            return Err("No suitable file manager found. Please install nautilus, dolphin, thunar, nemo, caja, or pcmanfm.".to_string());
        }
    }

    Ok(())
}

/// Open system terminal in specified directory (cross-platform)
#[tauri::command]
pub fn open_system_terminal(app: AppHandle, cwd: Option<String>) -> Result<(), String> {
    let working_dir = cwd.unwrap_or_else(|| {
        std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
    });

    #[cfg(target_os = "windows")]
    {
        // Try Windows Terminal first, fallback to cmd
        let mut wt_command = app.shell().command("wt.exe");
        wt_command = wt_command.args(["--window", "0", "-d", &working_dir]);

        if wt_command.spawn().is_err() {
            // Fallback to cmd
            let mut cmd_command = app.shell().command("cmd.exe");
            cmd_command =
                cmd_command.args(["/c", "start", "cmd.exe", "/k", "cd", "/d", &working_dir]);
            cmd_command
                .spawn()
                .map_err(|e| format!("Failed to open terminal: {}", e))?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Use AppleScript to open Terminal.app in the specified directory
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "cd '{}'"
            end tell"#,
            working_dir.replace("'", "'\\''")
        );

        app.shell()
            .command("osascript")
            .args(&["-e", &script])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try different terminals in order of preference
        let terminals = vec![
            ("gnome-terminal", vec!["--working-directory", &working_dir]),
            ("konsole", vec!["--workdir", &working_dir]),
            ("xfce4-terminal", vec!["--working-directory", &working_dir]),
            ("mate-terminal", vec!["--working-directory", &working_dir]),
            (
                "xterm",
                vec!["-e", &format!("cd '{}' && $SHELL", working_dir)],
            ),
        ];

        let mut success = false;
        for (term, args) in terminals {
            if let Ok(_) = app.shell().command(term).args(&args).spawn() {
                success = true;
                break;
            }
        }

        if !success {
            return Err("No suitable terminal found. Please install gnome-terminal, konsole, xfce4-terminal, mate-terminal, or xterm.".to_string());
        }
    }

    Ok(())
}

/// Get system information
#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        os_version: get_os_version(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: hostname::get()
            .ok()
            .and_then(|h| h.into_string().ok())
            .unwrap_or_else(|| "Unknown".to_string()),
        cpu_count: num_cpus::get(),
        total_memory: get_total_memory(),
    })
}

/// Get platform display name
#[tauri::command]
pub fn get_platform_name() -> String {
    match std::env::consts::OS {
        "windows" => "Windows".to_string(),
        "macos" => "macOS".to_string(),
        "linux" => "Linux".to_string(),
        other => other.to_string(),
    }
}

/// Check if running in WSL
#[tauri::command]
pub fn is_wsl() -> bool {
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/version") {
            return content.to_lowercase().contains("microsoft")
                || content.to_lowercase().contains("wsl");
        }
    }
    false
}

/// Open URL in default browser
#[tauri::command]
pub fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    app.shell()
        .open(&url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))
}

/// Maximize the current window
#[tauri::command]
pub fn window_maximize(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .maximize()
        .map_err(|e| format!("Failed to maximize window: {}", e))
}

/// Minimize the current window
#[tauri::command]
pub fn window_minimize(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .minimize()
        .map_err(|e| format!("Failed to minimize window: {}", e))
}

/// Restore the current window
#[tauri::command]
pub fn window_unmaximize(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .unmaximize()
        .map_err(|e| format!("Failed to restore window: {}", e))
}

/// Toggle fullscreen mode
#[tauri::command]
pub fn window_toggle_fullscreen(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    let is_fullscreen = window
        .is_fullscreen()
        .map_err(|e| format!("Failed to check fullscreen status: {}", e))?;

    window
        .set_fullscreen(!is_fullscreen)
        .map_err(|e| format!("Failed to toggle fullscreen: {}", e))
}

/// Check if window is maximized
#[tauri::command]
pub fn window_is_maximized(app: AppHandle, label: Option<String>) -> Result<bool, String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .is_maximized()
        .map_err(|e| format!("Failed to check maximized status: {}", e))
}

/// Check if window is fullscreen
#[tauri::command]
pub fn window_is_fullscreen(app: AppHandle, label: Option<String>) -> Result<bool, String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .is_fullscreen()
        .map_err(|e| format!("Failed to check fullscreen status: {}", e))
}

/// Get window position and size
#[tauri::command]
pub fn window_get_position(
    app: AppHandle,
    label: Option<String>,
) -> Result<WindowPosition, String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    let position = window
        .outer_position()
        .map_err(|e| format!("Failed to get window position: {}", e))?;
    let size = window
        .outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    Ok(WindowPosition {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    })
}

/// Set window position
#[tauri::command]
pub fn window_set_position(
    app: AppHandle,
    label: Option<String>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    use tauri::Position;
    window
        .set_position(Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| format!("Failed to set window position: {}", e))
}

/// Set window size
#[tauri::command]
pub fn window_set_size(
    app: AppHandle,
    label: Option<String>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    use tauri::Size;
    window
        .set_size(Size::Physical(tauri::PhysicalSize { width, height }))
        .map_err(|e| format!("Failed to set window size: {}", e))
}

/// Center the window on screen
#[tauri::command]
pub fn window_center(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .center()
        .map_err(|e| format!("Failed to center window: {}", e))
}

/// Set window title
#[tauri::command]
pub fn window_set_title(
    app: AppHandle,
    label: Option<String>,
    title: String,
) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    window
        .set_title(&title)
        .map_err(|e| format!("Failed to set window title: {}", e))
}

/// Reload the current window
#[tauri::command]
pub fn window_reload(app: AppHandle, label: Option<String>) -> Result<(), String> {
    let window = if let Some(l) = label {
        app.get_webview_window(&l)
            .ok_or_else(|| format!("Window '{}' not found", l))?
    } else {
        app.webview_windows()
            .values()
            .next()
            .ok_or("No window found")?
            .clone()
    };

    // Evaluate JavaScript to reload the page
    window
        .eval("window.location.reload()")
        .map_err(|e| format!("Failed to reload window: {}", e))
}

// Helper types and functions

#[derive(Debug, serde::Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub arch: String,
    pub hostname: String,
    pub cpu_count: usize,
    pub total_memory: u64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

fn get_os_version() -> String {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("cmd")
            .args(["/c", "ver"])
            .output()
        {
            if let Ok(version) = String::from_utf8(output.stdout) {
                return version.trim().to_string();
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
        {
            if let Ok(version) = String::from_utf8(output.stdout) {
                return version.trim().to_string();
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return line
                        .split('=')
                        .nth(1)
                        .unwrap_or("")
                        .trim_matches('"')
                        .to_string();
                }
            }
        }
    }

    "Unknown".to_string()
}

fn get_total_memory() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

        unsafe {
            let mut mem_status = MEMORYSTATUSEX {
                dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
                ..Default::default()
            };

            if GlobalMemoryStatusEx(&mut mem_status).is_ok() {
                return mem_status.ullTotalPhys;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("sysctl")
            .args(&["-n", "hw.memsize"])
            .output()
        {
            if let Ok(mem_str) = String::from_utf8(output.stdout) {
                if let Ok(mem) = mem_str.trim().parse::<u64>() {
                    return mem;
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/meminfo") {
            for line in content.lines() {
                if line.starts_with("MemTotal:") {
                    if let Some(kb_str) = line.split_whitespace().nth(1) {
                        if let Ok(kb) = kb_str.parse::<u64>() {
                            return kb * 1024; // Convert KB to bytes
                        }
                    }
                }
            }
        }
    }

    0
}
