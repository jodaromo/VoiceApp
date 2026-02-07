use tauri::AppHandle;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};

/// Registers the global hotkeys:
/// - F10: Start dictation
/// - F11: Stop dictation
pub fn register_global_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let start_shortcut = Shortcut::new(None, Code::F10);
    let stop_shortcut = Shortcut::new(None, Code::F11);

    app.global_shortcut().on_shortcuts(
        [start_shortcut, stop_shortcut],
        move |app_handle, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if shortcut == &start_shortcut {
                    log::info!("F10 pressed — starting dictation");
                    let _ = app_handle.emit("hotkey-start-dictation", ());
                } else if shortcut == &stop_shortcut {
                    log::info!("F11 pressed — stopping dictation");
                    let _ = app_handle.emit("hotkey-stop-dictation", ());
                }
            }
        },
    )?;

    log::info!("Global shortcuts registered: F10 (start), F11 (stop)");
    Ok(())
}
