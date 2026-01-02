/**
 * File-based Logging System for Electron
 * 
 * Provides structured logging to files with rotation and log levels
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;
const LOG_DIR = path.join(app.getPath('userData'), 'logs');

let currentLogFile = null;
let logLevel = LOG_LEVELS.INFO;

/**
 * Initialize logger
 */
function initLogger() {
  try {
    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Set log level from environment
    if (process.env.NODE_ENV === 'development') {
      logLevel = LOG_LEVELS.DEBUG;
    } else {
      logLevel = LOG_LEVELS.INFO;
    }

    // Get current log file path
    const today = new Date().toISOString().split('T')[0];
    currentLogFile = path.join(LOG_DIR, `app-${today}.log`);

    // Rotate logs if needed
    rotateLogs();

    console.log('[Logger] Initialized at:', LOG_DIR);
  } catch (error) {
    console.error('[Logger] Failed to initialize:', error);
  }
}

/**
 * Rotate log files
 */
function rotateLogs() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;

    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(LOG_DIR, f),
        stats: fs.statSync(path.join(LOG_DIR, f))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Remove old log files (keep only MAX_LOG_FILES)
    if (files.length > MAX_LOG_FILES) {
      files.slice(MAX_LOG_FILES).forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log('[Logger] Removed old log file:', file.name);
        } catch (error) {
          console.error('[Logger] Error removing log file:', error);
        }
      });
    }

    // Check current log file size
    if (currentLogFile && fs.existsSync(currentLogFile)) {
      const stats = fs.statSync(currentLogFile);
      if (stats.size > MAX_LOG_SIZE) {
        // Archive current log
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivedName = `app-${timestamp}.log`;
        fs.renameSync(currentLogFile, path.join(LOG_DIR, archivedName));
        console.log('[Logger] Rotated log file:', archivedName);
      }
    }
  } catch (error) {
    console.error('[Logger] Error rotating logs:', error);
  }
}

/**
 * Write log entry to file
 */
function writeLog(level, message, data = null) {
  if (level > logLevel) return;

  try {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
    
    let logEntry = `[${timestamp}] [${levelName}] ${message}`;
    if (data) {
      logEntry += ` ${JSON.stringify(data)}`;
    }
    logEntry += '\n';

    // Write to file
    if (currentLogFile) {
      fs.appendFileSync(currentLogFile, logEntry, 'utf-8');
    }

    // Also write to console
    const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                         level === LOG_LEVELS.WARN ? 'warn' : 'log';
    console[consoleMethod](logEntry.trim());
  } catch (error) {
    console.error('[Logger] Error writing log:', error);
  }
}

/**
 * Log error
 */
function error(message, data = null) {
  writeLog(LOG_LEVELS.ERROR, message, data);
}

/**
 * Log warning
 */
function warn(message, data = null) {
  writeLog(LOG_LEVELS.WARN, message, data);
}

/**
 * Log info
 */
function info(message, data = null) {
  writeLog(LOG_LEVELS.INFO, message, data);
}

/**
 * Log debug
 */
function debug(message, data = null) {
  writeLog(LOG_LEVELS.DEBUG, message, data);
}

/**
 * Set log level
 */
function setLogLevel(level) {
  if (typeof level === 'string') {
    logLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  } else {
    logLevel = level;
  }
}

/**
 * Get log directory
 */
function getLogDir() {
  return LOG_DIR;
}

// Initialize on module load
initLogger();

module.exports = {
  error,
  warn,
  info,
  debug,
  setLogLevel,
  getLogDir,
  LOG_LEVELS,
};

