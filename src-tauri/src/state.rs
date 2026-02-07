use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DictationStatus {
    Active,
    Inactive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DetectedLanguage {
    EnglishUS,
    SpanishColombia,
    Unknown,
}

impl DetectedLanguage {
    pub fn as_label(&self) -> &str {
        match self {
            DetectedLanguage::EnglishUS => "EN-US",
            DetectedLanguage::SpanishColombia => "ES-CO",
            DetectedLanguage::Unknown => "...",
        }
    }

    pub fn from_code(code: &str) -> Self {
        match code {
            "en" | "en-US" | "en-us" => DetectedLanguage::EnglishUS,
            "es" | "es-CO" | "es-co" | "es-419" => DetectedLanguage::SpanishColombia,
            _ => DetectedLanguage::Unknown,
        }
    }
}

#[derive(Debug)]
pub struct AppState {
    pub status: DictationStatus,
    pub detected_language: DetectedLanguage,
    pub deepgram_api_key: String,
    /// Channel to signal the transcription task to stop
    pub stop_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            status: DictationStatus::Inactive,
            detected_language: DetectedLanguage::Unknown,
            deepgram_api_key: String::new(),
            stop_tx: None,
        }
    }
}

pub type SharedState = Arc<Mutex<AppState>>;
