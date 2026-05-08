use tauri::{AppHandle, Manager};

pub fn configure(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.maximize();
        window.set_title("Lumoza Studio")?;
    }

    Ok(())
}
