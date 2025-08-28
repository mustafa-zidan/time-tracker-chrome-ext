/**
 * Modern service worker for Chrome Extension Manifest V3
 * Handles background tasks, notifications, and badge updates
 */

import { db, Activity } from '../shared/database.js';
import { getCurrentDuration } from '../shared/utils.js';

class BackgroundService {
  private currentActivity: Activity | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    try {
      await db.init();
      await this.checkCurrentActivity();
      this.startPeriodicUpdates();
      console.log('Background service initialized');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  private async checkCurrentActivity(): Promise<void> {
    try {
      this.currentActivity = await db.getCurrentActivity();
      if (this.currentActivity) {
        this.updateBadge();
      } else {
        this.clearBadge();
      }
    } catch (error) {
      console.error('Error checking current activity:', error);
    }
  }

  private startPeriodicUpdates(): void {
    // Update badge every minute
    this.updateInterval = setInterval(async () => {
      await this.checkCurrentActivity();
    }, 60000);
  }

  private updateBadge(): void {
    if (!this.currentActivity) return;

    const startTime = new Date(this.currentActivity.start);
    const duration = getCurrentDuration(startTime);
    
    chrome.action.setBadgeText({
      text: duration
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50'
    });
  }

  private clearBadge(): void {
    chrome.action.setBadgeText({ text: '' });
  }

  async stopCurrentActivity(): Promise<void> {
    try {
      await db.stopCurrentActivity();
      this.currentActivity = null;
      this.clearBadge();
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../images/icon.png',
        title: 'Time Tracker',
        message: 'Activity stopped successfully'
      });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        chrome.notifications.clear('notification');
      }, 5000);
      
    } catch (error) {
      console.error('Error stopping activity:', error);
    }
  }

  cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

// Chrome extension event listeners
chrome.runtime.onStartup.addListener(async () => {
  await backgroundService.init();
});

chrome.runtime.onInstalled.addListener(async () => {
  await backgroundService.init();
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'STOP_CURRENT_ACTIVITY':
      backgroundService.stopCurrentActivity().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
      
    case 'UPDATE_BADGE':
      backgroundService.checkCurrentActivity().then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Handle alarm events (for future features like reminders)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBadge') {
    backgroundService.checkCurrentActivity();
  }
});

// Cleanup when extension is suspended
chrome.runtime.onSuspend.addListener(() => {
  backgroundService.cleanup();
});

// Initialize immediately
backgroundService.init();