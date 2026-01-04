/**
 * Offline Support Commands
 * 
 * Provides cache and queue management for offline functionality.
 * Uses SQLite for persistence.
 * 
 * Rules:
 * - Cache is disposable (no business logic)
 * - Queue is FIFO (first in, first out)
 * - No retries (stop on first failure)
 * - No conflict resolution
 */

use serde::{Deserialize, Serialize};
use rusqlite::{Connection, Result as SqliteResult};
use tauri::Manager;
use chrono::{DateTime, Utc};

/// Cache entry structure
#[derive(Debug, Serialize, Deserialize)]
pub struct CacheEntry {
    pub key: String,
    pub method: String,
    pub path: String,
    pub response: serde_json::Value,
    pub timestamp: String,
    pub expires_at: Option<String>,
}

/// Queued request structure
#[derive(Debug, Serialize, Deserialize)]
pub struct QueuedRequest {
    pub id: String,
    pub method: String,
    pub path: String,
    pub payload: serde_json::Value,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub created_at: String,
}

/// Get database connection for offline storage
fn get_offline_db(app: &tauri::AppHandle) -> SqliteResult<Connection> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| rusqlite::Error::InvalidPath(std::path::PathBuf::new()))?;
    
    std::fs::create_dir_all(&app_data)
        .map_err(|_| rusqlite::Error::InvalidPath(app_data.clone()))?;
    
    let db_path = app_data.join("offline-cache.db");
    let conn = Connection::open(&db_path)?;
    
    // Enable WAL mode
    conn.execute("PRAGMA journal_mode = WAL", [])?;
    
    // Create cache table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache_entries (
            key TEXT PRIMARY KEY,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            expires_at TEXT
        )",
        [],
    )?;
    
    // Create queue table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS offline_queue (
            id TEXT PRIMARY KEY,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            payload TEXT NOT NULL,
            headers TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;
    
    // Create indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_path ON cache_entries(path)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_queue_created ON offline_queue(created_at)", [])?;
    
    Ok(conn)
}

/// Get cache entry
#[tauri::command]
pub fn offline_get_cache_entry(
    key: String,
    app: tauri::AppHandle,
) -> Result<Option<CacheEntry>, String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT key, method, path, response, timestamp, expires_at FROM cache_entries WHERE key = ?")
        .map_err(|e| e.to_string())?;
    
    let entry_result = stmt
        .query_row([&key], |row| {
            let response_str: String = row.get(3)?;
            let response: serde_json::Value = serde_json::from_str(&response_str)
                .map_err(|_| rusqlite::Error::InvalidColumnType(3, "response".to_string(), rusqlite::types::Type::Text))?;
            
            Ok(CacheEntry {
                key: row.get(0)?,
                method: row.get(1)?,
                path: row.get(2)?,
                response,
                timestamp: row.get(4)?,
                expires_at: row.get(5)?,
            })
        });
    
    let entry = match entry_result {
        Ok(entry) => Some(entry),
        Err(rusqlite::Error::QueryReturnedNoRows) => None,
        Err(e) => return Err(e.to_string()),
    };
    
    // Check if expired
    if let Some(ref entry) = entry {
        if let Some(ref expires_at) = entry.expires_at {
            if let Ok(expires) = DateTime::parse_from_rfc3339(expires_at) {
                if expires < Utc::now() {
                    // Delete expired entry
                    let _ = conn.execute("DELETE FROM cache_entries WHERE key = ?", [&key]);
                    return Ok(None);
                }
            }
        }
    }
    
    Ok(entry)
}

/// Set cache entry
#[tauri::command]
pub fn offline_set_cache_entry(
    entry: CacheEntry,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    let response_str = serde_json::to_string(&entry.response)
        .map_err(|e| format!("Failed to serialize response: {}", e))?;
    
    conn.execute(
        "INSERT OR REPLACE INTO cache_entries (key, method, path, response, timestamp, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            entry.key,
            entry.method,
            entry.path,
            response_str,
            entry.timestamp,
            entry.expires_at
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Clear cache entry
#[tauri::command]
pub fn offline_clear_cache_entry(
    key: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM cache_entries WHERE key = ?", [&key])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Clear all cache
#[tauri::command]
pub fn offline_clear_all_cache(
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM cache_entries", [])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Enqueue request
#[tauri::command]
pub fn offline_enqueue_request(
    request: QueuedRequest,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    let payload_str = serde_json::to_string(&request.payload)
        .map_err(|e| format!("Failed to serialize payload: {}", e))?;
    
    let headers_str = request.headers.as_ref()
        .and_then(|h| serde_json::to_string(h).ok());
    
    conn.execute(
        "INSERT INTO offline_queue (id, method, path, payload, headers, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            request.id,
            request.method,
            request.path,
            payload_str,
            headers_str,
            request.created_at
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Get all queued requests
#[tauri::command]
pub fn offline_get_queued_requests(
    app: tauri::AppHandle,
) -> Result<Vec<QueuedRequest>, String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, method, path, payload, headers, created_at FROM offline_queue ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            let payload_str: String = row.get(3)?;
            let payload: serde_json::Value = serde_json::from_str(&payload_str)
                .map_err(|_| rusqlite::Error::InvalidColumnType(3, "payload".to_string(), rusqlite::types::Type::Text))?;
            
            let headers_str: Option<String> = row.get(4)?;
            let headers = headers_str
                .and_then(|s| serde_json::from_str::<std::collections::HashMap<String, String>>(&s).ok());
            
            Ok(QueuedRequest {
                id: row.get(0)?,
                method: row.get(1)?,
                path: row.get(2)?,
                payload,
                headers,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut requests = Vec::new();
    for row in rows {
        requests.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(requests)
}

/// Dequeue request
#[tauri::command]
pub fn offline_dequeue_request(
    id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM offline_queue WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Clear all queued requests
#[tauri::command]
pub fn offline_clear_queue(
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = get_offline_db(&app).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM offline_queue", [])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

