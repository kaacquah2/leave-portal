/**
 * Tauri API Commands
 * 
 * These commands replace the Electron IPC handlers from ipc-handlers.js
 * They handle HTTP requests, authentication, and API communication.
 */

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use base64::{Engine as _, engine::general_purpose};
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use sha2::{Sha256, Digest};
use pbkdf2::pbkdf2_hmac;

/// API request options
#[derive(Debug, Deserialize, Default)]
pub struct ApiRequestOptions {
    pub method: Option<String>,
    pub body: Option<serde_json::Value>,
    pub headers: Option<HashMap<String, String>>,
    pub timeout: Option<u64>,
}

/// API response structure
#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub ok: bool,
    pub status: u16,
    pub status_text: Option<String>,
    pub data: serde_json::Value,
    pub error: Option<String>,
}

/// Application state for storing auth token and API base URL
#[derive(Default, Clone)]
pub struct AppState {
    pub api_base_url: String,
    pub auth_token: Option<String>,
}

// ============================================================================
// Token Storage Helpers (Persistent File-Based Storage)
// ============================================================================

const AUTH_TOKEN_FILE: &str = "auth_token.enc";
const APP_IDENTIFIER: &str = "com.mofa.hr-leave-portal";
const KEY_DERIVATION_ITERATIONS: u32 = 100000; // PBKDF2 iterations

/// Get the path to the auth token file
fn get_auth_token_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Ensure app data directory exists
    fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    Ok(app_data.join(AUTH_TOKEN_FILE))
}

/// Derive encryption key from device-specific information
/// Uses app identifier + hostname to create a device-specific key
fn derive_encryption_key(app: &tauri::AppHandle) -> Result<[u8; 32], String> {
    // Get device identifier (hostname or machine ID)
    let device_id = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "default-device".to_string());
    
    // Create salt from app identifier + device ID
    let salt = format!("{}-{}", APP_IDENTIFIER, device_id);
    
    // Derive 256-bit key using PBKDF2
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(
        APP_IDENTIFIER.as_bytes(),
        salt.as_bytes(),
        KEY_DERIVATION_ITERATIONS,
        &mut key,
    );
    
    Ok(key)
}

/// Encrypt token using AES-256-GCM
fn encrypt_token(app: &tauri::AppHandle, token: &str) -> Result<String, String> {
    let key = derive_encryption_key(app)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    
    // Generate random nonce
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    
    // Encrypt token
    let ciphertext = cipher
        .encrypt(&nonce, token.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    
    // Combine nonce + ciphertext and encode as base64
    let mut encrypted_data = nonce.to_vec();
    encrypted_data.extend_from_slice(&ciphertext);
    
    Ok(general_purpose::STANDARD.encode(&encrypted_data))
}

/// Decrypt token using AES-256-GCM
fn decrypt_token(app: &tauri::AppHandle, encrypted: &str) -> Result<String, String> {
    let key = derive_encryption_key(app)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    
    // Decode from base64
    let encrypted_data = general_purpose::STANDARD
        .decode(encrypted.trim())
        .map_err(|e| format!("Failed to decode encrypted token: {}", e))?;
    
    // Extract nonce (first 12 bytes) and ciphertext (rest)
    if encrypted_data.len() < 12 {
        return Err("Invalid encrypted data format".to_string());
    }
    
    let nonce = Nonce::from_slice(&encrypted_data[..12]);
    let ciphertext = &encrypted_data[12..];
    
    // Decrypt
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("Invalid decrypted token: {}", e))
}

/// Store authentication token persistently (AES-256-GCM encrypted)
pub fn store_auth_token(app: &tauri::AppHandle, token: &str) -> Result<(), String> {
    let path = get_auth_token_path(app)?;
    
    // Encrypt token using AES-256-GCM
    let encrypted = encrypt_token(app, token)?;
    
    // Write to file
    fs::write(&path, encrypted)
        .map_err(|e| format!("Failed to write auth token: {}", e))?;
    
    // Set restrictive file permissions on Unix-like systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .map_err(|e| format!("Failed to set file permissions: {}", e))?;
    }
    
    eprintln!("[Tauri] Auth token stored securely (AES-256-GCM) at: {:?}", path);
    Ok(())
}

/// Retrieve authentication token from persistent storage
/// Supports both encrypted (new) and base64 (legacy) formats for migration
pub fn load_auth_token(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let path = get_auth_token_path(app)?;
    
    // Check if file exists
    if !path.exists() {
        return Ok(None);
    }
    
    // Read encrypted token
    let encrypted = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read auth token: {}", e))?;
    
    // Try to decrypt (new format)
    match decrypt_token(app, &encrypted) {
        Ok(token) => {
            // Successfully decrypted - new format
            Ok(Some(token))
        }
        Err(_) => {
            // Decryption failed - try legacy base64 format
            match general_purpose::STANDARD.decode(encrypted.trim()) {
                Ok(decoded) => {
                    // Legacy format detected - migrate to encrypted format
                    if let Ok(token) = String::from_utf8(decoded) {
                        eprintln!("[Tauri] Migrating token from base64 to AES-256-GCM encryption");
                        // Re-encrypt and save in new format
                        if let Err(e) = store_auth_token(app, &token) {
                            eprintln!("[Tauri] Warning: Failed to migrate token to encrypted format: {}", e);
                        }
                        Ok(Some(token))
                    } else {
                        Err("Invalid token encoding".to_string())
                    }
                }
                Err(_) => {
                    // Neither format worked
                    Err("Failed to decrypt or decode auth token".to_string())
                }
            }
        }
    }
}

/// Clear authentication token from persistent storage
pub fn clear_auth_token(app: &tauri::AppHandle) -> Result<(), String> {
    let path = get_auth_token_path(app)?;
    
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to remove auth token: {}", e))?;
        eprintln!("[Tauri] Auth token cleared from persistent storage");
    }
    
    Ok(())
}

/// Get the API base URL
#[tauri::command]
pub fn get_api_url(state: tauri::State<'_, Mutex<AppState>>) -> Result<Option<String>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(if state.api_base_url.is_empty() {
        None
    } else {
        Some(state.api_base_url.clone())
    })
}

/// Make an API request
#[tauri::command]
pub async fn api_request(
    path: String,
    options: Option<ApiRequestOptions>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<ApiResponse, String> {
    // Validate path security
    if path.contains("..") || path.contains("//") {
        return Ok(ApiResponse {
            ok: false,
            status: 400,
            status_text: Some("Bad Request".to_string()),
            data: serde_json::json!(null),
            error: Some("Invalid path: contains unsafe characters".to_string()),
        });
    }

    // Extract values from state and drop guard before await
    let (api_base_url, auth_token) = {
        let state_guard = state.lock().map_err(|e| e.to_string())?;
        (state_guard.api_base_url.clone(), state_guard.auth_token.clone())
    };

    let url = if path.starts_with("http") {
        path
    } else {
        format!("{}{}", api_base_url, path)
    };

    let options = options.unwrap_or_default();
    let method = options.method.as_deref().unwrap_or("GET");

    // Create HTTP client
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(options.timeout.unwrap_or(15)))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Build request
    let mut request = match method {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        _ => {
            return Ok(ApiResponse {
                ok: false,
                status: 400,
                status_text: Some("Bad Request".to_string()),
                data: serde_json::json!(null),
                error: Some(format!("Unsupported HTTP method: {}", method)),
            });
        }
    };

    // Add headers
    request = request.header("Content-Type", "application/json");
    
    if let Some(ref token) = auth_token {
        request = request.header("Authorization", format!("Bearer {}", token));
    }

    if let Some(ref headers) = options.headers {
        for (key, value) in headers {
            request = request.header(key, value);
        }
    }

    // Add body if present
    if let Some(body) = options.body {
        request = request.json(&body);
    }

    // Execute request
    match request.send().await {
        Ok(response) => {
            let status = response.status();
            let status_text = response.status().canonical_reason().map(|s| s.to_string());
            
            match response.json::<serde_json::Value>().await {
                Ok(data) => Ok(ApiResponse {
                    ok: status.is_success(),
                    status: status.as_u16(),
                    status_text: status_text.clone(),
                    data,
                    error: if status.is_success() { None } else { 
                        Some(format!("HTTP {}: {}", status.as_u16(), status_text.as_deref().unwrap_or("Unknown")))
                    },
                }),
                Err(e) => Ok(ApiResponse {
                    ok: false,
                    status: status.as_u16(),
                    status_text,
                    data: serde_json::json!(null),
                    error: Some(format!("Failed to parse response: {}", e)),
                }),
            }
        }
        Err(e) => Ok(ApiResponse {
            ok: false,
            status: 0,
            status_text: None,
            data: serde_json::json!(null),
            error: Some(format!("Request failed: {}", e)),
        }),
    }
}

/// Login command
#[tauri::command]
pub async fn api_login(
    email: String,
    password: String,
    api_base_url: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<ApiResponse, String> {
    // Validate email
    if email.is_empty() || email.len() > 255 {
        return Ok(ApiResponse {
            ok: false,
            status: 400,
            status_text: Some("Bad Request".to_string()),
            data: serde_json::json!(null),
            error: Some("Invalid email: must be a non-empty string (max 255 characters)".to_string()),
        });
    }

    let email_regex = regex::Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
        .map_err(|e| format!("Regex error: {}", e))?;
    if !email_regex.is_match(&email) {
        return Ok(ApiResponse {
            ok: false,
            status: 400,
            status_text: Some("Bad Request".to_string()),
            data: serde_json::json!(null),
            error: Some("Invalid email format".to_string()),
        });
    }

    // Validate password
    if password.is_empty() || password.len() > 1000 {
        return Ok(ApiResponse {
            ok: false,
            status: 400,
            status_text: Some("Bad Request".to_string()),
            data: serde_json::json!(null),
            error: Some("Invalid password: must be a non-empty string (max 1000 characters)".to_string()),
        });
    }

    // Make login request
    let options = ApiRequestOptions {
        method: Some("POST".to_string()),
        body: Some(serde_json::json!({
            "email": email,
            "password": password
        })),
        headers: Some({
            let mut h = HashMap::new();
            h.insert("x-request-token".to_string(), "true".to_string());
            h
        }),
        timeout: Some(15),
    };

    let result = api_request("/api/auth/login".to_string(), Some(options), state.clone()).await?;

    // Store token if login successful
    if result.ok {
        if let Some(token) = result.data.get("token").and_then(|t| t.as_str()) {
            // Store in memory (for immediate use)
            let mut state_guard = state.lock().map_err(|e| e.to_string())?;
            state_guard.auth_token = Some(token.to_string());
            state_guard.api_base_url = api_base_url.clone();
            
            // Store persistently (for app restarts)
            if let Err(e) = store_auth_token(&app, token) {
                eprintln!("[Tauri] Warning: Failed to store auth token persistently: {}", e);
                // Don't fail login if persistent storage fails - token is still in memory
            }
        }
    }

    Ok(result)
}

/// Logout command
#[tauri::command]
pub async fn api_logout(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    // Clear token from memory
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    state_guard.auth_token = None;
    
    // Clear token from persistent storage
    if let Err(e) = clear_auth_token(&app) {
        eprintln!("[Tauri] Warning: Failed to clear auth token from storage: {}", e);
        // Don't fail logout if storage clear fails
    }
    
    Ok(serde_json::json!({ "success": true }))
}

/// Get current user
#[tauri::command]
pub async fn api_get_me(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<ApiResponse, String> {
    api_request("/api/auth/me".to_string(), None, state).await
}

/// Check if user has token
#[tauri::command]
pub fn api_has_token(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "hasToken": state_guard.auth_token.is_some()
    }))
}

/// Refresh authentication token
#[tauri::command]
pub async fn api_refresh(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<ApiResponse, String> {
    let options = ApiRequestOptions {
        method: Some("POST".to_string()),
        body: None,
        headers: None,
        timeout: Some(15),
    };

    let result = api_request("/api/auth/refresh".to_string(), Some(options), state.clone()).await?;

    // Update token if refresh successful
    if result.ok {
        if let Some(token) = result.data.get("token").and_then(|t| t.as_str()) {
            // Update in memory
            let mut state_guard = state.lock().map_err(|e| e.to_string())?;
            state_guard.auth_token = Some(token.to_string());
            
            // Update persistent storage
            if let Err(e) = store_auth_token(&app, token) {
                eprintln!("[Tauri] Warning: Failed to update auth token in storage: {}", e);
                // Don't fail refresh if storage update fails
            }
        }
    }

    Ok(result)
}

