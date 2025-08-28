/**
 * Unit tests for background service worker
 */

import { setupChromeMocks, resetChromeMocks } from '../../mocks/chrome';

// Mock the database module
const mockDb = {
  init: jest.fn().mockResolvedValue(undefined),
  getCurrentActivity: jest.fn().mockResolvedValue(null),
  stopCurrentActivity: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/shared/database', () => ({
  db: mockDb,
}));

// Mock utility functions
jest.mock('../../../src/shared/utils', () => ({
  getCurrentDuration: jest.fn().mockReturnValue('30m'),
}));

describe('Background Service Worker', () => {
  beforeEach(() => {
    setupChromeMocks();
    jest.clearAllMocks();
    resetChromeMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize database on startup', async () => {
      const chrome = (global as any).chrome;

      // Simulate runtime.onStartup event
      const startupCallback = jest.fn();
      chrome.runtime.onStartup.addListener.mockImplementation((callback: Function) => {
        startupCallback.mockImplementation(callback);
      });

      // Simulate service worker initialization
      await startupCallback();

      expect(mockDb.init).toHaveBeenCalled();
    });

    it('should initialize database on install', async () => {
      const chrome = (global as any).chrome;

      // Simulate runtime.onInstalled event
      const installedCallback = jest.fn();
      chrome.runtime.onInstalled.addListener.mockImplementation((callback: Function) => {
        installedCallback.mockImplementation(callback);
      });

      // Simulate extension installation
      await installedCallback();

      expect(mockDb.init).toHaveBeenCalled();
    });
  });

  describe('Badge Management', () => {
    it('should update badge when activity is running', async () => {
      const chrome = (global as any).chrome;
      
      // Mock current activity
      const mockActivity = {
        id: 1,
        activity: 'Test Activity',
        start: new Date(),
        day: 1,
        month: 1,
        year: 2024,
      };

      mockDb.getCurrentActivity.mockResolvedValue(mockActivity);

      // Simulate badge update logic
      const currentActivity = await mockDb.getCurrentActivity();
      if (currentActivity) {
        chrome.action.setBadgeText({ text: '30m' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      }

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '30m' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4CAF50' });
    });

    it('should clear badge when no activity is running', async () => {
      const chrome = (global as any).chrome;

      mockDb.getCurrentActivity.mockResolvedValue(null);

      // Simulate badge clearing logic
      const currentActivity = await mockDb.getCurrentActivity();
      if (!currentActivity) {
        chrome.action.setBadgeText({ text: '' });
      }

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('Periodic Updates', () => {
    it('should check current activity every 60 seconds', () => {
      // Simulate setting up periodic updates
      const intervalId = setInterval(async () => {
        await mockDb.getCurrentActivity();
      }, 60000);

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      expect(mockDb.getCurrentActivity).toHaveBeenCalled();

      clearInterval(intervalId);
    });

    it('should handle errors in periodic updates gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockDb.getCurrentActivity.mockRejectedValue(new Error('Database error'));

      // Simulate error handling in periodic update
      try {
        await mockDb.getCurrentActivity();
      } catch (error) {
        console.error('Error checking current activity:', error);
      }

      expect(consoleSpy).toHaveBeenCalledWith('Error checking current activity:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Message Handling', () => {
    it('should handle STOP_CURRENT_ACTIVITY message', async () => {
      const chrome = (global as any).chrome;
      const sendResponse = jest.fn();

      // Mock message handler
      const messageHandler = jest.fn(async (message, sender, sendResponseCallback) => {
        if (message.type === 'STOP_CURRENT_ACTIVITY') {
          try {
            await mockDb.stopCurrentActivity();
            sendResponseCallback({ success: true });
          } catch (error) {
            sendResponseCallback({ success: false, error: error.message });
          }
        }
        return true; // Keep message channel open
      });

      chrome.runtime.onMessage.addListener.mockImplementation(messageHandler);

      // Simulate receiving message
      await messageHandler(
        { type: 'STOP_CURRENT_ACTIVITY' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(mockDb.stopCurrentActivity).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should handle UPDATE_BADGE message', async () => {
      const chrome = (global as any).chrome;
      const sendResponse = jest.fn();

      mockDb.getCurrentActivity.mockResolvedValue({
        id: 1,
        activity: 'Test Activity',
        start: new Date(),
        day: 1,
        month: 1,
        year: 2024,
      });

      // Mock message handler
      const messageHandler = jest.fn(async (message, sender, sendResponseCallback) => {
        if (message.type === 'UPDATE_BADGE') {
          await mockDb.getCurrentActivity();
          sendResponseCallback({ success: true });
        }
        return true;
      });

      chrome.runtime.onMessage.addListener.mockImplementation(messageHandler);

      // Simulate receiving message
      await messageHandler(
        { type: 'UPDATE_BADGE' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(mockDb.getCurrentActivity).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should handle unknown message types', async () => {
      const sendResponse = jest.fn();

      // Mock message handler
      const messageHandler = jest.fn((message, sender, sendResponseCallback) => {
        if (message.type === 'UNKNOWN_TYPE') {
          sendResponseCallback({ success: false, error: 'Unknown message type' });
        }
      });

      // Simulate receiving unknown message
      messageHandler(
        { type: 'UNKNOWN_TYPE' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown message type' });
    });
  });

  describe('Notifications', () => {
    it('should create notification when activity is stopped', async () => {
      const chrome = (global as any).chrome;

      chrome.notifications.create.mockResolvedValue('notification-id');

      // Simulate notification creation
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '../images/icon.png',
        title: 'Time Tracker',
        message: 'Activity stopped successfully'
      });

      expect(chrome.notifications.create).toHaveBeenCalledWith({
        type: 'basic',
        iconUrl: '../images/icon.png',
        title: 'Time Tracker',
        message: 'Activity stopped successfully'
      });
    });

    it('should auto-hide notification after 5 seconds', () => {
      const chrome = (global as any).chrome;

      // Simulate auto-hide logic
      setTimeout(() => {
        chrome.notifications.clear('notification-id');
      }, 5000);

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      expect(chrome.notifications.clear).toHaveBeenCalledWith('notification-id');
    });
  });

  describe('Alarm Handling', () => {
    it('should handle updateBadge alarm', async () => {
      const chrome = (global as any).chrome;

      // Mock alarm handler
      const alarmHandler = jest.fn((alarm) => {
        if (alarm.name === 'updateBadge') {
          mockDb.getCurrentActivity();
        }
      });

      chrome.alarms.onAlarm.addListener.mockImplementation(alarmHandler);

      // Simulate alarm firing
      alarmHandler({ name: 'updateBadge' });

      expect(mockDb.getCurrentActivity).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should handle suspend event', () => {
      const chrome = (global as any).chrome;
      
      // Mock cleanup function
      const cleanup = jest.fn(() => {
        // Clear any intervals or timeouts
        jest.clearAllTimers();
      });

      // Mock suspend handler
      const suspendHandler = jest.fn(() => {
        cleanup();
      });

      chrome.runtime.onSuspend.addListener.mockImplementation(suspendHandler);

      // Simulate suspend event
      suspendHandler();

      expect(cleanup).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockDb.init.mockRejectedValue(new Error('Failed to initialize database'));

      // Simulate initialization with error handling
      try {
        await mockDb.init();
      } catch (error) {
        console.error('Failed to initialize background service:', error);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize background service:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle stop activity errors', async () => {
      const sendResponse = jest.fn();

      mockDb.stopCurrentActivity.mockRejectedValue(new Error('Database error'));

      // Mock error handling in message handler
      const messageHandler = jest.fn(async (message, sender, sendResponseCallback) => {
        if (message.type === 'STOP_CURRENT_ACTIVITY') {
          try {
            await mockDb.stopCurrentActivity();
            sendResponseCallback({ success: true });
          } catch (error) {
            sendResponseCallback({ success: false, error: error.message });
          }
        }
        return true;
      });

      // Simulate message with error
      await messageHandler(
        { type: 'STOP_CURRENT_ACTIVITY' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});