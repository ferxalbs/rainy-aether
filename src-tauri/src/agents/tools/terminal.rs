//! Terminal execution tools
//!
//! Tools for executing shell commands and scripts

use crate::agents::executor::Tool;
use async_trait::async_trait;
use serde::Deserialize;
use std::time::Duration;
use tokio::process::Command;

/// Execute command tool
pub struct ExecuteCommandTool;

#[async_trait]
impl Tool for ExecuteCommandTool {
    fn name(&self) -> &str {
        "execute_command"
    }

    fn description(&self) -> &str {
        "Execute a shell command and return its output"
    }

    fn parameters(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Command to execute"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory (optional)"
                }
            },
            "required": ["command"]
        })
    }

    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let args: ExecuteCommandArgs = serde_json::from_value(params)?;

        // Determine shell based on OS
        let (shell, shell_arg) = if cfg!(target_os = "windows") {
            ("cmd", "/C")
        } else {
            ("sh", "-c")
        };

        let mut cmd = Command::new(shell);
        cmd.arg(shell_arg).arg(&args.command);

        if let Some(cwd) = args.cwd {
            cmd.current_dir(cwd);
        }

        let output = cmd.output().await?;

        Ok(serde_json::json!({
            "stdout": String::from_utf8_lossy(&output.stdout),
            "stderr": String::from_utf8_lossy(&output.stderr),
            "exit_code": output.status.code().unwrap_or(-1),
            "success": output.status.success()
        }))
    }

    fn is_cacheable(&self) -> bool {
        false // Commands may have side effects
    }

    fn timeout(&self) -> Option<Duration> {
        Some(Duration::from_secs(30))
    }
}

#[derive(Deserialize)]
struct ExecuteCommandArgs {
    command: String,
    cwd: Option<String>,
}
