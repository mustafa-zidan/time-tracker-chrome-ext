/**
 * Modern options page for Chrome Extension
 * Handles settings, data management, and statistics
 */

import { db, Activity } from '../shared/database';

interface Settings {
  enableNotifications: boolean;
  autoHideNotifications: boolean;
}

interface Statistics {
  totalActivities: number;
  totalTimeMinutes: number;
  avgDailyMinutes: number;
  activeDays: number;
}

class OptionsPage {
  private settings: Settings = {
    enableNotifications: true,
    autoHideNotifications: true
  };

  async init(): Promise<void> {
    try {
      await db.init();
      await this.loadSettings();
      this.bindEvents();
      await this.loadStatistics();
      console.log('Options page initialized');
    } catch (error) {
      console.error('Failed to initialize options page:', error);
      this.showToast('Failed to initialize options page', 'error');
    }
  }

  private bindEvents(): void {
    // Settings checkboxes
    document.getElementById('enableNotifications')?.addEventListener('change', () => this.saveSettings());
    document.getElementById('autoHideNotifications')?.addEventListener('change', () => this.saveSettings());

    // Data management buttons
    document.getElementById('exportJson')?.addEventListener('click', () => this.exportData('json'));
    document.getElementById('exportCsv')?.addEventListener('click', () => this.exportData('csv'));
    document.getElementById('importBtn')?.addEventListener('click', () => this.triggerImport());
    document.getElementById('importFile')?.addEventListener('change', (e) => this.importData(e));
    document.getElementById('clearData')?.addEventListener('click', () => this.clearAllData());

    // Statistics
    document.getElementById('refreshStats')?.addEventListener('click', () => this.loadStatistics());

    // Toast close
    document.getElementById('toastClose')?.addEventListener('click', () => this.hideToast());
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }
      this.updateSettingsUI();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private updateSettingsUI(): void {
    const enableNotificationsEl = document.getElementById('enableNotifications') as HTMLInputElement;
    const autoHideNotificationsEl = document.getElementById('autoHideNotifications') as HTMLInputElement;

    if (enableNotificationsEl) {
      enableNotificationsEl.checked = this.settings.enableNotifications;
    }
    if (autoHideNotificationsEl) {
      autoHideNotificationsEl.checked = this.settings.autoHideNotifications;
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const enableNotificationsEl = document.getElementById('enableNotifications') as HTMLInputElement;
      const autoHideNotificationsEl = document.getElementById('autoHideNotifications') as HTMLInputElement;

      this.settings = {
        enableNotifications: enableNotificationsEl?.checked ?? true,
        autoHideNotifications: autoHideNotificationsEl?.checked ?? true
      };

      await chrome.storage.sync.set({ settings: this.settings });
      this.showToast('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  private async loadStatistics(): Promise<void> {
    const refreshBtn = document.getElementById('refreshStats') as HTMLButtonElement;
    
    try {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Loading...';

      const stats = await this.calculateStatistics();
      this.updateStatisticsUI(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
      this.showToast('Failed to load statistics', 'error');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Statistics';
    }
  }

  private async calculateStatistics(): Promise<Statistics> {
    return new Promise((resolve, reject) => {
      const transaction = indexedDB.open('TimeTrackerDB', 1);
      
      transaction.onsuccess = () => {
        const db = transaction.result;
        const objectStore = db.transaction(['activities']).objectStore('activities');
        const request = objectStore.getAll();

        request.onsuccess = () => {
          const activities: Activity[] = request.result;
          
          let totalTimeMinutes = 0;
          const activeDaysSet = new Set<string>();

          activities.forEach(activity => {
            // Calculate duration
            const startTime = new Date(activity.start);
            const endTime = activity.end ? new Date(activity.end) : new Date();
            const durationMs = endTime.getTime() - startTime.getTime();
            totalTimeMinutes += Math.floor(durationMs / (1000 * 60));

            // Track active days
            const dateKey = `${activity.year}-${activity.month}-${activity.day}`;
            activeDaysSet.add(dateKey);
          });

          const activeDays = activeDaysSet.size;
          const avgDailyMinutes = activeDays > 0 ? Math.round(totalTimeMinutes / activeDays) : 0;

          resolve({
            totalActivities: activities.length,
            totalTimeMinutes,
            avgDailyMinutes,
            activeDays
          });
        };

        request.onerror = () => reject(request.error);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  private updateStatisticsUI(stats: Statistics): void {
    const totalActivitiesEl = document.getElementById('totalActivities');
    const totalTimeEl = document.getElementById('totalTime');
    const avgDailyEl = document.getElementById('avgDaily');
    const activeDaysEl = document.getElementById('activeDays');

    if (totalActivitiesEl) {
      totalActivitiesEl.textContent = stats.totalActivities.toLocaleString();
    }

    if (totalTimeEl) {
      const hours = Math.floor(stats.totalTimeMinutes / 60);
      const minutes = stats.totalTimeMinutes % 60;
      totalTimeEl.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    if (avgDailyEl) {
      const hours = Math.floor(stats.avgDailyMinutes / 60);
      const minutes = stats.avgDailyMinutes % 60;
      avgDailyEl.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    if (activeDaysEl) {
      activeDaysEl.textContent = stats.activeDays.toString();
    }
  }

  private async exportData(format: 'json' | 'csv'): Promise<void> {
    const button = document.getElementById(`export${format.charAt(0).toUpperCase() + format.slice(1)}`) as HTMLButtonElement;
    
    try {
      button.disabled = true;
      button.textContent = 'Exporting...';

      const activities = await this.getAllActivities();
      let content: string;
      let mimeType: string;
      let filename: string;

      if (format === 'json') {
        content = JSON.stringify(activities, null, 2);
        mimeType = 'application/json';
        filename = `time-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        content = this.convertToCSV(activities);
        mimeType = 'text/csv';
        filename = `time-tracker-data-${new Date().toISOString().split('T')[0]}.csv`;
      }

      this.downloadFile(content, filename, mimeType);
      this.showToast(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showToast('Failed to export data', 'error');
    } finally {
      button.disabled = false;
      button.textContent = format === 'json' ? 'Export JSON' : 'Export CSV';
    }
  }

  private async getAllActivities(): Promise<Activity[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TimeTrackerDB', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['activities'], 'readonly');
        const objectStore = transaction.objectStore('activities');
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = () => {
          const activities = getAllRequest.result.sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
          );
          resolve(activities);
        };

        getAllRequest.onerror = () => reject(getAllRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private convertToCSV(activities: Activity[]): string {
    const headers = ['ID', 'Activity', 'Description', 'Start', 'End', 'Duration (minutes)', 'Date'];
    const csvRows = [headers.join(',')];

    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : null;
      const duration = endTime 
        ? Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
        : 'Ongoing';

      const row = [
        activity.id || '',
        `"${(activity.activity || '').replace(/"/g, '""')}"`,
        `"${(activity.description || '').replace(/"/g, '""')}"`,
        startTime.toISOString(),
        endTime ? endTime.toISOString() : '',
        duration,
        `${activity.year}-${String(activity.month).padStart(2, '0')}-${String(activity.day).padStart(2, '0')}`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private triggerImport(): void {
    const fileInput = document.getElementById('importFile') as HTMLInputElement;
    fileInput.click();
  }

  private async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const importBtn = document.getElementById('importBtn') as HTMLButtonElement;
    
    try {
      importBtn.disabled = true;
      importBtn.textContent = 'Importing...';

      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid file format - expected an array of activities');
      }

      await this.importActivities(data);
      this.showToast(`Successfully imported ${data.length} activities`);
      await this.loadStatistics();
    } catch (error) {
      console.error('Error importing data:', error);
      this.showToast('Failed to import data - please check the file format', 'error');
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = 'Import JSON';
      input.value = '';
    }
  }

  private async importActivities(activities: Activity[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TimeTrackerDB', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['activities'], 'readwrite');
        const objectStore = transaction.objectStore('activities');
        
        let imported = 0;
        
        activities.forEach(activity => {
          // Validate and normalize the activity data
          const normalizedActivity = {
            activity: activity.activity || 'Imported Activity',
            description: activity.description || '',
            start: new Date(activity.start),
            end: activity.end ? new Date(activity.end) : undefined,
            day: activity.day || new Date(activity.start).getDate(),
            month: activity.month || (new Date(activity.start).getMonth() + 1),
            year: activity.year || new Date(activity.start).getFullYear()
          };

          const addRequest = objectStore.add(normalizedActivity);
          addRequest.onsuccess = () => {
            imported++;
            if (imported === activities.length) {
              resolve();
            }
          };
        });

        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async clearAllData(): Promise<void> {
    const confirmed = confirm(
      'Are you sure you want to delete ALL time tracking data?\n\nThis action cannot be undone.'
    );
    
    if (!confirmed) return;

    const clearBtn = document.getElementById('clearData') as HTMLButtonElement;
    
    try {
      clearBtn.disabled = true;
      clearBtn.textContent = 'Clearing...';

      await this.deleteAllActivities();
      this.showToast('All data has been cleared');
      await this.loadStatistics();
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showToast('Failed to clear data', 'error');
    } finally {
      clearBtn.disabled = false;
      clearBtn.textContent = 'Clear Data';
    }
  }

  private async deleteAllActivities(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TimeTrackerDB', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['activities'], 'readwrite');
        const objectStore = transaction.objectStore('activities');
        const clearRequest = objectStore.clear();

        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  private hideToast(): void {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.classList.remove('show');
    }
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const optionsPage = new OptionsPage();
  await optionsPage.init();
});