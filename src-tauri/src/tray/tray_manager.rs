use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

/// Icon bytes embedded at compile time
const ICON_BYTES: &[u8] = include_bytes!("../../icons/icon.png");

/// Creates and configures the system tray icon with context menu.
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Start Dictation", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit VoiceApp", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

    // Use the default window icon or decode the embedded PNG
    let icon = app
        .default_window_icon()
        .cloned()
        .unwrap_or_else(|| decode_png_icon(ICON_BYTES));

    let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("VoiceApp — Deactivated")
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "toggle" => {
                let _ = app.emit("tray-toggle-dictation", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Updates the tray icon and tooltip based on dictation state.
pub fn update_tray_status(app: &AppHandle, is_active: bool, language: &str) {
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = if is_active {
            format!("VoiceApp — Active ({})", language)
        } else {
            "VoiceApp — Deactivated".to_string()
        };
        let _ = tray.set_tooltip(Some(&tooltip));

        // Update menu text
        if let Ok(toggle_item) = MenuItem::with_id(
            app,
            "toggle",
            if is_active {
                "Stop Dictation"
            } else {
                "Start Dictation"
            },
            true,
            None::<&str>,
        ) {
            if let Ok(quit_item) =
                MenuItem::with_id(app, "quit", "Quit VoiceApp", true, None::<&str>)
            {
                if let Ok(menu) = Menu::with_items(app, &[&toggle_item, &quit_item]) {
                    let _ = tray.set_menu(Some(menu));
                }
            }
        }
    }
}

/// Decodes a PNG file into RGBA pixel data and creates a Tauri Image.
fn decode_png_icon(png_bytes: &[u8]) -> Image<'static> {
    let decoder = png::Decoder::new(png_bytes);
    if let Ok(mut reader) = decoder.read_info() {
        let mut buf = vec![0u8; reader.output_buffer_size()];
        if let Ok(info) = reader.next_frame(&mut buf) {
            buf.truncate(info.buffer_size());
            return Image::new_owned(buf, info.width, info.height);
        }
    }
    // Fallback: 1x1 transparent pixel
    Image::new_owned(vec![0, 0, 0, 0], 1, 1)
}
