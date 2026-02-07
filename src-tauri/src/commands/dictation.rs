use crate::input::keyboard::KeyboardInjector;
use crate::state::{DictationStatus, DetectedLanguage, SharedState};
use crate::transcription::deepgram::{DeepgramClient, TranscriptionResult};
use crate::tray::tray_manager;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, oneshot};

/// Starts the dictation session. Opens a Deepgram WebSocket and begins
/// accepting audio chunks from the frontend.
#[tauri::command]
pub async fn start_dictation(
    app: AppHandle,
    state: State<'_, SharedState>,
    audio_channel_state: State<'_, AudioChannelState>,
) -> Result<(), String> {
    let mut app_state = state.lock().await;

    // Already active check
    if matches!(app_state.status, DictationStatus::Active) {
        return Err("Dictation is already active".to_string());
    }

    let api_key = app_state.deepgram_api_key.clone();
    if api_key.is_empty() {
        return Err("Deepgram API key not set. Please configure it in settings.".to_string());
    }

    // Create channels
    let (audio_tx, audio_rx) = mpsc::channel::<Vec<u8>>(100);
    let (result_tx, mut result_rx) = mpsc::channel::<TranscriptionResult>(100);
    let (stop_tx, stop_rx) = oneshot::channel::<()>();

    // Update state
    app_state.status = DictationStatus::Active;
    app_state.stop_tx = Some(stop_tx);
    drop(app_state);

    // Store the audio sender so frontend can send chunks
    {
        let mut tx_guard = audio_channel_state.tx.lock().await;
        *tx_guard = Some(audio_tx);
    }

    // Update tray
    tray_manager::update_tray_status(&app, true, "...");

    // Emit status change to frontend
    let _ = app.emit("dictation-status-changed", "active");

    // Spawn Deepgram streaming task
    let app_clone = app.clone();
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        let client = DeepgramClient::new(api_key);

        if let Err(e) = client.start_streaming(audio_rx, result_tx, stop_rx).await {
            log::error!("Deepgram streaming error: {}", e);
            let _ = app_clone.emit("dictation-error", e.to_string());
        }

        // When streaming ends, mark as inactive
        let mut app_state = state_clone.lock().await;
        app_state.status = DictationStatus::Inactive;
        app_state.stop_tx = None;
        drop(app_state);

        tray_manager::update_tray_status(&app_clone, false, "");
        let _ = app_clone.emit("dictation-status-changed", "inactive");
    });

    // Spawn task to handle transcription results → keystroke injection
    let app_clone2 = app.clone();
    let state_clone2 = state.inner().clone();
    tokio::spawn(async move {
        let injector = match KeyboardInjector::new() {
            Ok(inj) => Arc::new(inj),
            Err(e) => {
                log::error!("Failed to create keyboard injector: {}", e);
                let _ = app_clone2.emit("dictation-error", e);
                return;
            }
        };

        while let Some(result) = result_rx.recv().await {
            // Emit interim/final results to frontend for display
            let _ = app_clone2.emit("transcription-result", &result.transcript);

            // Update detected language
            if let Some(ref lang_code) = result.language {
                let lang = DetectedLanguage::from_code(lang_code);
                let label = lang.as_label().to_string();

                let mut app_state = state_clone2.lock().await;
                app_state.detected_language = lang;
                drop(app_state);

                let _ = app_clone2.emit("language-detected", &label);
                tray_manager::update_tray_status(&app_clone2, true, &label);
            }

            // Only inject final transcriptions as keystrokes
            if result.is_final && !result.transcript.is_empty() {
                let text = result.transcript.clone();
                let inj = Arc::clone(&injector);
                // Inject text in a blocking task since enigo uses synchronous OS calls
                let inject_result =
                    tokio::task::spawn_blocking(move || inj.type_text(&text)).await;

                match inject_result {
                    Ok(Ok(())) => {
                        log::info!("Injected text: {}", result.transcript);
                    }
                    Ok(Err(e)) => {
                        log::error!("Keystroke injection error: {}", e);
                        let _ = app_clone2.emit("dictation-error", e);
                    }
                    Err(e) => {
                        log::error!("Task join error: {}", e);
                    }
                }
            }
        }
    });

    Ok(())
}

/// Stops the active dictation session.
#[tauri::command]
pub async fn stop_dictation(
    app: AppHandle,
    state: State<'_, SharedState>,
    audio_channel_state: State<'_, AudioChannelState>,
) -> Result<(), String> {
    let mut app_state = state.lock().await;

    if matches!(app_state.status, DictationStatus::Inactive) {
        return Err("Dictation is not active".to_string());
    }

    // Send stop signal
    if let Some(stop_tx) = app_state.stop_tx.take() {
        let _ = stop_tx.send(());
    }

    app_state.status = DictationStatus::Inactive;
    app_state.detected_language = DetectedLanguage::Unknown;
    drop(app_state);

    // Clear the audio channel
    {
        let mut tx_guard = audio_channel_state.tx.lock().await;
        *tx_guard = None;
    }

    tray_manager::update_tray_status(&app, false, "");
    let _ = app.emit("dictation-status-changed", "inactive");

    log::info!("Dictation stopped");
    Ok(())
}

/// Receives an audio chunk from the frontend and forwards it to Deepgram.
#[tauri::command]
pub async fn send_audio_chunk(
    audio_channel_state: State<'_, AudioChannelState>,
    chunk: Vec<u8>,
) -> Result<(), String> {
    let tx_guard = audio_channel_state.tx.lock().await;
    if let Some(ref tx) = *tx_guard {
        tx.send(chunk)
            .await
            .map_err(|_| "Audio channel closed".to_string())?;
    }
    Ok(())
}

/// Holds the audio sender channel so the frontend can stream audio chunks
/// to the active Deepgram session.
pub struct AudioChannelState {
    pub tx: tokio::sync::Mutex<Option<mpsc::Sender<Vec<u8>>>>,
}

impl Default for AudioChannelState {
    fn default() -> Self {
        Self {
            tx: tokio::sync::Mutex::new(None),
        }
    }
}
