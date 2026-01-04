/**
 * Tauri API Commands
 * 
 * These commands replace the Electron IPC handlers from ipc-handlers.js
 * They handle HTTP requests, authentication, and API communication.
 */

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;

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
            let mut state_guard = state.lock().map_err(|e| e.to_string())?;
            state_guard.auth_token = Some(token.to_string());
            state_guard.api_base_url = api_base_url;
        }
    }

    Ok(result)
}

/// Logout command
#[tauri::command]
pub async fn api_logout(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    // Clear token
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    state_guard.auth_token = None;
    
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
            let mut state_guard = state.lock().map_err(|e| e.to_string())?;
            state_guard.auth_token = Some(token.to_string());
        }
    }

    Ok(result)
}

