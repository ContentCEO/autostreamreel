use base64::Engine;
use enigo::{Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings};
use serde::{Deserialize, Serialize};
use tauri::{WebviewUrl, WebviewWindowBuilder};

// -- Computer-use Tauri commands --------------------------------------------
// These give Jarvis OS-level reach when the app runs as a desktop binary:
// take_screenshot, mouse_move, mouse_click, type_text, key_press. The web
// frontend invokes them via @tauri-apps/api/core. They're no-ops in browser.
//
// On macOS the first call requires Screen Recording + Accessibility permission;
// macOS will prompt automatically the first time.

#[derive(Serialize)]
struct ScreenshotResult {
    png_base64: String,
    width: u32,
    height: u32,
}

#[tauri::command]
fn take_screenshot() -> Result<ScreenshotResult, String> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    let primary = monitors.into_iter().next().ok_or("no monitor found")?;
    let img = primary.capture_image().map_err(|e| e.to_string())?;
    let width  = img.width();
    let height = img.height();
    let mut bytes: Vec<u8> = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut bytes), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(ScreenshotResult { png_base64: b64, width, height })
}

#[derive(Deserialize)]
struct MouseMoveArgs { x: i32, y: i32 }

#[tauri::command]
fn mouse_move(args: MouseMoveArgs) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo.move_mouse(args.x, args.y, Coordinate::Abs).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Deserialize)]
struct MouseClickArgs {
    #[serde(default = "default_button")] button: String, // "left" | "right" | "middle"
    #[serde(default)] double: bool,
}
fn default_button() -> String { "left".into() }

#[tauri::command]
fn mouse_click(args: MouseClickArgs) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    let button = match args.button.as_str() {
        "right"  => enigo::Button::Right,
        "middle" => enigo::Button::Middle,
        _        => enigo::Button::Left,
    };
    enigo.button(button, Direction::Click).map_err(|e| e.to_string())?;
    if args.double {
        enigo.button(button, Direction::Click).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Deserialize)]
struct TypeArgs { text: String }

#[tauri::command]
fn type_text(args: TypeArgs) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo.text(&args.text).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Deserialize)]
struct KeyArgs { key: String } // "Return", "Escape", "Tab", "Space", "ArrowLeft", etc.

#[tauri::command]
fn key_press(args: KeyArgs) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    let key = match args.key.as_str() {
        "Return" | "Enter" => Key::Return,
        "Escape"           => Key::Escape,
        "Tab"              => Key::Tab,
        "Space"            => Key::Space,
        "Backspace"        => Key::Backspace,
        "Delete"           => Key::Delete,
        "ArrowLeft"        => Key::LeftArrow,
        "ArrowRight"       => Key::RightArrow,
        "ArrowUp"          => Key::UpArrow,
        "ArrowDown"        => Key::DownArrow,
        "Home"             => Key::Home,
        "End"              => Key::End,
        other if other.len() == 1 => Key::Unicode(other.chars().next().unwrap()),
        _ => return Err(format!("unsupported key '{}'", args.key)),
    };
    enigo.key(key, Direction::Click).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            take_screenshot,
            mouse_move,
            mouse_click,
            type_text,
            key_press,
        ])
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
                .user_agent("ControlCenter/1.2 (Tauri Desktop)")
                .visible(true)
                .build()?;

            if window.set_fullscreen(true).is_err() {
                let _ = window.maximize();
            }
            let _ = window.set_focus();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
