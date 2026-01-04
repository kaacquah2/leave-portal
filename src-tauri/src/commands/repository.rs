/**
 * Tauri Repository Commands
 * 
 * Option A Architecture: UI only, remote backend
 * These commands route to the remote API instead of local database.
 * All data operations go through the remote server.
 * 
 * NOTE: In Option A, repository commands are kept for backward compatibility
 * but they route to the remote API. The frontend should prefer using
 * api_request directly for better control.
 */

use crate::commands::api::{ApiRequestOptions, AppState, ApiResponse};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

/// Repository response structure
#[derive(Debug, Serialize)]
pub struct RepositoryResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Helper function to make HTTP request (used by repository commands in Option A)
async fn make_api_request(
    path: String,
    options: ApiRequestOptions,
    state: &Mutex<AppState>,
) -> Result<ApiResponse, String> {
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

/// Get sync status
/// Option A: Routes to remote API instead of local database
#[tauri::command]
pub async fn repo_sync_status(
    _api_base_url: String,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(10),
    };
    
    match make_api_request("/api/sync/status".to_string(), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Trigger manual sync
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_sync_trigger(
    _api_base_url: String,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("POST".to_string()),
        body: None,
        headers: None,
        timeout: Some(30),
    };
    
    match make_api_request("/api/sync/trigger".to_string(), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Employee filters
#[derive(Debug, Deserialize)]
pub struct EmployeeFilters {
    pub department: Option<String>,
    pub active: Option<bool>,
    pub manager_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// Get all employees
/// Option A: Routes to remote API instead of local database
#[tauri::command]
pub async fn repo_employees_find_all(
    filters: Option<EmployeeFilters>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let mut query_params = Vec::new();
    if let Some(ref f) = filters {
        if let Some(ref dept) = f.department {
            query_params.push(format!("department={}", dept));
        }
        if let Some(active) = f.active {
            query_params.push(format!("active={}", active));
        }
        if let Some(ref mgr_id) = f.manager_id {
            query_params.push(format!("manager_id={}", mgr_id));
        }
        if let Some(limit) = f.limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = f.offset {
            query_params.push(format!("offset={}", offset));
        }
    }
    
    let endpoint = if query_params.is_empty() {
        "/api/employees".to_string()
    } else {
        format!("/api/employees?{}", query_params.join("&"))
    };
    
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(15),
    };
    
    match make_api_request(endpoint, options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Get employee by staff ID
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_employees_find_by_staff_id(
    staff_id: String,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(15),
    };
    
    match make_api_request(format!("/api/employees/{}", staff_id), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Leave request filters
#[derive(Debug, Deserialize)]
pub struct LeaveRequestFilters {
    pub staff_id: Option<String>,
    pub status: Option<String>,
    pub leave_type: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// Get all leave requests
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_leave_requests_find_all(
    filters: Option<LeaveRequestFilters>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let mut query_params = Vec::new();
    if let Some(ref f) = filters {
        if let Some(ref staff_id) = f.staff_id {
            query_params.push(format!("staff_id={}", staff_id));
        }
        if let Some(ref status) = f.status {
            query_params.push(format!("status={}", status));
        }
        if let Some(ref leave_type) = f.leave_type {
            query_params.push(format!("leave_type={}", leave_type));
        }
        if let Some(limit) = f.limit {
            query_params.push(format!("limit={}", limit));
        }
        if let Some(offset) = f.offset {
            query_params.push(format!("offset={}", offset));
        }
    }
    
    let endpoint = if query_params.is_empty() {
        "/api/leaves".to_string()
    } else {
        format!("/api/leaves?{}", query_params.join("&"))
    };
    
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(15),
    };
    
    match make_api_request(endpoint, options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Create leave request
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_leave_requests_create(
    data: serde_json::Value,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("POST".to_string()),
        body: Some(data),
        headers: None,
        timeout: Some(30),
    };
    
    match make_api_request("/api/leaves".to_string(), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Get leave balance by staff ID
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_leave_balances_find_by_staff_id(
    staff_id: String,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(15),
    };
    
    match make_api_request(format!("/api/balances/{}", staff_id), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Get background sync status
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_get_background_sync_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(10),
    };
    
    match make_api_request("/api/sync/background-status".to_string(), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

/// Get pending conflicts
/// Option A: Routes to remote API
#[tauri::command]
pub async fn repo_get_pending_conflicts(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<RepositoryResponse, String> {
    // Option A: Route to remote API
    let options = ApiRequestOptions {
        method: Some("GET".to_string()),
        body: None,
        headers: None,
        timeout: Some(15),
    };
    
    match make_api_request("/api/sync/conflicts".to_string(), options, &state).await {
        Ok(response) => {
            if response.ok {
                Ok(RepositoryResponse {
                    success: true,
                    data: Some(response.data),
                    error: None,
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    data: None,
                    error: response.error,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            data: None,
            error: Some(e),
        }),
    }
}

