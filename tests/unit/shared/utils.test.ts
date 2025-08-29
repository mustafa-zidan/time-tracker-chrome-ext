/**
 * Unit tests for shared utility functions
 */

import {
  formatTime,
  formatDuration,
  getCurrentDuration,
  parseTimeInput,
  isValidTimeFormat,
  debounce,
  sanitizeInput,
  createDateKey,
} from '../../../src/shared/utils';

describe('Utility Functions', () => {
  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-01-01T14:30:00Z');
      const result = formatTime(date);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should use 24-hour format', () => {
      const date = new Date('2024-01-01T22:15:00Z');
      const result = formatTime(date);
      expect(result).not.toContain('PM');
      expect(result).not.toContain('AM');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in minutes for short periods', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T10:30:00Z');
      const result = formatDuration(start, end);
      expect(result).toBe('30m');
    });

    it('should format duration with hours and minutes', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T12:30:00Z');
      const result = formatDuration(start, end);
      expect(result).toBe('2h 30m');
    });

    it('should handle exact hours', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T12:00:00Z');
      const result = formatDuration(start, end);
      expect(result).toBe('2h 0m');
    });
  });

  describe('getCurrentDuration', () => {
    it('should calculate duration from start time to now', () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const result = getCurrentDuration(startTime);
      expect(result).toMatch(/\d+m/);
    });
  });

  describe('parseTimeInput', () => {
    it('should parse valid time format', () => {
      const result = parseTimeInput('14:30');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
    });

    it('should handle single digit hours', () => {
      const result = parseTimeInput('9:15');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(15);
    });

    it('should return null for invalid format', () => {
      expect(parseTimeInput('25:00')).toBeNull();
      expect(parseTimeInput('12:60')).toBeNull();
      expect(parseTimeInput('invalid')).toBeNull();
      expect(parseTimeInput('12')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(parseTimeInput('00:00')).toBeInstanceOf(Date);
      expect(parseTimeInput('23:59')).toBeInstanceOf(Date);
      expect(parseTimeInput('-1:30')).toBeNull();
    });
  });

  describe('isValidTimeFormat', () => {
    it('should validate correct time formats', () => {
      expect(isValidTimeFormat('14:30')).toBe(true);
      expect(isValidTimeFormat('09:15')).toBe(true);
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(isValidTimeFormat('25:00')).toBe(false);
      expect(isValidTimeFormat('12:60')).toBe(false);
      expect(isValidTimeFormat('invalid')).toBe(false);
      expect(isValidTimeFormat('12')).toBe(false);
      expect(isValidTimeFormat('')).toBe(false);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      jest.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeInput('hello <script> world')).toBe('hello script world');
      expect(sanitizeInput('<div>content</div>')).toBe('divcontent/div');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should preserve normal text', () => {
      expect(sanitizeInput('Normal text with numbers 123')).toBe('Normal text with numbers 123');
    });
  });

  describe('createDateKey', () => {
    it('should create consistent date key', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = createDateKey(date);
      expect(result).toBe('2024-1-15');
    });

    it('should handle different dates consistently', () => {
      const date1 = new Date('2024-12-31T12:00:00'); // Use local time
      const date2 = new Date('2024-01-01T12:00:00'); // Use local time
      
      expect(createDateKey(date1)).toBe('2024-12-31');
      expect(createDateKey(date2)).toBe('2024-1-1');
    });
  });
});