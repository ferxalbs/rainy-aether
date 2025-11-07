use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

#[cfg(target_os = "windows")]
use dirs::home_dir;

/// Terminal session lifecycle state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionState {
    Starting,
    Active,
    Exited,
    Error,
}

/// Terminal shell profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellProfile {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

/// Global terminal state manager
#[derive(Default)]
pub struct TerminalState {
    pub sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
    pub profiles: Arc<Mutex<Vec<ShellProfile>>>,
}

/// Individual terminal session with lifecycle management
pub struct TerminalSession {
    pub id: String,
    pub pair: PtyPair,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Arc<Mutex<Option<Box<dyn Child + Send + Sync>>>>,
    pub shell_cmd: String,
    pub state: Arc<Mutex<SessionState>>,
    pub created_at: u64,
    pub cwd: Option<String>,
}

#[derive(Serialize, Clone)]
struct TerminalDataEvent {
    id: String,
    data: String,
}

#[derive(Serialize, Clone)]
struct TerminalStateEvent {
    id: String,
    state: SessionState,
}

#[derive(Serialize, Clone)]
pub struct TerminalSessionInfo {
    pub id: String,
    pub shell_cmd: String,
    pub state: SessionState,
    pub created_at: u64,
    pub cwd: Option<String>,
}

use uuid::Uuid;

fn default_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        // Preferir PowerShell en Windows; si falla, se hará fallback a cmd.exe
        "powershell.exe".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}

fn detect_available_shells() -> Vec<ShellProfile> {
    let mut profiles = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // PowerShell 7+
        if which::which("pwsh").is_ok() {
            profiles.push(ShellProfile {
                name: "PowerShell 7+".to_string(),
                command: "pwsh.exe".to_string(),
                args: vec!["-NoLogo".to_string()],
                env: HashMap::new(),
            });
        }
        // Windows PowerShell
        if which::which("powershell").is_ok() {
            profiles.push(ShellProfile {
                name: "PowerShell".to_string(),
                command: "powershell.exe".to_string(),
                args: vec!["-NoLogo".to_string()],
                env: HashMap::new(),
            });
        }
        // CMD
        profiles.push(ShellProfile {
            name: "Command Prompt".to_string(),
            command: "cmd.exe".to_string(),
            args: vec![],
            env: HashMap::new(),
        });
        // Git Bash
        if which::which("bash").is_ok() {
            profiles.push(ShellProfile {
                name: "Git Bash".to_string(),
                command: "bash.exe".to_string(),
                args: vec![],
                env: HashMap::new(),
            });
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // User's default shell
        if let Ok(shell) = std::env::var("SHELL") {
            let name = shell.split('/').last().unwrap_or("Shell").to_string();
            profiles.push(ShellProfile {
                name: name.clone(),
                command: shell,
                args: vec![],
                env: HashMap::new(),
            });
        }
        // Common shells
        for (name, cmd) in [
            ("bash", "/bin/bash"),
            ("zsh", "/bin/zsh"),
            ("fish", "/usr/bin/fish"),
        ] {
            if which::which(cmd).is_ok() {
                profiles.push(ShellProfile {
                    name: name.to_string(),
                    command: cmd.to_string(),
                    args: vec![],
                    env: HashMap::new(),
                });
            }
        }
    }

    profiles
}

fn get_default_cwd() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        // Directorio por defecto: home del usuario en Windows
        home_dir().map(|p| p.to_string_lossy().to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .ok()
            .or_else(|| dirs::home_dir().map(|p| p.to_string_lossy().to_string()))
    }
}

#[tauri::command]
pub fn terminal_create(
    app: AppHandle,
    state: State<TerminalState>,
    shell: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    let shell_cmd = shell.unwrap_or_else(default_shell);
    let cols = cols.unwrap_or(80);
    let rows = rows.unwrap_or(24);

    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("failed to open pty: {e}"))?;

    let mut cmd = CommandBuilder::new(&shell_cmd);

    // Directorio de trabajo con fallback
    let working_dir = cwd.or_else(get_default_cwd);
    if let Some(dir) = working_dir.as_ref() {
        cmd.cwd(dir);
    }

    #[cfg(target_os = "windows")]
    {
        // Variables de entorno para mejor comportamiento en Windows
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
    }

    let child = match pair.slave.spawn_command(cmd) {
        Ok(child) => child,
        Err(err) => {
            #[cfg(target_os = "windows")]
            {
                // Fallback a cmd.exe si PowerShell falla
                let mut cmd_fb = CommandBuilder::new("cmd.exe");
                if let Some(dir) = working_dir.as_ref() {
                    cmd_fb.cwd(dir);
                }
                cmd_fb.env("TERM", "xterm-256color");
                cmd_fb.env("COLORTERM", "truecolor");
                pair.slave.spawn_command(cmd_fb).map_err(|e2| {
                    format!("failed to spawn shell: {err}; fallback to cmd.exe failed: {e2}")
                })?
            }
            #[cfg(not(target_os = "windows"))]
            {
                return Err(format!("failed to spawn shell: {err}"));
            }
        }
    };

    let id = Uuid::new_v4().to_string();

    // Clonar reader del master para el hilo en background
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("failed to clone reader: {e}"))?;

    // Obtener writer (stdin del hijo)
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("failed to take writer: {e}"))?;

    let writer_arc = Arc::new(Mutex::new(writer));
    let child_arc = Arc::new(Mutex::new(Some(child)));
    let state_arc = Arc::new(Mutex::new(SessionState::Starting));

    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Hilo en background enviando datos al frontend
    let app_handle = app.clone();
    let session_id = id.clone();
    let state_clone = state_arc.clone();
    let child_clone = child_arc.clone();
    let sessions_ref = state.sessions.clone();

    thread::spawn(move || {
        // Dar un momento al shell para inicializar
        thread::sleep(Duration::from_millis(100));

        // Marcar como activo
        {
            if let Ok(mut s) = state_clone.lock() {
                *s = SessionState::Active;
                let _ = app_handle.emit(
                    "terminal/state",
                    TerminalStateEvent {
                        id: session_id.clone(),
                        state: SessionState::Active,
                    },
                );
            }
        }

        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF; el hijo terminó
                    {
                        if let Ok(mut s) = state_clone.lock() {
                            *s = SessionState::Exited;
                        }
                    }
                    let _ =
                        app_handle.emit("terminal/exit", serde_json::json!({ "id": session_id }));
                    let _ = app_handle.emit(
                        "terminal/state",
                        TerminalStateEvent {
                            id: session_id.clone(),
                            state: SessionState::Exited,
                        },
                    );
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let payload = TerminalDataEvent {
                        id: session_id.clone(),
                        data,
                    };
                    let _ = app_handle.emit("terminal/data", payload);
                }
                Err(err) => {
                    {
                        if let Ok(mut s) = state_clone.lock() {
                            *s = SessionState::Error;
                        }
                    }
                    let _ = app_handle.emit(
                        "terminal/error",
                        serde_json::json!({ "id": session_id, "error": err.to_string() }),
                    );
                    let _ = app_handle.emit(
                        "terminal/state",
                        TerminalStateEvent {
                            id: session_id.clone(),
                            state: SessionState::Error,
                        },
                    );
                    break;
                }
            }
        }

        // Cleanup child process on exit
        if let Ok(mut child_opt) = child_clone.lock() {
            if let Some(mut child) = child_opt.take() {
                let _ = child.wait();
            }
        }

        // Auto-remove session after exit
        thread::sleep(Duration::from_secs(2));
        if let Ok(mut sessions) = sessions_ref.lock() {
            sessions.remove(&session_id);
        }
    });

    {
        let mut sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
        sessions.insert(
            id.clone(),
            TerminalSession {
                id: id.clone(),
                pair,
                writer: writer_arc,
                child: child_arc,
                shell_cmd: shell_cmd.clone(),
                state: state_arc,
                created_at,
                cwd: working_dir,
            },
        );
    }

    Ok(id)
}

#[tauri::command]
pub fn terminal_write(state: State<TerminalState>, id: String, data: String) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("unknown session: {id}"))?;

    {
        let mut w = session.writer.lock().map_err(|_| "writer lock poisoned")?;
        w.write_all(data.as_bytes())
            .map_err(|e| format!("write failed: {e}"))?;
        w.flush().ok();
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_resize(
    state: State<TerminalState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("unknown session: {id}"))?;
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };
    session
        .pair
        .master
        .resize(size)
        .map_err(|e| format!("resize failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn terminal_kill(state: State<TerminalState>, id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
    let session = sessions
        .remove(&id)
        .ok_or_else(|| format!("unknown session: {id}"))?;

    // Properly terminate child process
    if let Ok(mut child_opt) = session.child.lock() {
        if let Some(mut child) = child_opt.take() {
            let _ = child.kill();
        }
    }

    // Al soltar la sesión, el shell termina
    drop(session);
    Ok(())
}

/// Get information about a specific terminal session
#[tauri::command]
pub fn terminal_get_session(
    state: State<TerminalState>,
    id: String,
) -> Result<TerminalSessionInfo, String> {
    let sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("unknown session: {id}"))?;

    let session_state = *session.state.lock().map_err(|_| "state lock poisoned")?;

    Ok(TerminalSessionInfo {
        id: session.id.clone(),
        shell_cmd: session.shell_cmd.clone(),
        state: session_state,
        created_at: session.created_at,
        cwd: session.cwd.clone(),
    })
}

/// List all active terminal sessions
#[tauri::command]
pub fn terminal_list_sessions(
    state: State<TerminalState>,
) -> Result<Vec<TerminalSessionInfo>, String> {
    let sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
    let mut result = Vec::new();

    for session in sessions.values() {
        let session_state = *session.state.lock().map_err(|_| "state lock poisoned")?;
        result.push(TerminalSessionInfo {
            id: session.id.clone(),
            shell_cmd: session.shell_cmd.clone(),
            state: session_state,
            created_at: session.created_at,
            cwd: session.cwd.clone(),
        });
    }

    Ok(result)
}

/// Get available shell profiles
#[tauri::command]
pub fn terminal_get_profiles(state: State<TerminalState>) -> Result<Vec<ShellProfile>, String> {
    let profiles = state.profiles.lock().map_err(|_| "lock poisoned")?;
    if profiles.is_empty() {
        Ok(detect_available_shells())
    } else {
        Ok(profiles.clone())
    }
}

/// Initialize shell profiles detection
#[tauri::command]
pub fn terminal_init_profiles(state: State<TerminalState>) -> Result<Vec<ShellProfile>, String> {
    let detected = detect_available_shells();
    let mut profiles = state.profiles.lock().map_err(|_| "lock poisoned")?;
    *profiles = detected.clone();
    Ok(detected)
}

/// Cambiar el directorio de trabajo de una sesión existente
#[tauri::command]
pub fn terminal_change_directory(
    state: State<TerminalState>,
    id: String,
    path: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("unknown session: {id}"))?;

    #[cfg(target_os = "windows")]
    let command = {
        let shell = session.shell_cmd.to_lowercase();
        if shell.contains("cmd.exe") || shell.contains("\\cmd.exe") {
            format!("cd /d \"{}\"\r", path)
        } else {
            // PowerShell/pwsh soporte: cd cambia también de unidad
            format!("cd \"{}\"\r", path)
        }
    };
    #[cfg(not(target_os = "windows"))]
    let command = format!("cd \"{}\"\n", path);

    {
        let mut w = session.writer.lock().map_err(|_| "writer lock poisoned")?;
        w.write_all(command.as_bytes())
            .map_err(|e| format!("cd command failed: {e}"))?;
        w.flush().ok();
    }
    Ok(())
}
