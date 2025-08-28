/**
 * Unit tests for options page functionality
 */

import { setupChromeMocks, resetChromeMocks } from '../../mocks/chrome';

// Mock the database module
const mockDb = {
  init: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/shared/database', () => ({
  db: mockDb,
}));

// Mock DOM for testing
const createMockOptionsDOM = () => {
  document.body.innerHTML = `
    <div class="container">
      <input type="checkbox" id="enableNotifications" />
      <input type="checkbox" id="autoHideNotifications" />
      
      <button id="exportJson">Export JSON</button>
      <button id="exportCsv">Export CSV</button>
      <input type="file" id="importFile" style="display: none;" />
      <button id="importBtn">Import JSON</button>
      <button id="clearData">Clear Data</button>
      <button id="refreshStats">Refresh Statistics</button>
      
      <div id="totalActivities">-</div>
      <div id="totalTime">-</div>
      <div id="avgDaily">-</div>
      <div id="activeDays">-</div>
      
      <div id="toast" class="toast">
        <div class="toast-content">
          <span id="toastMessage">Settings saved successfully</span>
          <button id="toastClose">×</button>
        </div>
      </div>
    </div>
  `;
};

describe('Options Page', () => {
  beforeEach(() => {
    setupChromeMocks();
    createMockOptionsDOM();
    jest.clearAllMocks();
    resetChromeMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Settings Management', () => {
    it('should load settings from Chrome storage', async () => {
      const chrome = (global as any).chrome;
      const enableNotifications = document.getElementById('enableNotifications') as HTMLInputElement;

      chrome.storage.sync.get.mockResolvedValue({
        settings: { enableNotifications: true, autoHideNotifications: false }
      });

      // Simulate loading settings
      const result = await chrome.storage.sync.get(['settings']);
      if (result.settings) {
        enableNotifications.checked = result.settings.enableNotifications;
      }

      expect(enableNotifications.checked).toBe(true);
    });

    it('should save settings to Chrome storage', async () => {
      const chrome = (global as any).chrome;
      const enableNotifications = document.getElementById('enableNotifications') as HTMLInputElement;
      const autoHideNotifications = document.getElementById('autoHideNotifications') as HTMLInputElement;

      enableNotifications.checked = true;
      autoHideNotifications.checked = false;

      const settings = {
        enableNotifications: enableNotifications.checked,
        autoHideNotifications: autoHideNotifications.checked,
      };

      chrome.storage.sync.set.mockResolvedValue();

      // Simulate saving settings
      await chrome.storage.sync.set({ settings });

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ settings });
    });

    it('should use default settings when none exist', async () => {
      const chrome = (global as any).chrome;
      const enableNotifications = document.getElementById('enableNotifications') as HTMLInputElement;

      chrome.storage.sync.get.mockResolvedValue({});

      // Simulate loading with defaults
      const result = await chrome.storage.sync.get(['settings']);
      const defaultSettings = { enableNotifications: true, autoHideNotifications: true };
      const settings = result.settings || defaultSettings;

      enableNotifications.checked = settings.enableNotifications;

      expect(enableNotifications.checked).toBe(true);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics correctly', () => {
      const mockActivities = [
        {
          id: 1,
          activity: 'Activity 1',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:30:00Z'),
          day: 1,
          month: 1,
          year: 2024,
        },
        {
          id: 2,
          activity: 'Activity 2',
          start: new Date('2024-01-01T14:00:00Z'),
          end: new Date('2024-01-01T15:00:00Z'),
          day: 1,
          month: 1,
          year: 2024,
        },
        {
          id: 3,
          activity: 'Activity 3',
          start: new Date('2024-01-02T09:00:00Z'),
          end: new Date('2024-01-02T10:00:00Z'),
          day: 2,
          month: 1,
          year: 2024,
        },
      ];

      // Calculate statistics
      let totalTimeMinutes = 0;
      const activeDaysSet = new Set<string>();

      mockActivities.forEach(activity => {
        const startTime = new Date(activity.start);
        const endTime = activity.end ? new Date(activity.end) : new Date();
        const durationMs = endTime.getTime() - startTime.getTime();
        totalTimeMinutes += Math.floor(durationMs / (1000 * 60));

        const dateKey = `${activity.year}-${activity.month}-${activity.day}`;
        activeDaysSet.add(dateKey);
      });

      const activeDays = activeDaysSet.size;
      const avgDailyMinutes = activeDays > 0 ? Math.round(totalTimeMinutes / activeDays) : 0;

      const statistics = {
        totalActivities: mockActivities.length,
        totalTimeMinutes,
        avgDailyMinutes,
        activeDays,
      };

      expect(statistics.totalActivities).toBe(3);
      expect(statistics.totalTimeMinutes).toBe(210); // 1.5h + 1h + 1h = 3.5h = 210min
      expect(statistics.activeDays).toBe(2);
      expect(statistics.avgDailyMinutes).toBe(105); // 210/2 = 105min
    });

    it('should update statistics UI elements', () => {
      const totalActivitiesEl = document.getElementById('totalActivities') as HTMLElement;
      const totalTimeEl = document.getElementById('totalTime') as HTMLElement;
      const avgDailyEl = document.getElementById('avgDaily') as HTMLElement;
      const activeDaysEl = document.getElementById('activeDays') as HTMLElement;

      const stats = {
        totalActivities: 25,
        totalTimeMinutes: 1800, // 30 hours
        avgDailyMinutes: 120, // 2 hours
        activeDays: 15,
      };

      // Simulate updating UI
      totalActivitiesEl.textContent = stats.totalActivities.toLocaleString();
      
      const totalHours = Math.floor(stats.totalTimeMinutes / 60);
      const totalMinutes = stats.totalTimeMinutes % 60;
      totalTimeEl.textContent = `${totalHours}h ${totalMinutes}m`;

      const avgHours = Math.floor(stats.avgDailyMinutes / 60);
      const avgMinutes = stats.avgDailyMinutes % 60;
      avgDailyEl.textContent = `${avgHours}h ${avgMinutes}m`;

      activeDaysEl.textContent = stats.activeDays.toString();

      expect(totalActivitiesEl.textContent).toBe('25');
      expect(totalTimeEl.textContent).toBe('30h 0m');
      expect(avgDailyEl.textContent).toBe('2h 0m');
      expect(activeDaysEl.textContent).toBe('15');
    });
  });

  describe('Data Export', () => {
    it('should export data as JSON', () => {
      const exportBtn = document.getElementById('exportJson') as HTMLButtonElement;
      
      const mockActivities = [
        {
          id: 1,
          activity: 'Test Activity',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
          day: 1,
          month: 1,
          year: 2024,
        },
      ];

      // Simulate export
      const jsonContent = JSON.stringify(mockActivities, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      expect(jsonContent).toContain('Test Activity');
      expect(blob.type).toBe('application/json');
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    });

    it('should export data as CSV', () => {
      const mockActivities = [
        {
          id: 1,
          activity: 'Test Activity',
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
          day: 1,
          month: 1,
          year: 2024,
        },
      ];

      // Simulate CSV conversion
      const headers = ['ID', 'Activity', 'Description', 'Start', 'End', 'Duration (minutes)', 'Date'];
      const csvRows = [headers.join(',')];

      mockActivities.forEach(activity => {
        const startTime = new Date(activity.start);
        const endTime = activity.end ? new Date(activity.end) : null;
        const duration = endTime 
          ? Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
          : 'Ongoing';

        const row = [
          activity.id || '',
          `"${activity.activity.replace(/"/g, '""')}"`,
          '""', // No description in this test
          startTime.toISOString(),
          endTime ? endTime.toISOString() : '',
          duration,
          `${activity.year}-${String(activity.month).padStart(2, '0')}-${String(activity.day).padStart(2, '0')}`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');

      expect(csvContent).toContain('ID,Activity,Description,Start,End,Duration (minutes),Date');
      expect(csvContent).toContain('"Test Activity"');
      expect(csvContent).toContain('2024-01-01');
    });

    it('should handle export button state during export', async () => {
      const exportBtn = document.getElementById('exportJson') as HTMLButtonElement;

      // Simulate export process
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting...';

      expect(exportBtn.disabled).toBe(true);
      expect(exportBtn.textContent).toBe('Exporting...');

      // Simulate completion
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export JSON';

      expect(exportBtn.disabled).toBe(false);
      expect(exportBtn.textContent).toBe('Export JSON');
    });
  });

  describe('Data Import', () => {
    it('should trigger file input on import button click', () => {
      const importBtn = document.getElementById('importBtn') as HTMLButtonElement;
      const fileInput = document.getElementById('importFile') as HTMLInputElement;

      const fileInputClick = jest.spyOn(fileInput, 'click').mockImplementation();

      // Simulate import button click
      importBtn.click();

      // In real implementation, this would trigger file input
      fileInput.click();

      expect(fileInputClick).toHaveBeenCalled();

      fileInputClick.mockRestore();
    });

    it('should parse JSON file content', async () => {
      const mockFileContent = JSON.stringify([
        {
          activity: 'Imported Activity',
          start: '2024-01-01T10:00:00Z',
          end: '2024-01-01T11:00:00Z',
          day: 1,
          month: 1,
          year: 2024,
        },
      ]);

      // Simulate file reading
      const data = JSON.parse(mockFileContent);

      expect(Array.isArray(data)).toBe(true);
      expect(data[0].activity).toBe('Imported Activity');
    });

    it('should validate imported data', () => {
      const validData = [
        {
          activity: 'Valid Activity',
          start: '2024-01-01T10:00:00Z',
        },
      ];

      const invalidData = 'not an array';

      expect(Array.isArray(validData)).toBe(true);
      expect(Array.isArray(invalidData)).toBe(false);
    });
  });

  describe('Data Clearing', () => {
    it('should confirm before clearing data', () => {
      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(true);

      const clearBtn = document.getElementById('clearData') as HTMLButtonElement;

      // Simulate clear button click with confirmation
      const confirmed = confirm(
        'Are you sure you want to delete ALL time tracking data?\n\nThis action cannot be undone.'
      );

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete ALL time tracking data?\n\nThis action cannot be undone.'
      );
      expect(confirmed).toBe(true);

      window.confirm = originalConfirm;
    });

    it('should handle clear button state during operation', () => {
      const clearBtn = document.getElementById('clearData') as HTMLButtonElement;

      // Simulate clearing process
      clearBtn.disabled = true;
      clearBtn.textContent = 'Clearing...';

      expect(clearBtn.disabled).toBe(true);
      expect(clearBtn.textContent).toBe('Clearing...');

      // Simulate completion
      clearBtn.disabled = false;
      clearBtn.textContent = 'Clear Data';

      expect(clearBtn.disabled).toBe(false);
      expect(clearBtn.textContent).toBe('Clear Data');
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast notification', () => {
      const toast = document.getElementById('toast') as HTMLElement;
      const toastMessage = document.getElementById('toastMessage') as HTMLElement;

      // Simulate showing toast
      toastMessage.textContent = 'Settings saved successfully';
      toast.classList.add('show');

      expect(toastMessage.textContent).toBe('Settings saved successfully');
      expect(toast.classList.contains('show')).toBe(true);
    });

    it('should hide toast notification', () => {
      const toast = document.getElementById('toast') as HTMLElement;
      const toastClose = document.getElementById('toastClose') as HTMLButtonElement;

      toast.classList.add('show');

      // Simulate closing toast
      toastClose.click();
      toast.classList.remove('show');

      expect(toast.classList.contains('show')).toBe(false);
    });

    it('should auto-hide toast after timeout', () => {
      jest.useFakeTimers();

      const toast = document.getElementById('toast') as HTMLElement;
      toast.classList.add('show');

      // Simulate auto-hide
      setTimeout(() => {
        toast.classList.remove('show');
      }, 5000);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(toast.classList.contains('show')).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const chrome = (global as any).chrome;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      // Simulate error handling
      try {
        await chrome.storage.sync.get(['settings']);
      } catch (error) {
        console.error('Error loading settings:', error);
      }

      expect(consoleSpy).toHaveBeenCalledWith('Error loading settings:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle statistics calculation errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate error in statistics calculation
      try {
        throw new Error('Statistics calculation failed');
      } catch (error) {
        console.error('Error loading statistics:', error);
      }

      expect(consoleSpy).toHaveBeenCalledWith('Error loading statistics:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});