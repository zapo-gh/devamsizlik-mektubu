use std::sync::Mutex;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct BackendProcess(Mutex<Option<CommandChild>>);

fn find_sidecar_script() -> Option<PathBuf> {
    let mut candidates = vec![
        PathBuf::from("backend/dist/tauri-sidecar.js"),
        PathBuf::from("../backend/dist/tauri-sidecar.js"),
    ];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("backend/dist/tauri-sidecar.js"));
            candidates.push(exe_dir.join("../backend/dist/tauri-sidecar.js"));
            candidates.push(exe_dir.join("_up_/backend/dist/tauri-sidecar.js"));
        }
    }

    for path in candidates {
        if path.exists() {
            return Some(path);
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let script_path = find_sidecar_script().unwrap_or_else(|| {
                app.path().resource_dir().expect("failed to get resource dir").join("backend/dist/tauri-sidecar.js")
            });

            println!("🚀 [Tauri] Node.js backend başlatılıyor: {:?}", script_path);

            let sidecar_cmd = app.shell().sidecar("node")
                .expect("failed to create node sidecar command")
                .arg(script_path.to_string_lossy().as_ref());

            match sidecar_cmd.spawn() {
                Ok((mut rx, child)) => {
                    println!("✅ [Tauri] Backend alt süreci başlatıldı (PID: {})", child.pid());
                    
                    tauri::async_runtime::spawn(async move {
                        while let Some(event) = rx.recv().await {
                            match event {
                                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                                    println!("[Backend] {}", String::from_utf8_lossy(&line).trim_end());
                                }
                                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                                    eprintln!("[Backend ERR] {}", String::from_utf8_lossy(&line).trim_end());
                                }
                                _ => {}
                            }
                        }
                    });

                    app.manage(BackendProcess(Mutex::new(Some(child))));
                }
                Err(err) => {
                    eprintln!("❌ [Tauri] Backend başlatılamadı: {}", err);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Tauri uygulaması oluşturulurken hata oluştu")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                println!("🛑 [Tauri] Uygulama kapanıyor, Node.js backend süreci sonlandırılıyor...");
                if let Some(state) = app_handle.try_state::<BackendProcess>() {
                    if let Ok(mut lock) = state.0.lock() {
                        if let Some(mut child) = lock.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
