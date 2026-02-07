use enigo::{Enigo, Keyboard, Settings};
use std::sync::Mutex;

pub struct KeyboardInjector {
    enigo: Mutex<Enigo>,
}

impl KeyboardInjector {
    pub fn new() -> Result<Self, String> {
        let enigo =
            Enigo::new(&Settings::default()).map_err(|e| format!("Failed to init enigo: {}", e))?;
        Ok(Self {
            enigo: Mutex::new(enigo),
        })
    }

    /// Types the transcribed text into the currently focused application.
    /// Uses Windows SendInput API under the hood via enigo.
    pub fn type_text(&self, text: &str) -> Result<(), String> {
        let mut enigo = self
            .enigo
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        enigo
            .text(text)
            .map_err(|e| format!("Failed to type text: {}", e))?;
        Ok(())
    }
}
