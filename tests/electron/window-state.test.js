/**
 * Tests for window state validation
 * 
 * Run with: mocha tests/electron/window-state.test.js
 */

const { validateWindowState } = require('../../electron/window-state');
const { expect } = require('chai');

describe('Window State Validation', () => {
  // Mock screen.getAllDisplays for testing
  const originalScreen = require('electron').screen;
  
  beforeEach(() => {
    // Mock screen with a single display
    require('electron').screen = {
      getAllDisplays: () => [{
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workAreaSize: { width: 1920, height: 1040 }
      }]
    };
  });

  afterEach(() => {
    require('electron').screen = originalScreen;
  });

  describe('validateWindowState', () => {
    it('should return null for invalid state objects', () => {
      expect(validateWindowState(null)).to.be.null;
      expect(validateWindowState(undefined)).to.be.null;
      expect(validateWindowState('invalid')).to.be.null;
      expect(validateWindowState({})).to.be.null;
    });

    it('should validate window dimensions', () => {
      const validState = {
        width: 1400,
        height: 900,
        x: 100,
        y: 100,
        isMaximized: false,
      };

      const result = validateWindowState(validState);
      expect(result).to.not.be.null;
      expect(result.width).to.equal(1400);
      expect(result.height).to.equal(900);
    });

    it('should reject windows that are too small', () => {
      const tooSmall = {
        width: 500,
        height: 400,
        x: 100,
        y: 100,
      };

      expect(validateWindowState(tooSmall)).to.be.null;
    });

    it('should reject windows that are too large', () => {
      const tooLarge = {
        width: 5000,
        height: 4000,
        x: 100,
        y: 100,
      };

      expect(validateWindowState(tooLarge)).to.be.null;
    });

    it('should validate window position', () => {
      const validState = {
        width: 1400,
        height: 900,
        x: 100,
        y: 100,
        isMaximized: false,
      };

      const result = validateWindowState(validState);
      expect(result).to.not.be.null;
      expect(result.x).to.equal(100);
      expect(result.y).to.equal(100);
    });

    it('should center window if position is out of bounds', () => {
      const outOfBounds = {
        width: 1400,
        height: 900,
        x: 10000,
        y: 10000,
        isMaximized: false,
      };

      const result = validateWindowState(outOfBounds);
      expect(result).to.not.be.null;
      // Should be centered on screen
      expect(result.x).to.be.within(0, 1920);
      expect(result.y).to.be.within(0, 1080);
    });

    it('should round dimensions and positions', () => {
      const fractionalState = {
        width: 1400.7,
        height: 900.3,
        x: 100.9,
        y: 100.1,
        isMaximized: false,
      };

      const result = validateWindowState(fractionalState);
      expect(result).to.not.be.null;
      expect(result.width).to.equal(1401);
      expect(result.height).to.equal(900);
      expect(result.x).to.equal(101);
      expect(result.y).to.equal(100);
    });

    it('should validate boolean flags', () => {
      const state = {
        width: 1400,
        height: 900,
        x: 100,
        y: 100,
        isMaximized: 'true', // String should be converted to boolean
        isFullScreen: 1, // Number should be converted to boolean
      };

      const result = validateWindowState(state);
      expect(result).to.not.be.null;
      expect(result.isMaximized).to.be.a('boolean');
      expect(result.isFullScreen).to.be.a('boolean');
    });

    it('should handle missing position coordinates', () => {
      const stateWithoutPosition = {
        width: 1400,
        height: 900,
        isMaximized: false,
      };

      const result = validateWindowState(stateWithoutPosition);
      expect(result).to.not.be.null;
      expect(result.x).to.be.undefined;
      expect(result.y).to.be.undefined;
    });

    it('should handle multi-monitor setups', () => {
      // Mock screen with multiple displays
      require('electron').screen = {
        getAllDisplays: () => [
          {
            bounds: { x: 0, y: 0, width: 1920, height: 1080 },
            workAreaSize: { width: 1920, height: 1040 }
          },
          {
            bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
            workAreaSize: { width: 1920, height: 1040 }
          }
        ]
      };

      const stateOnSecondMonitor = {
        width: 1400,
        height: 900,
        x: 2000, // On second monitor
        y: 100,
        isMaximized: false,
      };

      const result = validateWindowState(stateOnSecondMonitor);
      expect(result).to.not.be.null;
      expect(result.x).to.equal(2000);
    });
  });
});

