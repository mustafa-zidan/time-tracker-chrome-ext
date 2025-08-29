/**
 * Modern popup script using vanilla TypeScript
 * Handles UI interactions and time tracking functionality
 */

import { db, Activity } from '../shared/database';
import { formatTime, formatDuration, getCurrentDuration, sanitizeInput, debounce } from '../shared/utils';

class TimeTrackerPopup {
  private currentActivity: Activity | null = null;
  private selectedDate: Date = new Date();
  private activities: Activity[] = [];
  private editingActivityId: number | null = null;
  private selectedTags: string[] = [];
  private allTags: string[] = [];

  // DOM elements
  private activityInput!: HTMLInputElement;
  private trackBtn!: HTMLButtonElement;
  private dateInput!: HTMLInputElement;
  private activitiesList!: HTMLElement;
  private totalDuration!: HTMLElement;
  private activityCount!: HTMLElement;
  private errorMessage!: HTMLElement;
  private editModal!: HTMLElement;
  private tagFilterSelect!: HTMLSelectElement;
  private clearTagFilterBtn!: HTMLButtonElement;

  async init(): Promise<void> {
    try {
      await db.init();
      this.bindElements();
      this.bindEvents();
      await this.loadCurrentActivity();
      await this.loadTags();
      await this.loadActivities();
      this.updateDateInput();
      console.log('Popup initialized successfully');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize the application');
    }
  }

  private bindElements(): void {
    this.activityInput = document.getElementById('activity-input') as HTMLInputElement;
    this.trackBtn = document.getElementById('track-btn') as HTMLButtonElement;
    this.dateInput = document.getElementById('date-input') as HTMLInputElement;
    this.activitiesList = document.getElementById('activities-list') as HTMLElement;
    this.totalDuration = document.getElementById('total-duration') as HTMLElement;
    this.activityCount = document.getElementById('activity-count') as HTMLElement;
    this.errorMessage = document.getElementById('error-message') as HTMLElement;
    this.editModal = document.getElementById('edit-modal') as HTMLElement;
    this.tagFilterSelect = document.getElementById('tag-filter') as HTMLSelectElement;
    this.clearTagFilterBtn = document.getElementById('clear-tag-filter') as HTMLButtonElement;
  }

  private bindEvents(): void {
    // Track button
    this.trackBtn.addEventListener('click', () => this.handleTrackClick());

    // Activity input
    this.activityInput.addEventListener('input', debounce(() => this.clearError(), 300));
    this.activityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleTrackClick();
      }
    });

    // Date navigation
    document.getElementById('prev-date')?.addEventListener('click', () => this.navigateDate(-1));
    document.getElementById('next-date')?.addEventListener('click', () => this.navigateDate(1));
    document.getElementById('today-btn')?.addEventListener('click', () => this.goToToday());
    this.dateInput.addEventListener('change', () => this.handleDateChange());

    // Add manual activity button
    document.getElementById('add-manual-btn')?.addEventListener('click', () => this.showAddActivityModal());

    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => this.openOptionsPage());

    // Tag filter events
    this.tagFilterSelect.addEventListener('change', () => this.handleTagFilterChange());
    this.clearTagFilterBtn.addEventListener('click', () => this.clearTagFilter());

    // Modal events
    this.bindModalEvents();
  }

  private bindModalEvents(): void {
    const closeModal = document.getElementById('close-modal');
    const cancelEdit = document.getElementById('cancel-edit');
    const editForm = document.getElementById('edit-form') as HTMLFormElement;
    const modalBackdrop = this.editModal.querySelector('.modal-backdrop');

    closeModal?.addEventListener('click', () => this.closeModal());
    cancelEdit?.addEventListener('click', () => this.closeModal());
    modalBackdrop?.addEventListener('click', () => this.closeModal());
    editForm?.addEventListener('submit', (e) => this.handleEditSubmit(e));

    // In-progress checkbox handler
    document.getElementById('edit-in-progress')?.addEventListener('change', (e) => {
      const endTimeInput = document.getElementById('edit-end-time') as HTMLInputElement;
      const checkbox = e.target as HTMLInputElement;
      endTimeInput.disabled = checkbox.checked;
      if (checkbox.checked) {
        endTimeInput.value = '';
      }
    });
  }

  private async loadCurrentActivity(): Promise<void> {
    try {
      this.currentActivity = await db.getCurrentActivity();
      this.updateTrackButton();
    } catch (error) {
      console.error('Error loading current activity:', error);
    }
  }

  private updateTrackButton(): void {
    if (this.currentActivity) {
      this.trackBtn.className = 'action-button stop';
      this.trackBtn.innerHTML = `
        <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="12" height="12"></rect>
        </svg>
        <span class="btn-text">Stop</span>
      `;
      this.activityInput.value = this.currentActivity.activity;
      this.activityInput.disabled = true;
    } else {
      this.trackBtn.className = 'action-button start';
      this.trackBtn.innerHTML = `
        <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5,3 19,12 5,21"></polygon>
        </svg>
        <span class="btn-text">Start</span>
      `;
      this.activityInput.disabled = false;
    }
  }

  private async handleTrackClick(): Promise<void> {
    if (this.currentActivity) {
      await this.stopTracking();
    } else {
      await this.startTracking();
    }
  }

  private async startTracking(): Promise<void> {
    const activityText = sanitizeInput(this.activityInput.value);
    
    if (!activityText.trim()) {
      this.showError('Please enter an activity name');
      this.activityInput.focus();
      return;
    }

    try {
      this.trackBtn.disabled = true;
      
      const now = new Date();
      const activity: Omit<Activity, 'id'> = {
        activity: activityText,
        start: now,
        day: now.getDate(),
        month: now.getMonth() + 1,
        year: now.getFullYear()
      };

      await db.addActivity(activity);
      await this.loadCurrentActivity();
      await this.loadActivities();
      
      // Notify background script to update badge
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
      
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.showError('Failed to start tracking');
    } finally {
      this.trackBtn.disabled = false;
    }
  }

  private async stopTracking(): Promise<void> {
    if (!this.currentActivity?.id) return;

    try {
      this.trackBtn.disabled = true;
      
      await db.updateActivity(this.currentActivity.id, { end: new Date() });
      this.currentActivity = null;
      this.updateTrackButton();
      await this.loadActivities();
      this.activityInput.value = '';
      
      // Notify background script
      chrome.runtime.sendMessage({ type: 'STOP_CURRENT_ACTIVITY' });
      
    } catch (error) {
      console.error('Error stopping tracking:', error);
      this.showError('Failed to stop tracking');
    } finally {
      this.trackBtn.disabled = false;
    }
  }

  private updateDateInput(): void {
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    if (dateStr) {
      this.dateInput.value = dateStr;
    }
  }

  private navigateDate(days: number): void {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() + days);
    this.selectedDate = newDate;
    this.updateDateInput();
    this.loadActivities();
  }

  private goToToday(): void {
    this.selectedDate = new Date();
    this.updateDateInput();
    this.loadActivities();
  }

  private handleDateChange(): void {
    const selectedDateStr = this.dateInput.value;
    if (selectedDateStr) {
      this.selectedDate = new Date(selectedDateStr + 'T00:00:00');
      this.loadActivities();
    }
  }

  private async loadTags(): Promise<void> {
    try {
      this.allTags = await db.getAllTags();
      this.updateTagFilter();
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  private async loadActivities(): Promise<void> {
    try {
      if (this.selectedTags.length > 0) {
        this.activities = await db.getActivitiesByDateAndTags(this.selectedDate, this.selectedTags);
      } else {
        this.activities = await db.getActivitiesByDate(this.selectedDate);
      }
      this.renderActivities();
      this.updateTotalDuration();
    } catch (error) {
      console.error('Error loading activities:', error);
      this.showError('Failed to load activities');
    }
  }

  private renderActivities(): void {
    if (this.activities.length === 0) {
      this.activitiesList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12,6 12,12 16,14"></polyline>
          </svg>
          <p>No activities for this date</p>
        </div>
      `;
      return;
    }

    const activitiesHTML = this.activities.map(activity => {
      const isActive = !activity.end;
      const startTime = formatTime(new Date(activity.start));
      const endTime = activity.end ? formatTime(new Date(activity.end)) : 'ongoing';
      const duration = activity.end 
        ? formatDuration(new Date(activity.start), new Date(activity.end))
        : getCurrentDuration(new Date(activity.start));

      const tagsHTML = activity.tags && activity.tags.length > 0
        ? `<div class="activity-tags">
             ${activity.tags.map(tag => `<span class="tag-badge">${this.escapeHtml(tag)}</span>`).join('')}
           </div>`
        : '';

      return `
        <div class="activity-item ${isActive ? 'active' : ''}" data-id="${activity.id}">
          <div class="activity-info">
            <div class="activity-name">${this.escapeHtml(activity.activity)}</div>
            <div class="activity-time">
              <span>${startTime} - ${endTime}</span>
            </div>
            ${tagsHTML}
          </div>
          <div class="activity-duration">${duration}</div>
          <div class="activity-actions">
            <button class="action-button edit" title="Edit activity" data-id="${activity.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
              </svg>
            </button>
            <button class="action-button delete" title="Delete activity" data-id="${activity.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.activitiesList.innerHTML = activitiesHTML;

    // Bind activity events
    this.bindActivityEvents();
  }

  private bindActivityEvents(): void {
    // Double-click to duplicate activity
    this.activitiesList.querySelectorAll('.activity-item').forEach(item => {
      item.addEventListener('dblclick', (e) => {
        const id = parseInt((e.currentTarget as HTMLElement).dataset.id!);
        this.duplicateActivity(id);
      });
    });

    // Edit buttons
    this.activitiesList.querySelectorAll('.action-button.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt((e.currentTarget as HTMLElement).dataset.id!);
        this.editActivity(id);
      });
    });

    // Delete buttons
    this.activitiesList.querySelectorAll('.action-button.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt((e.currentTarget as HTMLElement).dataset.id!);
        this.deleteActivity(id);
      });
    });
  }

  private async duplicateActivity(id: number): Promise<void> {
    const activity = this.activities.find(a => a.id === id);
    if (!activity || this.currentActivity) return;

    this.activityInput.value = activity.activity;
    await this.startTracking();
  }

  private editActivity(id: number): void {
    const activity = this.activities.find(a => a.id === id);
    if (!activity) return;

    this.editingActivityId = id;
    this.populateEditModal(activity);
    this.openModal();
  }

  private populateEditModal(activity: Activity): void {
    (document.getElementById('edit-activity') as HTMLInputElement).value = activity.activity;
    (document.getElementById('edit-start-time') as HTMLInputElement).value = 
      formatTime(new Date(activity.start));
    
    const endTimeInput = document.getElementById('edit-end-time') as HTMLInputElement;
    const inProgressCheckbox = document.getElementById('edit-in-progress') as HTMLInputElement;
    const descriptionInput = document.getElementById('edit-description') as HTMLTextAreaElement;
    const tagsInput = document.getElementById('edit-tags') as HTMLInputElement;
    
    if (activity.end) {
      endTimeInput.value = formatTime(new Date(activity.end));
      inProgressCheckbox.checked = false;
      endTimeInput.disabled = false;
    } else {
      endTimeInput.value = '';
      inProgressCheckbox.checked = true;
      endTimeInput.disabled = true;
    }
    
    descriptionInput.value = activity.description || '';
    tagsInput.value = activity.tags ? activity.tags.join(', ') : '';
    
    (document.getElementById('modal-title') as HTMLElement).textContent = 'Edit Activity';
  }

  private async handleEditSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const activityName = sanitizeInput((document.getElementById('edit-activity') as HTMLInputElement).value);
    const startTimeStr = (document.getElementById('edit-start-time') as HTMLInputElement).value;
    const endTimeStr = (document.getElementById('edit-end-time') as HTMLInputElement).value;
    const inProgress = (document.getElementById('edit-in-progress') as HTMLInputElement).checked;
    const description = sanitizeInput((document.getElementById('edit-description') as HTMLTextAreaElement).value);
    const tagsStr = sanitizeInput((document.getElementById('edit-tags') as HTMLInputElement).value);
    const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    if (!activityName.trim()) {
      this.showError('Activity name is required');
      return;
    }

    try {
      const startTime = new Date(this.selectedDate);
      const startTimeParts = startTimeStr.split(':').map(Number);
      const startHours = startTimeParts[0] ?? 0;
      const startMinutes = startTimeParts[1] ?? 0;
      startTime.setHours(startHours, startMinutes, 0, 0);

      let endTime: Date | undefined;
      if (!inProgress && endTimeStr) {
        endTime = new Date(this.selectedDate);
        const endTimeParts = endTimeStr.split(':').map(Number);
        const endHours = endTimeParts[0] ?? 0;
        const endMinutes = endTimeParts[1] ?? 0;
        endTime.setHours(endHours, endMinutes, 0, 0);
        
        if (endTime <= startTime) {
          this.showError('End time must be after start time');
          return;
        }
      }

      if (this.editingActivityId) {
        // Update existing activity
        await db.updateActivity(this.editingActivityId, {
          activity: activityName,
          start: startTime,
          end: endTime,
          description: description || undefined,
          tags: tags.length > 0 ? tags : undefined
        });
      } else {
        // Add new activity
        const newActivity: Omit<Activity, 'id'> = {
          activity: activityName,
          start: startTime,
          end: endTime,
          description: description || undefined,
          tags: tags.length > 0 ? tags : undefined,
          day: this.selectedDate.getDate(),
          month: this.selectedDate.getMonth() + 1,
          year: this.selectedDate.getFullYear()
        };
        await db.addActivity(newActivity);
      }

      this.closeModal();
      await this.loadTags(); // Refresh tags in case new ones were added
      await this.loadActivities();
      await this.loadCurrentActivity(); // In case we edited the current activity
      
    } catch (error) {
      console.error('Error updating activity:', error);
      this.showError('Failed to update activity');
    }
  }

  private async deleteActivity(id: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      await db.deleteActivity(id);
      await this.loadActivities();
      await this.loadCurrentActivity(); // In case we deleted the current activity
    } catch (error) {
      console.error('Error deleting activity:', error);
      this.showError('Failed to delete activity');
    }
  }

  private updateTotalDuration(): void {
    let totalMinutes = 0;

    this.activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      totalMinutes += Math.floor(durationMs / (1000 * 60));
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let durationText = '';
    if (hours > 0) {
      durationText = `${hours}h ${minutes}m`;
    } else {
      durationText = `${minutes}m`;
    }
    
    this.totalDuration.textContent = durationText;
    this.activityCount.textContent = this.activities.length.toString();
  }

  private openModal(): void {
    this.editModal.classList.add('active');
    this.editModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
      (document.getElementById('edit-activity') as HTMLInputElement)?.focus();
    }, 100);
  }

  private closeModal(): void {
    this.editModal.classList.remove('active');
    this.editModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.editingActivityId = null;
    this.clearError();
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('show');
    setTimeout(() => this.clearError(), 5000);
  }

  private clearError(): void {
    this.errorMessage.textContent = '';
    this.errorMessage.classList.remove('show');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showAddActivityModal(): void {
    this.editingActivityId = null;
    this.populateEditModalForNewActivity();
    this.openModal();
  }

  private populateEditModalForNewActivity(): void {
    (document.getElementById('edit-activity') as HTMLInputElement).value = '';
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    (document.getElementById('edit-start-time') as HTMLInputElement).value = currentTime;
    
    const endTimeInput = document.getElementById('edit-end-time') as HTMLInputElement;
    const inProgressCheckbox = document.getElementById('edit-in-progress') as HTMLInputElement;
    const descriptionInput = document.getElementById('edit-description') as HTMLTextAreaElement;
    const tagsInput = document.getElementById('edit-tags') as HTMLInputElement;
    
    endTimeInput.value = '';
    inProgressCheckbox.checked = false;
    endTimeInput.disabled = false;
    descriptionInput.value = '';
    tagsInput.value = '';
    
    (document.getElementById('modal-title') as HTMLElement).textContent = 'Add Activity';
  }

  private openOptionsPage(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  private updateTagFilter(): void {
    // Clear existing options except the default one
    this.tagFilterSelect.innerHTML = '<option value="">All activities</option>';
    
    // Add tag options
    this.allTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      this.tagFilterSelect.appendChild(option);
    });

    // Update clear button state
    this.clearTagFilterBtn.disabled = this.selectedTags.length === 0;
  }

  private handleTagFilterChange(): void {
    const selectedTag = this.tagFilterSelect.value;
    if (selectedTag) {
      this.selectedTags = [selectedTag];
    } else {
      this.selectedTags = [];
    }
    
    this.clearTagFilterBtn.disabled = this.selectedTags.length === 0;
    this.loadActivities();
  }

  private clearTagFilter(): void {
    this.selectedTags = [];
    this.tagFilterSelect.value = '';
    this.clearTagFilterBtn.disabled = true;
    this.loadActivities();
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const popup = new TimeTrackerPopup();
  await popup.init();
});