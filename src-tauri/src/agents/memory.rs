//! Memory and conversation management
//!
//! This module manages conversation history, context windows, and message pruning
//! to stay within token limits while preserving important context.

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::SystemTime;

/// Memory manager for conversation storage
pub struct MemoryManager {
    /// Storage for all conversation memories
    storage: Arc<DashMap<String, ConversationMemory>>,

    /// Maximum number of messages to keep in history
    max_history_size: usize,

    /// Default maximum tokens per conversation
    default_max_tokens: usize,
}

impl MemoryManager {
    /// Create a new memory manager
    ///
    /// # Arguments
    ///
    /// * `max_history_size` - Maximum messages to keep in history
    /// * `default_max_tokens` - Default token limit per conversation
    pub fn new(max_history_size: usize, default_max_tokens: usize) -> Self {
        Self {
            storage: Arc::new(DashMap::new()),
            max_history_size,
            default_max_tokens,
        }
    }

    /// Create or get conversation memory for a session
    pub fn get_or_create(&self, session_id: &str) -> ConversationMemory {
        self.storage
            .entry(session_id.to_string())
            .or_insert_with(|| {
                ConversationMemory::new(session_id, self.default_max_tokens)
            })
            .clone()
    }

    /// Add a message to conversation history
    pub fn add_message(&self, session_id: &str, message: Message) {
        let mut memory = self.storage
            .entry(session_id.to_string())
            .or_insert_with(|| {
                ConversationMemory::new(session_id, self.default_max_tokens)
            });

        memory.messages.push_back(message.clone());
        memory.total_tokens += message.token_count;
        memory.updated_at = SystemTime::now();

        // Prune if over limit
        if memory.total_tokens > memory.max_tokens {
            self.prune_messages_internal(&mut memory);
        }

        // Limit message count
        while memory.messages.len() > self.max_history_size {
            if let Some(removed) = memory.messages.pop_front() {
                memory.total_tokens = memory.total_tokens.saturating_sub(removed.token_count);
            }
        }
    }

    /// Get conversation history
    pub fn get_history(&self, session_id: &str, limit: Option<usize>) -> Vec<Message> {
        if let Some(memory) = self.storage.get(session_id) {
            let limit = limit.unwrap_or(self.max_history_size);
            memory.messages
                .iter()
                .rev()
                .take(limit)
                .rev()
                .cloned()
                .collect()
        } else {
            vec![]
        }
    }

    /// Get recent messages (last N)
    pub fn get_recent(&self, session_id: &str, count: usize) -> Vec<Message> {
        if let Some(memory) = self.storage.get(session_id) {
            memory.messages
                .iter()
                .rev()
                .take(count)
                .rev()
                .cloned()
                .collect()
        } else {
            vec![]
        }
    }

    /// Prune old messages to stay within token limit
    pub fn prune_messages(&self, session_id: &str) {
        if let Some(mut memory) = self.storage.get_mut(session_id) {
            self.prune_messages_internal(&mut memory);
        }
    }

    /// Internal pruning implementation
    fn prune_messages_internal(&self, memory: &mut ConversationMemory) {
        // Preserve system message if present
        let system_msg = memory.messages
            .iter()
            .find(|m| m.role == MessageRole::System)
            .cloned();

        // Remove oldest messages until under limit (but keep at least last 2)
        while memory.total_tokens > memory.max_tokens && memory.messages.len() > 2 {
            // Don't remove system message
            let should_remove = memory.messages.front()
                .map(|msg| msg.role != MessageRole::System)
                .unwrap_or(false);

            if should_remove {
                if let Some(removed) = memory.messages.pop_front() {
                    memory.total_tokens = memory.total_tokens.saturating_sub(removed.token_count);
                }
            } else {
                // If front is system message, remove second message
                if memory.messages.len() > 1 {
                    let msg = memory.messages.remove(1).unwrap();
                    memory.total_tokens = memory.total_tokens.saturating_sub(msg.token_count);
                } else {
                    break;
                }
            }
        }

        // Re-add system message if it was removed
        if let Some(sys_msg) = system_msg {
            if !memory.messages.iter().any(|m| m.role == MessageRole::System) {
                memory.messages.push_front(sys_msg);
            }
        }
    }

    /// Clear conversation history
    pub fn clear_session(&self, session_id: &str) {
        self.storage.remove(session_id);
    }

    /// Get memory statistics
    pub fn get_stats(&self, session_id: &str) -> Option<MemoryStats> {
        self.storage.get(session_id).map(|memory| MemoryStats {
            message_count: memory.messages.len(),
            total_tokens: memory.total_tokens,
            max_tokens: memory.max_tokens,
            utilization: (memory.total_tokens as f64 / memory.max_tokens as f64) * 100.0,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
        })
    }

    /// Get all active sessions
    pub fn get_active_sessions(&self) -> Vec<String> {
        self.storage.iter().map(|entry| entry.key().clone()).collect()
    }

    /// Get total memory usage across all sessions
    pub fn total_memory_usage(&self) -> MemoryUsage {
        let mut total_messages = 0;
        let mut total_tokens = 0;
        let mut total_sessions = 0;

        for entry in self.storage.iter() {
            total_sessions += 1;
            total_messages += entry.value().messages.len();
            total_tokens += entry.value().total_tokens;
        }

        MemoryUsage {
            total_sessions,
            total_messages,
            total_tokens,
        }
    }
}

impl Default for MemoryManager {
    fn default() -> Self {
        Self::new(1000, 100_000)
    }
}

/// Conversation memory for a single session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMemory {
    /// Session identifier
    pub session_id: String,

    /// Message history
    pub messages: VecDeque<Message>,

    /// Total tokens in conversation
    pub total_tokens: usize,

    /// Maximum tokens allowed
    pub max_tokens: usize,

    /// When conversation was created
    pub created_at: SystemTime,

    /// When conversation was last updated
    pub updated_at: SystemTime,
}

impl ConversationMemory {
    /// Create new conversation memory
    pub fn new(session_id: &str, max_tokens: usize) -> Self {
        let now = SystemTime::now();
        Self {
            session_id: session_id.to_string(),
            messages: VecDeque::new(),
            total_tokens: 0,
            max_tokens,
            created_at: now,
            updated_at: now,
        }
    }

    /// Add a message to memory
    pub fn add_message(&mut self, message: Message) {
        self.total_tokens += message.token_count;
        self.messages.push_back(message);
        self.updated_at = SystemTime::now();
    }

    /// Get messages as slice
    pub fn as_slice(&self) -> Vec<Message> {
        self.messages.iter().cloned().collect()
    }
}

/// Message in conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// Unique message identifier
    pub id: String,

    /// Message role
    pub role: MessageRole,

    /// Message content
    pub content: String,

    /// Estimated token count
    pub token_count: usize,

    /// Message timestamp
    #[serde(default = "SystemTime::now")]
    pub timestamp: SystemTime,

    /// Optional metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

impl Message {
    /// Create a new message
    pub fn new(role: MessageRole, content: String) -> Self {
        let token_count = estimate_tokens(&content);
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            role,
            content,
            token_count,
            timestamp: SystemTime::now(),
            metadata: None,
        }
    }

    /// Create a system message
    pub fn system(content: String) -> Self {
        Self::new(MessageRole::System, content)
    }

    /// Create a user message
    pub fn user(content: String) -> Self {
        Self::new(MessageRole::User, content)
    }

    /// Create an assistant message
    pub fn assistant(content: String) -> Self {
        Self::new(MessageRole::Assistant, content)
    }
}

/// Message role
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

/// Memory statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    /// Number of messages in memory
    pub message_count: usize,

    /// Total tokens used
    pub total_tokens: usize,

    /// Maximum tokens allowed
    pub max_tokens: usize,

    /// Memory utilization percentage
    pub utilization: f64,

    /// When memory was created
    pub created_at: SystemTime,

    /// When memory was last updated
    pub updated_at: SystemTime,
}

/// Overall memory usage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryUsage {
    /// Total number of active sessions
    pub total_sessions: usize,

    /// Total messages across all sessions
    pub total_messages: usize,

    /// Total tokens across all sessions
    pub total_tokens: usize,
}

/// Estimate token count for text
///
/// Uses a simple heuristic: ~1 token per 4 characters
/// This is approximate and provider-dependent
fn estimate_tokens(text: &str) -> usize {
    // Simple estimation: 1 token ≈ 4 characters
    // Add words as tokens (split by whitespace)
    let char_estimate = text.len() / 4;
    let word_estimate = text.split_whitespace().count();

    // Take average of both estimates
    (char_estimate + word_estimate) / 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_creation() {
        let manager = MemoryManager::new(100, 10000);
        let memory = manager.get_or_create("test-session");

        assert_eq!(memory.session_id, "test-session");
        assert_eq!(memory.messages.len(), 0);
        assert_eq!(memory.total_tokens, 0);
    }

    #[test]
    fn test_add_message() {
        let manager = MemoryManager::new(100, 10000);

        let msg = Message::user("Hello, world!".to_string());
        manager.add_message("test-session", msg);

        let history = manager.get_history("test-session", None);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].content, "Hello, world!");
    }

    #[test]
    fn test_token_estimation() {
        let text = "Hello world, this is a test message";
        let tokens = estimate_tokens(text);
        assert!(tokens > 0);
        assert!(tokens < 100); // Should be reasonable
    }

    #[test]
    fn test_memory_pruning() {
        let manager = MemoryManager::new(100, 50); // Very small limit

        // Add messages that exceed limit
        for i in 0..10 {
            let msg = Message::user(format!("Message number {}", i));
            manager.add_message("test-session", msg);
        }

        let stats = manager.get_stats("test-session").unwrap();
        assert!(stats.total_tokens <= 50 || stats.message_count <= 2);
    }

    #[test]
    fn test_message_roles() {
        let sys_msg = Message::system("System prompt".to_string());
        let user_msg = Message::user("User message".to_string());
        let asst_msg = Message::assistant("Assistant response".to_string());

        assert_eq!(sys_msg.role, MessageRole::System);
        assert_eq!(user_msg.role, MessageRole::User);
        assert_eq!(asst_msg.role, MessageRole::Assistant);
    }
}
