//! Model provider implementations
//!
//! This module contains provider-specific implementations for different
//! AI model APIs (Google Gemini, Groq, etc.)

pub mod base;
pub mod google;
pub mod groq;

// Reserved for future implementation (Phase 4+)
#[allow(unused_imports)]
pub use base::ModelProvider;
#[allow(unused_imports)]
pub use google::GoogleProvider;
#[allow(unused_imports)]
pub use groq::GroqProvider;
