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

interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  includeStats: boolean;
}

interface ExportData {
  activities: Activity[];
  summary?: {
    totalActivities: number;
    totalTimeMinutes: number;
    dateRange: { start: string; end: string };
    topTags: { tag: string; count: number; timeMinutes: number }[];
    dailyBreakdown: { date: string; activities: number; timeMinutes: number }[];
  };
}

class OptionsPage {
  private settings: Settings = {
    enableNotifications: true,
    autoHideNotifications: true
  };
  
  private availableTags: string[] = [];
  private exportFilters: ExportFilters = {
    includeStats: false
  };

  async init(): Promise<void> {
    try {
      await db.init();
      await this.loadSettings();
      await this.loadAvailableTags();
      this.bindEvents();
      this.initializeExportFilters();
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
    document.getElementById('exportPdf')?.addEventListener('click', () => this.exportData('pdf'));
    document.getElementById('importBtn')?.addEventListener('click', () => this.triggerImport());
    
    // Export filters
    document.getElementById('exportStartDate')?.addEventListener('change', () => this.updateExportFilters());
    document.getElementById('exportEndDate')?.addEventListener('change', () => this.updateExportFilters());
    document.getElementById('exportTagFilter')?.addEventListener('change', () => this.updateExportFilters());
    document.getElementById('exportIncludeStats')?.addEventListener('change', () => this.updateExportFilters());
    
    // Export presets
    document.getElementById('exportPreset7Days')?.addEventListener('click', () => this.setExportPreset(7));
    document.getElementById('exportPreset30Days')?.addEventListener('click', () => this.setExportPreset(30));
    document.getElementById('exportPresetAll')?.addEventListener('click', () => this.setExportPreset(0));
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

  private async exportData(format: 'json' | 'csv' | 'pdf'): Promise<void> {
    const button = document.getElementById(`export${format.charAt(0).toUpperCase() + format.slice(1)}`) as HTMLButtonElement;
    const originalText = button.textContent;
    
    try {
      button.disabled = true;
      button.textContent = 'Exporting...';
      
      const exportData = await this.getFilteredActivitiesForExport();
      let content: string;
      let mimeType: string;
      let filename: string;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const rangeStr = this.exportFilters.startDate && this.exportFilters.endDate
        ? `${this.exportFilters.startDate.toISOString().split('T')[0]}_to_${this.exportFilters.endDate.toISOString().split('T')[0]}`
        : dateStr;
        
      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        filename = `chronoflow-export-${rangeStr}.json`;
      } else if (format === 'csv') {
        content = this.convertToEnhancedCSV(exportData);
        mimeType = 'text/csv';
        filename = `chronoflow-export-${rangeStr}.csv`;
      } else if (format === 'pdf') {
        content = this.convertToPDF(exportData);
        mimeType = 'application/pdf';
        filename = `chronoflow-report-${rangeStr}.pdf`;
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      this.downloadFile(content, filename, mimeType);
      this.showToast(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showToast('Failed to export data', 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
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

  private async loadAvailableTags(): Promise<void> {
    try {
      this.availableTags = await db.getAllTags();
      this.updateTagFilterOptions();
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  private updateTagFilterOptions(): void {
    const tagFilter = document.getElementById('exportTagFilter') as HTMLSelectElement;
    if (!tagFilter) return;

    tagFilter.innerHTML = '<option value="">All tags</option>';
    this.availableTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });
  }

  private initializeExportFilters(): void {
    const today = new Date();
    const startDateInput = document.getElementById('exportStartDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('exportEndDate') as HTMLInputElement | null;
    
    if (startDateInput) {
      startDateInput.value = '';
    }
    if (endDateInput) {
      endDateInput.value = today.toISOString().split('T')[0]!;
    }

    this.updateExportFilters();
  }

  private updateExportFilters(): void {
    const startDateInput = document.getElementById('exportStartDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('exportEndDate') as HTMLInputElement | null;
    const tagFilter = document.getElementById('exportTagFilter') as HTMLSelectElement | null;
    const includeStats = document.getElementById('exportIncludeStats') as HTMLInputElement | null;

    this.exportFilters = {
      startDate: startDateInput?.value ? new Date(startDateInput.value + 'T00:00:00') : undefined,
      endDate: endDateInput?.value ? new Date(endDateInput.value + 'T23:59:59') : undefined,
      tags: tagFilter?.value ? [tagFilter.value] : undefined,
      includeStats: includeStats?.checked ?? false
    };
  }

  private setExportPreset(days: number): void {
    const endDate = new Date();
    const startDate = days > 0 ? new Date(Date.now() - (days * 24 * 60 * 60 * 1000)) : undefined;

    const startDateInput = document.getElementById('exportStartDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('exportEndDate') as HTMLInputElement | null;

    if (startDateInput) {
      startDateInput.value = startDate ? startDate.toISOString().split('T')[0]! : '';
    }
    if (endDateInput) {
      endDateInput.value = endDate.toISOString().split('T')[0]!;
    }

    this.updateExportFilters();
  }

  private async getFilteredActivitiesForExport(): Promise<ExportData> {
    let activities = await this.getAllActivities();

    // Apply date filters
    if (this.exportFilters.startDate || this.exportFilters.endDate) {
      activities = activities.filter(activity => {
        const activityDate = new Date(activity.start);
        if (this.exportFilters.startDate && activityDate < this.exportFilters.startDate) {
          return false;
        }
        if (this.exportFilters.endDate && activityDate > this.exportFilters.endDate) {
          return false;
        }
        return true;
      });
    }

    // Apply tag filters
    if (this.exportFilters.tags && this.exportFilters.tags.length > 0) {
      activities = activities.filter(activity =>
        activity.tags && this.exportFilters.tags!.some(tag => activity.tags!.includes(tag))
      );
    }

    const exportData: ExportData = { activities };

    // Add summary statistics if requested
    if (this.exportFilters.includeStats) {
      exportData.summary = this.generateExportSummary(activities);
    }

    return exportData;
  }

  private generateExportSummary(activities: Activity[]) {
    const totalActivities = activities.length;
    let totalTimeMinutes = 0;
    const tagCounts = new Map<string, { count: number; timeMinutes: number }>();
    const dailyBreakdown = new Map<string, { activities: number; timeMinutes: number }>();

    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      totalTimeMinutes += durationMinutes;

      // Track tags
      if (activity.tags) {
        activity.tags.forEach(tag => {
          if (!tagCounts.has(tag)) {
            tagCounts.set(tag, { count: 0, timeMinutes: 0 });
          }
          const tagData = tagCounts.get(tag)!;
          tagData.count++;
          tagData.timeMinutes += durationMinutes;
        });
      }

      // Track daily breakdown
      const dateKey = `${activity.year}-${String(activity.month).padStart(2, '0')}-${String(activity.day).padStart(2, '0')}`;
      if (!dailyBreakdown.has(dateKey)) {
        dailyBreakdown.set(dateKey, { activities: 0, timeMinutes: 0 });
      }
      const dayData = dailyBreakdown.get(dateKey)!;
      dayData.activities++;
      dayData.timeMinutes += durationMinutes;
    });

    // Get top tags
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, data]) => ({ tag, ...data }))
      .sort((a, b) => b.timeMinutes - a.timeMinutes)
      .slice(0, 10);

    // Get daily breakdown
    const dailyBreakdownArray = Array.from(dailyBreakdown.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const startDate = activities.length > 0 ? new Date(Math.min(...activities.map(a => new Date(a.start).getTime()))).toISOString().split('T')[0]! : new Date().toISOString().split('T')[0]!;
    const endDate = activities.length > 0 ? new Date(Math.max(...activities.map(a => new Date(a.start).getTime()))).toISOString().split('T')[0]! : new Date().toISOString().split('T')[0]!;

    return {
      totalActivities,
      totalTimeMinutes,
      dateRange: { start: startDate, end: endDate },
      topTags,
      dailyBreakdown: dailyBreakdownArray
    };
  }

  private convertToEnhancedCSV(exportData: ExportData): string {
    let csv = '';

    // Add summary if included
    if (exportData.summary) {
      csv += '# ChronoFlow Export Summary\n';
      csv += `# Export Date: ${new Date().toISOString().split('T')[0]}\n`;
      csv += `# Total Activities: ${exportData.summary.totalActivities}\n`;
      csv += `# Total Time: ${Math.floor(exportData.summary.totalTimeMinutes / 60)}h ${exportData.summary.totalTimeMinutes % 60}m\n`;
      csv += `# Date Range: ${exportData.summary.dateRange.start} to ${exportData.summary.dateRange.end}\n`;
      csv += '\n';
    }

    // Main activities data
    const headers = ['ID', 'Activity', 'Description', 'Tags', 'Start', 'End', 'Duration (minutes)', 'Date'];
    const csvRows = [headers.join(',')];

    exportData.activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : null;
      const duration = endTime 
        ? Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
        : 'Ongoing';
      
      const tags = activity.tags ? activity.tags.join(';') : '';
      
      const row = [
        activity.id || '',
        `"${(activity.activity || '').replace(/"/g, '""')}"`,
        `"${(activity.description || '').replace(/"/g, '""')}"`,
        `"${tags}"`,
        startTime.toISOString(),
        endTime ? endTime.toISOString() : '',
        duration,
        `${activity.year}-${String(activity.month).padStart(2, '0')}-${String(activity.day).padStart(2, '0')}`
      ];
      csvRows.push(row.join(','));
    });

    csv += csvRows.join('\n');

    // Add summary tables if included
    if (exportData.summary) {
      csv += '\n\n# Top Tags by Time\n';
      csv += 'Tag,Count,Time (minutes)\n';
      exportData.summary.topTags.forEach(tag => {
        csv += `"${tag.tag}",${tag.count},${tag.timeMinutes}\n`;
      });

      csv += '\n# Daily Breakdown\n';
      csv += 'Date,Activities,Time (minutes)\n';
      exportData.summary.dailyBreakdown.forEach(day => {
        csv += `${day.date},${day.activities},${day.timeMinutes}\n`;
      });
    }

    return csv;
  }

  private convertToPDF(exportData: ExportData): string {
    // Simple PDF generation using HTML-to-PDF approach
    // For a real implementation, you'd want to use a proper PDF library
    // This is a simplified version that creates HTML content for PDF conversion
    const summary = exportData.summary;
    const activities = exportData.activities;

    let htmlContent = `
      <html>
        <head>
          <title>ChronoFlow Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f5f5f5; padding: 20px; margin-bottom: 30px; }
            .activity-table { width: 100%; border-collapse: collapse; }
            .activity-table th, .activity-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .activity-table th { background-color: #ff7000; color: white; }
            .tag { background: #fef3e2; color: #ea580c; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ChronoFlow Time Tracking Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
    `;

    if (summary) {
      const totalHours = Math.floor(summary.totalTimeMinutes / 60);
      const totalMinutes = summary.totalTimeMinutes % 60;
      
      htmlContent += `
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Period:</strong> ${summary.dateRange.start} to ${summary.dateRange.end}</p>
            <p><strong>Total Activities:</strong> ${summary.totalActivities}</p>
            <p><strong>Total Time:</strong> ${totalHours}h ${totalMinutes}m</p>
          </div>
      `;
    }

    htmlContent += `
          <h2>Activities</h2>
          <table class="activity-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Tags</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
    `;

    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : null;
      const duration = endTime 
        ? `${Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))}m`
        : 'Ongoing';
      
      const tagsHtml = activity.tags 
        ? activity.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')
        : '';

      htmlContent += `
              <tr>
                <td>${activity.activity}</td>
                <td>${tagsHtml}</td>
                <td>${startTime.toLocaleString()}</td>
                <td>${endTime ? endTime.toLocaleString() : 'Ongoing'}</td>
                <td>${duration}</td>
              </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Note: This returns HTML content. In a real implementation, you'd convert this to PDF
    // For now, we'll return the HTML content which can be saved as an HTML file
    // that can be opened in a browser and printed to PDF
    return htmlContent;
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const optionsPage = new OptionsPage();
  await optionsPage.init();
});