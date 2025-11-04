use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_notes: Option<String>,
    pub release_date: Option<String>,
    pub download_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    pub status: String,
    pub progress: Option<f64>,
    pub message: Option<String>,
}

/// Check for available updates
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();

    // Emit checking status
    let _ = app.emit(
        "update-status",
        UpdateProgress {
            status: "checking".to_string(),
            progress: None,
            message: Some("Checking for updates...".to_string()),
        },
    );

    #[cfg(not(debug_assertions))]
    {
        use tauri_plugin_updater::UpdaterExt;

        match app.updater() {
            Ok(updater) => {
                match updater.check().await {
                    Ok(update_response) => {
                        if let Some(update) = update_response {
                            // Update available
                            let info = UpdateInfo {
                                available: true,
                                current_version: current_version.clone(),
                                latest_version: Some(update.version.clone()),
                                release_notes: update.body.clone(),
                                release_date: Some(update.date.clone()),
                                download_url: Some(update.download_url.clone()),
                            };

                            let _ = app.emit(
                                "update-status",
                                UpdateProgress {
                                    status: "available".to_string(),
                                    progress: None,
                                    message: Some(format!(
                                        "Update available: v{}",
                                        update.version
                                    )),
                                },
                            );

                            Ok(info)
                        } else {
                            // No update available
                            let info = UpdateInfo {
                                available: false,
                                current_version,
                                latest_version: None,
                                release_notes: None,
                                release_date: None,
                                download_url: None,
                            };

                            let _ = app.emit(
                                "update-status",
                                UpdateProgress {
                                    status: "up-to-date".to_string(),
                                    progress: None,
                                    message: Some("You're up to date!".to_string()),
                                },
                            );

                            Ok(info)
                        }
                    }
                    Err(e) => {
                        let _ = app.emit(
                            "update-status",
                            UpdateProgress {
                                status: "error".to_string(),
                                progress: None,
                                message: Some(format!("Failed to check for updates: {}", e)),
                            },
                        );
                        Err(format!("Failed to check for updates: {}", e))
                    }
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "update-status",
                    UpdateProgress {
                        status: "error".to_string(),
                        progress: None,
                        message: Some(format!("Updater not available: {}", e)),
                    },
                );
                Err(format!("Updater not available: {}", e))
            }
        }
    }

    #[cfg(debug_assertions)]
    {
        // In development mode, simulate no updates available
        let info = UpdateInfo {
            available: false,
            current_version,
            latest_version: None,
            release_notes: None,
            release_date: None,
            download_url: None,
        };

        let _ = app.emit(
            "update-status",
            UpdateProgress {
                status: "dev-mode".to_string(),
                progress: None,
                message: Some("Update checking is disabled in development mode".to_string()),
            },
        );

        Ok(info)
    }
}

/// Download and install an update
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    {
        use tauri_plugin_updater::UpdaterExt;

        let _ = app.emit(
            "update-status",
            UpdateProgress {
                status: "downloading".to_string(),
                progress: Some(0.0),
                message: Some("Starting download...".to_string()),
            },
        );

        match app.updater() {
            Ok(updater) => {
                match updater.check().await {
                    Ok(update_response) => {
                        if let Some(update) = update_response {
                            let _ = app.emit(
                                "update-status",
                                UpdateProgress {
                                    status: "downloading".to_string(),
                                    progress: Some(50.0),
                                    message: Some(format!("Downloading v{}...", update.version)),
                                },
                            );

                            // Download and install
                            match update
                                .download_and_install(
                                    |chunk_length, content_length| {
                                        if let Some(total) = content_length {
                                            let progress = (chunk_length as f64 / total as f64) * 100.0;
                                            let _ = app.emit(
                                                "update-status",
                                                UpdateProgress {
                                                    status: "downloading".to_string(),
                                                    progress: Some(progress),
                                                    message: Some(format!(
                                                        "Downloading... {:.1}%",
                                                        progress
                                                    )),
                                                },
                                            );
                                        }
                                    },
                                    || {
                                        let _ = app.emit(
                                            "update-status",
                                            UpdateProgress {
                                                status: "installing".to_string(),
                                                progress: Some(100.0),
                                                message: Some("Installing update...".to_string()),
                                            },
                                        );
                                    },
                                )
                                .await
                            {
                                Ok(_) => {
                                    let _ = app.emit(
                                        "update-status",
                                        UpdateProgress {
                                            status: "ready".to_string(),
                                            progress: Some(100.0),
                                            message: Some(
                                                "Update installed! Restart to apply.".to_string()
                                            ),
                                        },
                                    );
                                    Ok(())
                                }
                                Err(e) => {
                                    let _ = app.emit(
                                        "update-status",
                                        UpdateProgress {
                                            status: "error".to_string(),
                                            progress: None,
                                            message: Some(format!("Failed to install update: {}", e)),
                                        },
                                    );
                                    Err(format!("Failed to install update: {}", e))
                                }
                            }
                        } else {
                            let _ = app.emit(
                                "update-status",
                                UpdateProgress {
                                    status: "error".to_string(),
                                    progress: None,
                                    message: Some("No update available to install".to_string()),
                                },
                            );
                            Err("No update available to install".to_string())
                        }
                    }
                    Err(e) => {
                        let _ = app.emit(
                            "update-status",
                            UpdateProgress {
                                status: "error".to_string(),
                                progress: None,
                                message: Some(format!("Failed to check for updates: {}", e)),
                            },
                        );
                        Err(format!("Failed to check for updates: {}", e))
                    }
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "update-status",
                    UpdateProgress {
                        status: "error".to_string(),
                        progress: None,
                        message: Some(format!("Updater not available: {}", e)),
                    },
                );
                Err(format!("Updater not available: {}", e))
            }
        }
    }

    #[cfg(debug_assertions)]
    {
        let _ = app.emit(
            "update-status",
            UpdateProgress {
                status: "dev-mode".to_string(),
                progress: None,
                message: Some("Update installation is disabled in development mode".to_string()),
            },
        );
        Err("Update installation is disabled in development mode".to_string())
    }
}

/// Get current application version
#[tauri::command]
pub fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}
