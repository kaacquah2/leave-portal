/**
 * Database Module
 * 
 * Handles SQLite database initialization, migrations, and connection management.
 * Migrated from electron/database-encrypted.js and electron/sqlite-adapter.js
 */

use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// Database connection wrapper
pub struct Database {
    #[allow(dead_code)]
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize database connection
    pub fn new(app: &tauri::AppHandle) -> Result<Self> {
        // In Tauri v2, we use AppHandle with Manager trait
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|_| rusqlite::Error::InvalidPath(PathBuf::new()))?;
        
        std::fs::create_dir_all(&app_data)
            .map_err(|_| rusqlite::Error::InvalidPath(app_data.clone()))?;
        
        let db_path = app_data.join("hr-portal-encrypted.db");
        let conn = Connection::open(&db_path)?;
        
        // Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode = WAL", [])?;
        
        // Enable foreign key constraints
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        
        // Set secure defaults
        conn.execute("PRAGMA secure_delete = ON", [])?;
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        
        // Create migrations table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )",
            [],
        )?;
        
        // Run migrations
        run_migrations(&conn)?;
        
        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
    
    /// Get database connection (thread-safe)
    #[allow(dead_code)]
    pub fn get_connection(&self) -> &Mutex<Connection> {
        &self.conn
    }
    
    /// Execute a query and return results as JSON
    #[allow(dead_code)]
    pub fn query_json(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(sql)?;
        
        let rows = stmt.query_map(params, |row| {
            let mut map = serde_json::Map::new();
            let column_count = row.as_ref().column_count();
            
            for i in 0..column_count {
                let column_name = row.as_ref().column_name(i)?;
                let value: rusqlite::types::Value = row.get(i)?;
                
                let json_value = match value {
                    rusqlite::types::Value::Null => serde_json::Value::Null,
                    rusqlite::types::Value::Integer(i) => serde_json::Value::Number(i.into()),
                    rusqlite::types::Value::Real(f) => {
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(f).unwrap_or(0.into())
                        )
                    },
                    rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                    rusqlite::types::Value::Blob(b) => {
                        // Convert blob to base64 string
                        use base64::{Engine, engine::general_purpose};
                        serde_json::Value::String(general_purpose::STANDARD.encode(b))
                    },
                };
                
                map.insert(column_name.to_string(), json_value);
            }
            
            Ok(serde_json::Value::Object(map))
        })?;
        
        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        
        Ok(results)
    }
}

/// Run database migrations
fn run_migrations(conn: &Connection) -> Result<()> {
    // Check if migrations table exists and get applied migrations
    let applied: Vec<i32> = conn
        .prepare("SELECT version FROM schema_migrations ORDER BY version")?
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>>>()?;
    
    // Migration 1: Initial schema (sync queue and metadata)
    if !applied.contains(&1) {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
                record_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 0,
                retries INTEGER NOT NULL DEFAULT 0,
                max_retries INTEGER NOT NULL DEFAULT 5,
                last_error TEXT,
                last_attempt_at TEXT,
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )",
            [],
        )?;
        
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (1, '001_initial_schema')",
            [],
        )?;
    }
    
    // Migration 2: Complete offline schema
    if !applied.contains(&2) {
        // This is a large migration - we'll include the key tables
        // For full migration, see electron/migrations/002_complete_offline_schema.sql
        
        // Employees table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                staff_id TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                department TEXT NOT NULL,
                position TEXT NOT NULL,
                grade TEXT NOT NULL,
                level TEXT NOT NULL,
                rank TEXT,
                step TEXT,
                directorate TEXT,
                division TEXT,
                unit TEXT,
                duty_station TEXT,
                photo_url TEXT,
                active INTEGER NOT NULL DEFAULT 1,
                employment_status TEXT NOT NULL DEFAULT 'active',
                termination_date TEXT,
                termination_reason TEXT,
                join_date TEXT NOT NULL,
                confirmation_date TEXT,
                manager_id TEXT,
                immediate_supervisor_id TEXT,
                sync_status TEXT NOT NULL DEFAULT 'synced',
                server_updated_at TEXT,
                local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (manager_id) REFERENCES employees(staff_id) ON DELETE SET NULL,
                FOREIGN KEY (immediate_supervisor_id) REFERENCES employees(staff_id) ON DELETE SET NULL
            )",
            [],
        )?;
        
        // Leave requests table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS leave_requests (
                id TEXT PRIMARY KEY,
                staff_id TEXT NOT NULL,
                staff_name TEXT NOT NULL,
                leave_type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                days INTEGER NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                approved_by TEXT,
                approval_date TEXT,
                template_id TEXT,
                approval_levels TEXT,
                officer_taking_over TEXT,
                handover_notes TEXT,
                declaration_accepted INTEGER NOT NULL DEFAULT 0,
                payroll_impact_flag INTEGER NOT NULL DEFAULT 0,
                locked INTEGER NOT NULL DEFAULT 0,
                sync_status TEXT NOT NULL DEFAULT 'pending',
                server_id TEXT,
                server_updated_at TEXT,
                local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (staff_id) REFERENCES employees(staff_id) ON DELETE CASCADE
            )",
            [],
        )?;
        
        // Leave balances table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS leave_balances (
                id TEXT PRIMARY KEY,
                staff_id TEXT UNIQUE NOT NULL,
                annual REAL NOT NULL DEFAULT 0,
                sick REAL NOT NULL DEFAULT 0,
                unpaid REAL NOT NULL DEFAULT 0,
                special_service REAL NOT NULL DEFAULT 0,
                training REAL NOT NULL DEFAULT 0,
                study REAL NOT NULL DEFAULT 0,
                maternity REAL NOT NULL DEFAULT 0,
                paternity REAL NOT NULL DEFAULT 0,
                compassionate REAL NOT NULL DEFAULT 0,
                last_accrual_date TEXT,
                accrual_period TEXT,
                annual_carry_forward REAL NOT NULL DEFAULT 0,
                sick_carry_forward REAL NOT NULL DEFAULT 0,
                special_service_carry_forward REAL NOT NULL DEFAULT 0,
                training_carry_forward REAL NOT NULL DEFAULT 0,
                study_carry_forward REAL NOT NULL DEFAULT 0,
                annual_expires_at TEXT,
                sick_expires_at TEXT,
                special_service_expires_at TEXT,
                training_expires_at TEXT,
                study_expires_at TEXT,
                sync_status TEXT NOT NULL DEFAULT 'synced',
                server_updated_at TEXT,
                local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (staff_id) REFERENCES employees(staff_id) ON DELETE CASCADE
            )",
            [],
        )?;
        
        // Audit logs table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                user TEXT NOT NULL,
                user_role TEXT,
                staff_id TEXT,
                leave_request_id TEXT,
                details TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                sync_status TEXT NOT NULL DEFAULT 'pending',
                server_id TEXT,
                server_updated_at TEXT,
                local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL
            )",
            [],
        )?;
        
        // Create indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_employees_staff_id ON employees(staff_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_id ON leave_requests(staff_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_leave_balances_staff_id ON leave_balances(staff_id)", [])?;
        
        // Insert default sync metadata
        conn.execute(
            "INSERT OR IGNORE INTO sync_metadata (key, value) VALUES
                ('last_sync_at', '1970-01-01T00:00:00Z'),
                ('sync_schema_version', '2'),
                ('last_full_sync_at', '1970-01-01T00:00:00Z'),
                ('sync_enabled', 'true'),
                ('conflict_resolution_strategy', 'server_wins')",
            [],
        )?;
        
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (2, '002_complete_offline_schema')",
            [],
        )?;
    }
    
    Ok(())
}

