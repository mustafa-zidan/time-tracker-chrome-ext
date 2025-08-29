/**
 * Modern options page for Chrome Extension
 * Handles settings, data management, and enhanced analytics dashboard
 */

import { db, Activity } from '../shared/database';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Filler
} from 'chart.js';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Filler
);

interface Settings {
  enableNotifications: boolean;
  autoHideNotifications: boolean;
}

interface Statistics {
  totalActivities: number;
  totalTimeMinutes: number;
  avgDailyMinutes: number;
  activeDays: number;
  topActivity: string;
  topActivityTime: number;
  productivityScore: number;
  trends: {
    activitiesChange: number;
    timeChange: number;
    dailyChange: number;
    daysChange: number;
  };
}

interface AnalyticsData {
  dailyTime: { date: string; minutes: number }[];
  activityDistribution: { activity: string; minutes: number }[];
  weeklyHeatmap: { week: number; day: number; minutes: number }[];
  topTags: { tag: string; minutes: number }[];
}

interface ProductivityInsight {
  type: 'positive' | 'warning' | 'info';
  text: string;
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
  private analyticsTimeRange: number = 30;
  private charts: { [key: string]: Chart } = {};

  async init(): Promise<void> {
    try {
      await db.init();
      await this.loadSettings();
      await this.loadAvailableTags();
      this.bindEvents();
      this.initializeExportFilters();
      await this.loadEnhancedAnalytics();
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

    // Enhanced Analytics
    document.getElementById('refreshAnalytics')?.addEventListener('click', () => this.loadEnhancedAnalytics());
    document.getElementById('analyticsTimeRange')?.addEventListener('change', () => this.onTimeRangeChange());

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

  private async loadEnhancedAnalytics(): Promise<void> {
    const refreshBtn = document.getElementById('refreshAnalytics') as HTMLButtonElement;
    
    try {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Loading...';

      const stats = await this.calculateEnhancedStatistics();
      const analyticsData = await this.generateAnalyticsData();
      
      this.updateStatisticsUI(stats);
      this.renderCharts(analyticsData);
      this.generateProductivityInsights(stats, analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.showToast('Failed to load analytics', 'error');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Analytics';
    }
  }

  private onTimeRangeChange(): void {
    const timeRangeSelect = document.getElementById('analyticsTimeRange') as HTMLSelectElement;
    this.analyticsTimeRange = parseInt(timeRangeSelect.value);
    this.loadEnhancedAnalytics();
  }

  private async calculateEnhancedStatistics(): Promise<Statistics> {
    const activities = await this.getActivitiesForTimeRange();
    const allActivities = await this.getAllActivities();
    
    // Calculate current period stats
    const currentStats = this.calculateStatsForActivities(activities);
    
    // Calculate previous period for trends (same duration, but shifted back)
    const periodDays = this.analyticsTimeRange || 365;
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (periodDays * 2));
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - periodDays);
    
    const previousActivities = allActivities.filter(activity => {
      const activityDate = new Date(activity.start);
      return activityDate >= previousStartDate && activityDate < previousEndDate;
    });
    
    const previousStats = this.calculateStatsForActivities(previousActivities);
    
    // Calculate trends
    const trends = {
      activitiesChange: this.calculatePercentageChange(previousStats.totalActivities, currentStats.totalActivities),
      timeChange: this.calculatePercentageChange(previousStats.totalTimeMinutes, currentStats.totalTimeMinutes),
      dailyChange: this.calculatePercentageChange(previousStats.avgDailyMinutes, currentStats.avgDailyMinutes),
      daysChange: this.calculatePercentageChange(previousStats.activeDays, currentStats.activeDays)
    };
    
    // Find top activity
    const activityTimes = new Map<string, number>();
    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      
      const current = activityTimes.get(activity.activity) || 0;
      activityTimes.set(activity.activity, current + durationMinutes);
    });
    
    const topActivityEntry = Array.from(activityTimes.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    const topActivity = topActivityEntry ? topActivityEntry[0] : 'No activities';
    const topActivityTime = topActivityEntry ? topActivityEntry[1] : 0;
    
    // Calculate productivity score (0-100)
    const productivityScore = this.calculateProductivityScore(activities);
    
    return {
      ...currentStats,
      topActivity,
      topActivityTime,
      productivityScore,
      trends
    };
  }

  private calculateStatsForActivities(activities: Activity[]) {
    let totalTimeMinutes = 0;
    const activeDaysSet = new Set<string>();

    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      totalTimeMinutes += Math.floor(durationMs / (1000 * 60));

      const dateKey = `${activity.year}-${activity.month}-${activity.day}`;
      activeDaysSet.add(dateKey);
    });

    const activeDays = activeDaysSet.size;
    const avgDailyMinutes = activeDays > 0 ? Math.round(totalTimeMinutes / activeDays) : 0;

    return {
      totalActivities: activities.length,
      totalTimeMinutes,
      avgDailyMinutes,
      activeDays
    };
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  private calculateProductivityScore(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    let score = 0;
    let factors = 0;
    
    // Factor 1: Consistency (daily activity)
    const days = this.analyticsTimeRange || 30;
    const activeDays = new Set(activities.map(a => `${a.year}-${a.month}-${a.day}`)).size;
    const consistencyScore = Math.min((activeDays / days) * 100, 100);
    score += consistencyScore * 0.3;
    factors += 0.3;
    
    // Factor 2: Average session length (optimal around 25-90 minutes)
    const totalMinutes = activities.reduce((sum, activity) => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      return sum + Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }, 0);
    
    const avgSessionLength = totalMinutes / activities.length;
    let sessionScore = 0;
    if (avgSessionLength >= 25 && avgSessionLength <= 90) {
      sessionScore = 100;
    } else if (avgSessionLength > 90) {
      sessionScore = Math.max(50, 100 - ((avgSessionLength - 90) / 2));
    } else {
      sessionScore = (avgSessionLength / 25) * 100;
    }
    score += sessionScore * 0.3;
    factors += 0.3;
    
    // Factor 3: Tag usage (organization)
    const taggedActivities = activities.filter(a => a.tags && a.tags.length > 0).length;
    const organizationScore = (taggedActivities / activities.length) * 100;
    score += organizationScore * 0.2;
    factors += 0.2;
    
    // Factor 4: Activity variety
    const uniqueActivities = new Set(activities.map(a => a.activity)).size;
    const varietyScore = Math.min((uniqueActivities / 10) * 100, 100);
    score += varietyScore * 0.2;
    factors += 0.2;
    
    return Math.round(score / factors);
  }

  private async getActivitiesForTimeRange(): Promise<Activity[]> {
    const activities = await this.getAllActivities();
    
    if (this.analyticsTimeRange === 0) {
      return activities;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.analyticsTimeRange);
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.start);
      return activityDate >= cutoffDate;
    });
  }

  private updateStatisticsUI(stats: Statistics): void {
    // Update values
    this.updateStatValue('totalActivities', stats.totalActivities.toLocaleString());
    this.updateStatValue('totalTime', this.formatDuration(stats.totalTimeMinutes));
    this.updateStatValue('avgDaily', this.formatDuration(stats.avgDailyMinutes));
    this.updateStatValue('activeDays', stats.activeDays.toString());
    this.updateStatValue('topActivity', stats.topActivity.length > 15 ? 
      stats.topActivity.substring(0, 15) + '...' : stats.topActivity);
    this.updateStatValue('productivity', `${stats.productivityScore}%`);
    
    // Update trends
    this.updateTrend('activitiesTrend', stats.trends.activitiesChange);
    this.updateTrend('timeTrend', stats.trends.timeChange);
    this.updateTrend('dailyTrend', stats.trends.dailyChange);
    this.updateTrend('daysTrend', stats.trends.daysChange);
    this.updateTrend('topActivityTime', stats.topActivityTime, 'time');
    this.updateTrend('productivityTrend', stats.trends.activitiesChange); // Use activities trend as proxy for productivity trend
  }
  
  private updateStatValue(elementId: string, value: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }
  
  private updateTrend(elementId: string, change: number, type: 'percentage' | 'time' = 'percentage'): void {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (type === 'time') {
      element.textContent = this.formatDuration(change);
      element.className = 'stat-trend neutral';
      return;
    }
    
    const prefix = change > 0 ? '+' : '';
    element.textContent = `${prefix}${change}%`;
    
    if (change > 0) {
      element.className = 'stat-trend positive';
    } else if (change < 0) {
      element.className = 'stat-trend negative';
    } else {
      element.className = 'stat-trend neutral';
    }
  }
  
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
      await this.loadEnhancedAnalytics();
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
      await this.loadEnhancedAnalytics();
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

  private async generateAnalyticsData(): Promise<AnalyticsData> {
    const activities = await this.getActivitiesForTimeRange();
    
    // Generate daily time data
    const dailyTime = this.generateDailyTimeData(activities);
    
    // Generate activity distribution
    const activityDistribution = this.generateActivityDistribution(activities);
    
    // Generate weekly heatmap (simplified)
    const weeklyHeatmap = this.generateWeeklyHeatmap(activities);
    
    // Generate top tags
    const topTags = this.generateTopTagsData(activities);
    
    return {
      dailyTime,
      activityDistribution,
      weeklyHeatmap,
      topTags
    };
  }

  private generateDailyTimeData(activities: Activity[]): { date: string; minutes: number }[] {
    const dailyMap = new Map<string, number>();
    
    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      const dateKey = `${activity.year}-${String(activity.month).padStart(2, '0')}-${String(activity.day).padStart(2, '0')}`;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + durationMinutes);
    });
    
    // Fill in missing days with 0
    const days = this.analyticsTimeRange || 30;
    const result: { date: string; minutes: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0]!;
      result.push({
        date: dateKey,
        minutes: dailyMap.get(dateKey) || 0
      });
    }
    
    return result;
  }

  private generateActivityDistribution(activities: Activity[]): { activity: string; minutes: number }[] {
    const activityMap = new Map<string, number>();
    
    activities.forEach(activity => {
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      activityMap.set(activity.activity, (activityMap.get(activity.activity) || 0) + durationMinutes);
    });
    
    return Array.from(activityMap.entries())
      .map(([activity, minutes]) => ({ activity, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
  }

  private generateWeeklyHeatmap(activities: Activity[]): { week: number; day: number; minutes: number }[] {
    // Simplified heatmap - just return last 4 weeks
    const result: { week: number; day: number; minutes: number }[] = [];
    const now = new Date();
    
    for (let week = 0; week < 4; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (week * 7 + day));
        
        const dayActivities = activities.filter(activity => {
          const activityDate = new Date(activity.start);
          return activityDate.toDateString() === date.toDateString();
        });
        
        const minutes = dayActivities.reduce((sum, activity) => {
          const startTime = new Date(activity.start);
          const endTime = activity.end ? new Date(activity.end) : new Date();
          return sum + Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        }, 0);
        
        result.push({ week, day, minutes });
      }
    }
    
    return result;
  }

  private generateTopTagsData(activities: Activity[]): { tag: string; minutes: number }[] {
    const tagMap = new Map<string, number>();
    
    activities.forEach(activity => {
      if (!activity.tags) return;
      
      const startTime = new Date(activity.start);
      const endTime = activity.end ? new Date(activity.end) : new Date();
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      activity.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + durationMinutes);
      });
    });
    
    return Array.from(tagMap.entries())
      .map(([tag, minutes]) => ({ tag, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);
  }

  private renderCharts(analyticsData: AnalyticsData): void {
    this.destroyExistingCharts();
    
    this.renderDailyTimeChart(analyticsData.dailyTime);
    this.renderActivityPieChart(analyticsData.activityDistribution);
    this.renderWeeklyHeatmapChart(analyticsData.weeklyHeatmap);
    this.renderTagsBarChart(analyticsData.topTags);
  }

  private destroyExistingCharts(): void {
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  private renderDailyTimeChart(dailyData: { date: string; minutes: number }[]): void {
    const ctx = document.getElementById('dailyTimeChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.charts.dailyTime = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dailyData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Time Tracked (hours)',
          data: dailyData.map(d => Math.round(d.minutes / 6) / 10), // Convert to hours with 1 decimal
          borderColor: '#ff7000',
          backgroundColor: 'rgba(255, 112, 0, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          }
        }
      }
    });
  }

  private renderActivityPieChart(activityData: { activity: string; minutes: number }[]): void {
    const ctx = document.getElementById('activityPieChart') as HTMLCanvasElement;
    if (!ctx) return;

    const colors = [
      '#ff7000', '#e85d00', '#ffaa55', '#cc4400', '#ff8833',
      '#b83d00', '#ff9966', '#994400', '#ffcc99', '#662200'
    ];

    this.charts.activityPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: activityData.map(a => a.activity.length > 20 ? a.activity.substring(0, 20) + '...' : a.activity),
        datasets: [{
          data: activityData.map(a => Math.round(a.minutes / 6) / 10), // Convert to hours
          backgroundColor: colors.slice(0, activityData.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return `${label}: ${value}h`;
              }
            }
          }
        }
      }
    });
  }

  private renderWeeklyHeatmapChart(heatmapData: { week: number; day: number; minutes: number }[]): void {
    const ctx = document.getElementById('weeklyHeatmapChart') as HTMLCanvasElement;
    if (!ctx) return;

    // Create a simple heatmap using bar chart
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Group by day of week
    const dayTotals = new Array(7).fill(0);
    heatmapData.forEach(data => {
      dayTotals[data.day] += data.minutes;
    });

    this.charts.weeklyHeatmap = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Time Tracked (hours)',
          data: dayTotals.map(minutes => Math.round(minutes / 6) / 10),
          backgroundColor: days.map((_, i) => {
            const intensity = dayTotals[i] / Math.max(...dayTotals);
            const opacity = Math.max(0.2, intensity);
            return `rgba(255, 112, 0, ${opacity})`;
          }),
          borderColor: '#ff7000',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          }
        }
      }
    });
  }

  private renderTagsBarChart(tagData: { tag: string; minutes: number }[]): void {
    const ctx = document.getElementById('tagsBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.charts.tagsBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: tagData.map(t => t.tag),
        datasets: [{
          label: 'Time Tracked (hours)',
          data: tagData.map(t => Math.round(t.minutes / 6) / 10),
          backgroundColor: 'rgba(255, 112, 0, 0.8)',
          borderColor: '#ff7000',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          },
          x: {
            ticks: {
              maxRotation: 45
            }
          }
        }
      }
    });
  }

  private generateProductivityInsights(stats: Statistics, _analyticsData: AnalyticsData): void {
    const insights: ProductivityInsight[] = [];
    
    // Analyze consistency
    const activeDaysRatio = stats.activeDays / (this.analyticsTimeRange || 30);
    if (activeDaysRatio > 0.8) {
      insights.push({
        type: 'positive',
        text: `Excellent consistency! You've been active on ${Math.round(activeDaysRatio * 100)}% of days.`
      });
    } else if (activeDaysRatio < 0.3) {
      insights.push({
        type: 'warning',
        text: `Low activity consistency. Try to track time more regularly to improve insights.`
      });
    }
    
    // Analyze productivity score
    if (stats.productivityScore >= 80) {
      insights.push({
        type: 'positive',
        text: `Outstanding productivity score of ${stats.productivityScore}%! You're managing time very well.`
      });
    } else if (stats.productivityScore >= 60) {
      insights.push({
        type: 'info',
        text: `Good productivity score of ${stats.productivityScore}%. Consider using more tags for better organization.`
      });
    } else {
      insights.push({
        type: 'warning',
        text: `Productivity score of ${stats.productivityScore}% suggests room for improvement. Focus on consistent tracking and session lengths.`
      });
    }
    
    // Analyze session patterns
    const avgSession = stats.totalTimeMinutes / stats.totalActivities;
    if (avgSession < 15) {
      insights.push({
        type: 'info',
        text: 'Your sessions are quite short. Consider grouping related activities for better focus.'
      });
    } else if (avgSession > 120) {
      insights.push({
        type: 'warning',
        text: 'Your sessions are very long. Taking breaks can improve productivity and focus.'
      });
    } else {
      insights.push({
        type: 'positive',
        text: `Great session length! Average of ${Math.round(avgSession)} minutes is ideal for focused work.`
      });
    }
    
    // Analyze trends
    if (stats.trends.timeChange > 20) {
      insights.push({
        type: 'positive',
        text: `Impressive growth! Your tracked time increased by ${stats.trends.timeChange}% compared to the previous period.`
      });
    } else if (stats.trends.timeChange < -20) {
      insights.push({
        type: 'info',
        text: `Tracked time decreased by ${Math.abs(stats.trends.timeChange)}%. This might indicate changing priorities or schedule.`
      });
    }
    
    // Analyze top activity
    if (stats.topActivityTime > stats.totalTimeMinutes * 0.5) {
      insights.push({
        type: 'info',
        text: `"${stats.topActivity}" dominates your time (${Math.round(stats.topActivityTime / 60)}h). Consider diversifying activities.`
      });
    }
    
    // Default insight if none generated
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        text: 'Keep tracking your activities to get personalized insights about your productivity patterns.'
      });
    }
    
    this.renderProductivityInsights(insights);
  }

  private renderProductivityInsights(insights: ProductivityInsight[]): void {
    const container = document.getElementById('productivityInsights');
    if (!container) return;
    
    container.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <div class="insight-icon ${insight.type}">
          ${insight.type === 'positive' ? '✓' : insight.type === 'warning' ? '!' : 'i'}
        </div>
        <span class="insight-text">${insight.text}</span>
      </div>
    `).join('');
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const optionsPage = new OptionsPage();
  await optionsPage.init();
});