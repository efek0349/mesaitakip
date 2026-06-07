use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;

use tauri::{Emitter};

#[tauri::command]
fn start_oauth_listener(app: tauri::AppHandle) -> Result<(), String> {
    thread::spawn(move || {
        let listener = TcpListener::bind("127.0.0.1:7890")
            .expect("Port bind hatası");

        println!("OAuth listener started on 127.0.0.1:7890");

        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0u8; 8192];

                let n = stream.read(&mut buffer).unwrap_or(0);
                let request = String::from_utf8_lossy(&buffer[..n]).to_string();

                let html = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <h2>✓ Bağlantı kuruldu</h2>
  <script>setTimeout(() => window.close(), 1500);</script>
</body>
</html>"#;

                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\n\r\n{}",
                    html.len(),
                    html
                );

                let _ = stream.write_all(response.as_bytes());

                // code parse
                let code = request
                    .lines()
                    .next()
                    .and_then(|line| line.split_whitespace().nth(1))
                    .and_then(|path| path.split('?').nth(1))
                    .and_then(|q| q.split('&')
                        .find(|p| p.starts_with("code=")))
                    .map(|p| p[5..].to_string());

                if let Some(code) = code {
                    println!("OAuth CODE: {}", code);

                    let _ = app.emit("oauth-code", code);
                }
            }
        }
    });

    Ok(())
}
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_oauth_listener
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}