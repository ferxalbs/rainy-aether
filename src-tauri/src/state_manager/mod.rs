// State Manager Module - Centralized session/app state management
// This module replaces the fragmented TypeScript persistence with a robust Rust backend

pub mod session_state;

pub use session_state::*;
