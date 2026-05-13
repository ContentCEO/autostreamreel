// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // The URL the shell loads. Defaults to the production deployment,
            // overridable at runtime via CONTROL_CENTER_URL env var. Embedded
            // default is picked up at compile time from CONTROL_CENTER_URL.
            let url: String = std::env::var("CONTROL_CENTER_URL")
                .ok()
                .or_else(|| option_env!("CONTROL_CENTER_URL").map(|s| s.to_string()))
                .unwrap_or_else(|| "http://localhost:3000".to_string());

            let parsed = url::Url::parse(&url).map_err(|e| format!("Bad CONTROL_CENTER_URL '{url}': {e}"))?;

            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("Control Center")
                .inner_size(1600.0, 1000.0)
                .min_inner_size(1280.0, 800.0)
                .fullscreen(true)
                .decorations(false)
                .user_agent("ControlCenter/0.1.0 (Tauri Desktop)")
                .build()?;

            let _ = window.set_fullscreen(true);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
