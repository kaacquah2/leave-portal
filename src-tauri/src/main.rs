// Temporarily enable console in release mode for debugging
// TODO: Remove this after fixing the crash issue
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;

use commands::api::AppState;
use database::Database;
use std::sync::Mutex;
use tauri::Manager;

/// Get the application version
#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get the platform (os, arch)
#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

/// Send a message (example command)
#[tauri::command]
fn send_message(message: String) -> Result<String, String> {
    Ok(format!("Received: {}", message))
}

fn main() {
    // Initialize app state with API base URL from environment
    // Option A: Tauri = UI only, Backend = remote server
    // API base URL is set from NEXT_PUBLIC_API_URL environment variable
    let api_base_url = std::env::var("NEXT_PUBLIC_API_URL")
        .or_else(|_| std::env::var("TAURI_API_URL"))
        .unwrap_or_else(|_| "https://hr-leave-portal.vercel.app".to_string());
    
    let app_state = AppState {
        api_base_url: api_base_url.clone(),
        auth_token: None,
    };
    
    println!("[Tauri] Initialized with API base URL: {}", api_base_url);
    println!("[Tauri] Architecture: Option A - UI only, remote backend");
    
    let context = tauri::generate_context!();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(app_state))
        .setup(|app| {
            // Initialize database (kept for backward compatibility, but not used in Option A)
            // In Option A, all data operations go to remote API, not local database
            // Make database initialization non-fatal - log error but don't crash
            match Database::new(app.handle()) {
                Ok(database) => {
                    eprintln!("[Tauri] Database initialized successfully");
                    app.manage(database);
                }
                Err(e) => {
                    eprintln!("[Tauri] Warning: Database initialization failed: {:?}", e);
                    eprintln!("[Tauri] App will continue without local database (Option A uses remote API)");
                    // In Option A, database is optional, so we continue without it
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Basic commands
            get_version,
            get_platform,
            send_message,
            // API commands
            commands::api::get_api_url,
            commands::api::api_request,
            commands::api::api_login,
            commands::api::api_logout,
            commands::api::api_get_me,
            commands::api::api_has_token,
            commands::api::api_refresh,
            // Repository commands
            commands::repository::repo_sync_status,
            commands::repository::repo_sync_trigger,
            commands::repository::repo_employees_find_all,
            commands::repository::repo_employees_find_by_staff_id,
            commands::repository::repo_leave_requests_find_all,
            commands::repository::repo_leave_requests_create,
            commands::repository::repo_leave_balances_find_by_staff_id,
            commands::repository::repo_get_background_sync_status,
            commands::repository::repo_get_pending_conflicts,
            // File system commands
            commands::filesystem::save_document,
            commands::filesystem::read_document,
            commands::filesystem::get_documents_path,
            commands::filesystem::save_to_documents,
            commands::filesystem::file_exists,
            commands::filesystem::delete_file,
            commands::filesystem::list_files,
            // Offline commands
            commands::offline::offline_get_cache_entry,
            commands::offline::offline_set_cache_entry,
            commands::offline::offline_clear_cache_entry,
            commands::offline::offline_clear_all_cache,
            commands::offline::offline_enqueue_request,
            commands::offline::offline_get_queued_requests,
            commands::offline::offline_dequeue_request,
            commands::offline::offline_clear_queue,
        ])
        .run(context)
        .expect("error while running tauri application");
}

