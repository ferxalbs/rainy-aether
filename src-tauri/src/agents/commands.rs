//! Tauri commands for agent system
//!
//! This module exposes the agent system functionality to the frontend via Tauri commands

use super::{
    AgentConfig, AgentManager, AgentMetrics, AgentResult,
    AllMetrics, MemoryStats, Message, Session, ToolDefinition,
};
use super::core::ToolResult;
use tauri::State;

/// Create a new agent session
#[tauri::command]
pub fn agent_create_session(
    agent_type: String,
    config: AgentConfig,
    state: State<'_, AgentManager>,
) -> Result<String, String> {
    state.create_session(agent_type, config)
        .map_err(|e| e.to_string())
}

/// Send a message to an agent
#[tauri::command]
pub async fn agent_send_message(
    session_id: String,
    message: String,
    enable_tools: bool,
    state: State<'_, AgentManager>,
) -> Result<AgentResult, String> {
    state.send_message(&session_id, message, enable_tools)
        .await
        .map_err(|e| e.to_string())
}

/// Get session information
#[tauri::command]
pub fn agent_get_session(
    session_id: String,
    state: State<'_, AgentManager>,
) -> Result<Option<Session>, String> {
    Ok(state.get_session(&session_id))
}

/// Get conversation history
#[tauri::command]
pub fn agent_get_history(
    session_id: String,
    limit: Option<usize>,
    state: State<'_, AgentManager>,
) -> Result<Vec<Message>, String> {
    Ok(state.get_history(&session_id, limit))
}

/// Get memory statistics
#[tauri::command]
pub fn agent_get_memory_stats(
    session_id: String,
    state: State<'_, AgentManager>,
) -> Result<Option<MemoryStats>, String> {
    Ok(state.get_memory_stats(&session_id))
}

/// Get agent metrics
#[tauri::command]
pub fn agent_get_metrics(
    agent_id: String,
    state: State<'_, AgentManager>,
) -> Result<Option<AgentMetrics>, String> {
    Ok(state.get_metrics(&agent_id))
}

/// Get all metrics
#[tauri::command]
pub fn agent_get_all_metrics(
    state: State<'_, AgentManager>,
) -> Result<AllMetrics, String> {
    Ok(state.get_all_metrics())
}

/// List available tools
#[tauri::command]
pub fn agent_list_tools(
    state: State<'_, AgentManager>,
) -> Result<Vec<ToolDefinition>, String> {
    Ok(state.list_tools())
}

/// Execute a tool directly
///
/// This command allows direct execution of tools from the frontend,
/// bypassing the agent inference layer. Useful for LangGraph integration.
#[tauri::command]
pub async fn agent_execute_tool(
    tool_name: String,
    params: serde_json::Value,
    state: State<'_, AgentManager>,
) -> Result<ToolResult, String> {
    state.execute_tool(&tool_name, params, None)
        .await
        .map_err(|e| e.to_string())
}

/// Destroy a session
#[tauri::command]
pub fn agent_destroy_session(
    session_id: String,
    state: State<'_, AgentManager>,
) -> Result<(), String> {
    state.destroy_session(&session_id)
        .map_err(|e| e.to_string())
}

/// List all active sessions
#[tauri::command]
pub fn agent_list_sessions(
    state: State<'_, AgentManager>,
) -> Result<Vec<String>, String> {
    Ok(state.active_sessions())
}
