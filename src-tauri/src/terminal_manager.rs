use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

#[cfg(target_os = "windows")]
use dirs::home_dir;

#[derive(Default)]
pub struct TerminalState {
  pub sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

pub struct TerminalSession {
  pub id: String,
  pub pair: PtyPair,
  pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
  pub shell_cmd: String,
}

#[derive(Serialize, Clone)]
struct TerminalDataEvent {
  id: String,
  data: String,
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

fn get_default_cwd() -> Option<String> {
  #[cfg(target_os = "windows")]
  {
    // Directorio por defecto: home del usuario en Windows
    home_dir().map(|p| p.to_string_lossy().to_string())
  }
  #[cfg(not(target_os = "windows"))]
  {
    std::env::var("HOME").ok().or_else(|| {
      dirs::home_dir().map(|p| p.to_string_lossy().to_string())
    })
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

  let mut _child = match pair.slave.spawn_command(cmd) {
    Ok(child) => child,
    Err(err) => {
      #[cfg(target_os = "windows")]
      {
        // Fallback a cmd.exe si PowerShell falla
        let mut cmd_fb = CommandBuilder::new("cmd.exe");
        if let Some(dir) = working_dir.as_ref() { cmd_fb.cwd(dir); }
        cmd_fb.env("TERM", "xterm-256color");
        cmd_fb.env("COLORTERM", "truecolor");
        pair.slave
          .spawn_command(cmd_fb)
          .map_err(|e2| format!("failed to spawn shell: {err}; fallback to cmd.exe failed: {e2}"))?
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

  // Hilo en background enviando datos al frontend
  let app_handle = app.clone();
  let session_id = id.clone();
  let _writer_clone = writer_arc.clone();
  
  thread::spawn(move || {
    // Dar un momento al shell para inicializar
    thread::sleep(Duration::from_millis(100));
    
    // Eliminado: no forzar Enter inicial, evita prompts duplicados
    
    let mut buf = [0u8; 8192];
    loop {
      match reader.read(&mut buf) {
        Ok(0) => {
          // EOF; el hijo terminó
          let _ = app_handle.emit(
            "terminal/exit",
            serde_json::json!({ "id": session_id }),
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
          let _ = app_handle.emit(
            "terminal/error",
            serde_json::json!({ "id": session_id, "error": err.to_string() }),
          );
          break;
        }
      }
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
        shell_cmd: shell_cmd.clone(),
      },
    );
  }

  Ok(id)
}

#[tauri::command]
pub fn terminal_write(
  state: State<TerminalState>,
  id: String,
  data: String,
) -> Result<(), String> {
  let sessions = state.sessions.lock().map_err(|_| "lock poisoned")?;
  let session = sessions
    .get(&id)
    .ok_or_else(|| format!("unknown session: {id}"))?;

  {
    let mut w = session
      .writer
      .lock()
      .map_err(|_| "writer lock poisoned")?;
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
  // Al soltar la sesión, el shell termina
  drop(session);
  Ok(())
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
    let mut w = session
      .writer
      .lock()
      .map_err(|_| "writer lock poisoned")?;
    w.write_all(command.as_bytes())
      .map_err(|e| format!("cd command failed: {e}"))?;
    w.flush().ok();
  }
  Ok(())
}