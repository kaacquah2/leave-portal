/**
 * File System Commands
 * 
 * Handles file operations for document storage, exports, etc.
 * Migrated from Electron file system operations.
 */

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Save a document/file
#[tauri::command]
pub async fn save_document(
    filename: String,
    contents: Vec<u8>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let app_data = app.path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;
    
    // Create documents subdirectory
    let documents_dir = app_data.join("documents");
    fs::create_dir_all(&documents_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;
    
    let file_path = documents_dir.join(&filename);
    fs::write(&file_path, contents)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

/// Read a document/file
#[tauri::command]
pub async fn read_document(
    file_path: String,
) -> Result<Vec<u8>, String> {
    fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Get documents directory path
#[tauri::command]
pub async fn get_documents_path(
    app: tauri::AppHandle,
) -> Result<String, String> {
    let app_data = app.path()
        .app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;
    
    let documents_dir = app_data.join("documents");
    fs::create_dir_all(&documents_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;
    
    Ok(documents_dir.to_string_lossy().to_string())
}

/// Save file to user's Documents folder
#[tauri::command]
pub async fn save_to_documents(
    filename: String,
    contents: Vec<u8>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let documents = app.path()
        .document_dir()
        .map_err(|e| format!("Could not get documents directory: {}", e))?;
    
    // Create app-specific subdirectory
    let app_docs = documents.join("HR Leave Portal");
    fs::create_dir_all(&app_docs)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let file_path = app_docs.join(&filename);
    fs::write(&file_path, contents)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

/// Check if file exists
#[tauri::command]
pub async fn file_exists(
    file_path: String,
) -> Result<bool, String> {
    Ok(fs::metadata(&file_path).is_ok())
}

/// Delete a file
#[tauri::command]
pub async fn delete_file(
    file_path: String,
) -> Result<(), String> {
    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete file: {}", e))
}

/// List files in a directory
#[tauri::command]
pub async fn list_files(
    directory: String,
) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(&directory);
    let entries = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(path_str) = entry.path().to_str() {
                files.push(path_str.to_string());
            }
        }
    }
    
    Ok(files)
}

