pub mod commands;
pub mod hotkeys;
pub mod input;
pub mod state;
pub mod transcription;
pub mod tray;

use commands::dictation::AudioChannelState;
use state::{AppState, SharedState};
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let shared_state: SharedState = Arc::new(Mutex::new(AppState::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .manage(shared_state)
        .manage(AudioChannelState::default())
        .setup(|app| {
            let handle = app.handle().clone();

            // Setup system tray
            if let Err(e) = tray::tray_manager::setup_tray(&handle) {
                log::error!("Failed to setup tray: {}", e);
            }

            // Register global shortcuts (F10 start, F11 stop)
            if let Err(e) = hotkeys::shortcuts::register_global_shortcuts(&handle) {
                log::error!("Failed to register global shortcuts: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::dictation::start_dictation,
            commands::dictation::stop_dictation,
            commands::dictation::send_audio_chunk,
            commands::settings::set_api_key,
            commands::settings::get_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VoiceApp");
}
