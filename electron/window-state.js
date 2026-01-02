/**
 * Window state management (save/restore window position and size)
 */

const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

/**
 * Validate window state against current screen configuration
 * @param {object} state - Window state object to validate
 * @returns {object|null} Validated state or null if invalid
 */
function validateWindowState(state) {
  if (!state || typeof state !== 'object') {
    return null;
  }

  try {
    const displays = screen.getAllDisplays();
    if (displays.length === 0) {
      return null;
    }

    // Find the display that contains the window position, or use primary display
    let targetDisplay = displays.find(d => 
      state.x >= d.bounds.x && 
      state.x < d.bounds.x + d.bounds.width &&
      state.y >= d.bounds.y && 
      state.y < d.bounds.y + d.bounds.height
    ) || displays.find(d => d.bounds.x === 0 && d.bounds.y === 0) || displays[0];

    const { width: screenWidth, height: screenHeight } = targetDisplay.workAreaSize;
    const minWidth = 800;
    const minHeight = 600;
    const maxWidth = screenWidth * 2;
    const maxHeight = screenHeight * 2;

    // Validate dimensions
    if (!state.width || state.width < minWidth || state.width > maxWidth ||
        !state.height || state.height < minHeight || state.height > maxHeight) {
      return null;
    }

    // Validate position (allow some off-screen for multi-monitor setups)
    if (state.x !== undefined && state.y !== undefined) {
      const maxX = targetDisplay.bounds.x + targetDisplay.bounds.width + screenWidth;
      const maxY = targetDisplay.bounds.y + targetDisplay.bounds.height + screenHeight;
      const minX = targetDisplay.bounds.x - screenWidth;
      const minY = targetDisplay.bounds.y - screenHeight;

      if (state.x < minX || state.x > maxX || state.y < minY || state.y > maxY) {
        // Position is out of bounds, center on target display instead
        return {
          ...state,
          x: targetDisplay.bounds.x + (targetDisplay.bounds.width - state.width) / 2,
          y: targetDisplay.bounds.y + (targetDisplay.bounds.height - state.height) / 2,
        };
      }
    }

    // Validate boolean flags
    const validatedState = {
      width: Math.round(state.width),
      height: Math.round(state.height),
      x: state.x !== undefined ? Math.round(state.x) : undefined,
      y: state.y !== undefined ? Math.round(state.y) : undefined,
      isMaximized: Boolean(state.isMaximized),
      isFullScreen: Boolean(state.isFullScreen),
    };

    return validatedState;
  } catch (error) {
    console.warn('[WindowState] Validation error:', error.message);
    return null;
  }
}

/**
 * Get saved window state
 * @returns {object|null} Window state or null
 */
function getWindowState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return null;
    }
    
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    return validateWindowState(state);
  } catch (error) {
    // Invalid state file, ignore
    console.warn('[WindowState] Could not read window state:', error.message);
  }
  
  return null;
}

/**
 * Save window state
 * @param {object} window - BrowserWindow instance
 */
function saveWindowState(window) {
  if (!window || window.isDestroyed()) return;
  
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    const bounds = window.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.warn('[WindowState] Could not save window state:', error.message);
  }
}

module.exports = {
  getWindowState,
  saveWindowState,
  validateWindowState,
};

