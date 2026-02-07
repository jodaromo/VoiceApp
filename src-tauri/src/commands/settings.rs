use crate::state::SharedState;
use tauri::State;

/// Sets the Deepgram API key at runtime.
#[tauri::command]
pub async fn set_api_key(state: State<'_, SharedState>, api_key: String) -> Result<(), String> {
    let mut app_state = state.lock().await;
    app_state.deepgram_api_key = api_key;
    Ok(())
}

/// Gets the current dictation status.
#[tauri::command]
pub async fn get_status(state: State<'_, SharedState>) -> Result<String, String> {
    let app_state = state.lock().await;
    let status = match app_state.status {
        crate::state::DictationStatus::Active => "active",
        crate::state::DictationStatus::Inactive => "inactive",
    };
    Ok(status.to_string())
}
