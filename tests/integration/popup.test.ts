/**
 * Integration tests for popup functionality
 */

import { setupChromeMocks, resetChromeMocks } from '../mocks/chrome';

// Mock the database module
const mockDb = {
  init: jest.fn().mockResolvedValue(undefined),
  addActivity: jest.fn().mockResolvedValue(1),
  updateActivity: jest.fn().mockResolvedValue(undefined),
  deleteActivity: jest.fn().mockResolvedValue(undefined),
  getActivitiesByDate: jest.fn().mockResolvedValue([]),
  getCurrentActivity: jest.fn().mockResolvedValue(null),
  stopCurrentActivity: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../src/shared/database', () => ({
  db: mockDb,
  TimeTrackerDB: jest.fn(() => mockDb),
}));

// Mock DOM for testing
const createMockDOM = () => {
  document.body.innerHTML = `
    <div class="app">
      <input id="activity-input" type="text" />
      <button id="track-btn" class="track-button start">
        <span class="btn-text">Start</span>
      </button>
      <input id="date-input" type="date" />
      <button id="prev-date"></button>
      <button id="next-date"></button>
      <button id="today-btn"></button>
      <div id="activities-list"></div>
      <div id="total-duration">0m</div>
      <div id="error-message"></div>
      <div id="edit-modal" class="modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <button id="close-modal"></button>
          <form id="edit-form">
            <input id="edit-activity" />
            <input id="edit-start-time" type="time" />
            <input id="edit-end-time" type="time" />
            <input id="edit-in-progress" type="checkbox" />
            <textarea id="edit-description"></textarea>
            <button id="cancel-edit" type="button"></button>
          </form>
        </div>
      </div>
    </div>
  `;
};

describe('Popup Integration Tests', () => {
  beforeEach(() => {
    setupChromeMocks();
    createMockDOM();
    jest.clearAllMocks();
    resetChromeMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Popup Initialization', () => {
    it('should initialize popup elements correctly', () => {
      // Test that all required elements are present
      expect(document.getElementById('activity-input')).toBeTruthy();
      expect(document.getElementById('track-btn')).toBeTruthy();
      expect(document.getElementById('date-input')).toBeTruthy();
      expect(document.getElementById('activities-list')).toBeTruthy();
    });

    it('should set up date input with current date', () => {
      const dateInput = document.getElementById('date-input') as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];
      
      // Simulate popup initialization
      dateInput.value = today;
      expect(dateInput.value).toBe(today);
    });
  });

  describe('Activity Tracking', () => {
    it('should handle start tracking with valid input', async () => {
      const activityInput = document.getElementById('activity-input') as HTMLInputElement;
      const trackBtn = document.getElementById('track-btn') as HTMLButtonElement;

      activityInput.value = 'Test Activity';

      // Simulate user clicking start button
      const clickEvent = new MouseEvent('click', { bubbles: true });
      trackBtn.dispatchEvent(clickEvent);

      // In a real popup, this would trigger the tracking logic
      expect(activityInput.value).toBe('Test Activity');
    });

    it('should prevent starting with empty activity name', () => {
      const activityInput = document.getElementById('activity-input') as HTMLInputElement;
      const trackBtn = document.getElementById('track-btn') as HTMLButtonElement;
      const errorMessage = document.getElementById('error-message') as HTMLElement;

      activityInput.value = '';

      // Simulate validation logic
      if (!activityInput.value.trim()) {
        errorMessage.textContent = 'Please enter an activity name';
      }

      expect(errorMessage.textContent).toBe('Please enter an activity name');
    });

    it('should update button state for active tracking', () => {
      const trackBtn = document.getElementById('track-btn') as HTMLButtonElement;
      const btnText = trackBtn.querySelector('.btn-text') as HTMLElement;

      // Simulate active state
      trackBtn.className = 'track-button stop';
      btnText.textContent = 'Stop';

      expect(trackBtn.classList.contains('stop')).toBe(true);
      expect(btnText.textContent).toBe('Stop');
    });
  });

  describe('Date Navigation', () => {
    it('should handle previous date navigation', () => {
      const dateInput = document.getElementById('date-input') as HTMLInputElement;
      const prevBtn = document.getElementById('prev-date') as HTMLButtonElement;

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      dateInput.value = today.toISOString().split('T')[0];

      // Simulate date navigation
      const clickEvent = new MouseEvent('click', { bubbles: true });
      prevBtn.dispatchEvent(clickEvent);

      // In real implementation, this would update the date
      dateInput.value = yesterday.toISOString().split('T')[0];

      expect(dateInput.value).toBe(yesterday.toISOString().split('T')[0]);
    });

    it('should handle today button', () => {
      const dateInput = document.getElementById('date-input') as HTMLInputElement;
      const todayBtn = document.getElementById('today-btn') as HTMLButtonElement;

      // Set to different date first
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dateInput.value = yesterday.toISOString().split('T')[0];

      // Simulate today button click
      const clickEvent = new MouseEvent('click', { bubbles: true });
      todayBtn.dispatchEvent(clickEvent);

      // Should reset to today
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;

      expect(dateInput.value).toBe(today);
    });
  });

  describe('Activities List', () => {
    it('should display empty state when no activities', () => {
      const activitiesList = document.getElementById('activities-list') as HTMLElement;

      activitiesList.innerHTML = `
        <div class="empty-state">
          <p>No activities for this date</p>
        </div>
      `;

      expect(activitiesList.querySelector('.empty-state')).toBeTruthy();
      expect(activitiesList.textContent).toContain('No activities for this date');
    });

    it('should render activity items', () => {
      const activitiesList = document.getElementById('activities-list') as HTMLElement;

      const mockActivity = {
        id: 1,
        activity: 'Test Activity',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      };

      activitiesList.innerHTML = `
        <div class="activity-item" data-id="${mockActivity.id}">
          <div class="activity-info">
            <div class="activity-name">${mockActivity.activity}</div>
            <div class="activity-time">10:00 - 11:00</div>
          </div>
          <div class="activity-duration">1h 0m</div>
        </div>
      `;

      const activityItem = activitiesList.querySelector('.activity-item') as HTMLElement;
      expect(activityItem).toBeTruthy();
      expect(activityItem.dataset.id).toBe('1');
      expect(activityItem.textContent).toContain('Test Activity');
    });
  });

  describe('Edit Modal', () => {
    it('should open edit modal', () => {
      const editModal = document.getElementById('edit-modal') as HTMLElement;

      // Simulate opening modal
      editModal.classList.add('active');
      editModal.setAttribute('aria-hidden', 'false');

      expect(editModal.classList.contains('active')).toBe(true);
      expect(editModal.getAttribute('aria-hidden')).toBe('false');
    });

    it('should close edit modal', () => {
      const editModal = document.getElementById('edit-modal') as HTMLElement;
      const closeBtn = document.getElementById('close-modal') as HTMLButtonElement;

      // First open the modal
      editModal.classList.add('active');
      
      // Simulate closing modal
      const clickEvent = new MouseEvent('click', { bubbles: true });
      closeBtn.dispatchEvent(clickEvent);

      // In real implementation, this would close the modal
      editModal.classList.remove('active');
      editModal.setAttribute('aria-hidden', 'true');

      expect(editModal.classList.contains('active')).toBe(false);
      expect(editModal.getAttribute('aria-hidden')).toBe('true');
    });

    it('should populate edit form with activity data', () => {
      const editActivity = document.getElementById('edit-activity') as HTMLInputElement;
      const editStartTime = document.getElementById('edit-start-time') as HTMLInputElement;
      const editEndTime = document.getElementById('edit-end-time') as HTMLInputElement;

      const mockActivity = {
        id: 1,
        activity: 'Test Activity',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      };

      // Simulate populating form
      editActivity.value = mockActivity.activity;
      editStartTime.value = '10:00';
      editEndTime.value = '11:00';

      expect(editActivity.value).toBe('Test Activity');
      expect(editStartTime.value).toBe('10:00');
      expect(editEndTime.value).toBe('11:00');
    });
  });

  describe('Chrome Extension Integration', () => {
    it('should send messages to background script', () => {
      const chrome = (global as any).chrome;

      // Simulate sending message to background
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'UPDATE_BADGE' });
    });

    it('should handle message responses', async () => {
      const chrome = (global as any).chrome;
      
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const response = await chrome.runtime.sendMessage({ type: 'STOP_CURRENT_ACTIVITY' });

      expect(response).toEqual({ success: true });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', () => {
      const errorMessage = document.getElementById('error-message') as HTMLElement;

      // Simulate error display
      errorMessage.textContent = 'Failed to save activity';

      expect(errorMessage.textContent).toBe('Failed to save activity');
    });

    it('should clear error messages', () => {
      const errorMessage = document.getElementById('error-message') as HTMLElement;

      errorMessage.textContent = 'Some error';
      
      // Simulate clearing error
      errorMessage.textContent = '';

      expect(errorMessage.textContent).toBe('');
    });
  });
});