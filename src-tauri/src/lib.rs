use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // The URL the shell loads. Defaults to the production deployment,
            // overridable at runtime via CONTROL_CENTER_URL env var (also baked
            // in at compile time if set when the binary is built).
            let url: String = std::env::var("CONTROL_CENTER_URL")
                .ok()
                .or_else(|| option_env!("CONTROL_CENTER_URL").map(|s| s.to_string()))
                .unwrap_or_else(|| "http://localhost:3000".to_string());

            let parsed = url::Url::parse(&url)
                .map_err(|e| format!("Bad CONTROL_CENTER_URL '{url}': {e}"))?;

            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("Control Center")
                .inner_size(1600.0, 1000.0)
                .min_inner_size(1280.0, 800.0)
                .decorations(false)
                .user_agent("ControlCenter/0.1.0 (Tauri Desktop)")
                .visible(true)
                .build()?;

            // Try native fullscreen; if the platform refuses, fall back to
            // maximized borderless. Either way the desktop is taken over.
            if window.set_fullscreen(true).is_err() {
                let _ = window.maximize();
            }
            let _ = window.set_focus();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
