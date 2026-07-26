use std::process::{Child, Command};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

struct BackendProcess(Mutex<Option<Child>>);

fn find_sidecar_script() -> Option<PathBuf> {
    let mut candidates = vec![
        PathBuf::from("backend/dist/tauri-sidecar.js"),
        PathBuf::from("../backend/dist/tauri-sidecar.js"),
    ];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("backend/dist/tauri-sidecar.js"));
            candidates.push(exe_dir.join("../backend/dist/tauri-sidecar.js"));
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
            if let Some(script_path) = find_sidecar_script() {
                println!("🚀 [Tauri] Node.js backend başlatılıyor: {:?}", script_path);

                let mut cmd = Command::new("node");
                cmd.arg(&script_path);

                #[cfg(target_os = "windows")]
                cmd.creation_flags(CREATE_NO_WINDOW);

                match cmd.spawn() {
                    Ok(child) => {
                        println!("✅ [Tauri] Backend alt süreci başlatıldı (PID: {})", child.id());
                        app.manage(BackendProcess(Mutex::new(Some(child))));
                    }
                    Err(err) => {
                        eprintln!("❌ [Tauri] Backend başlatılamadı: {}", err);
                    }
                }
            } else {
                eprintln!("⚠️ [Tauri] tauri-sidecar.js dosyası bulunamadı. Lütfen 'npm run build:backend' komutunu çalıştırın.");
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
