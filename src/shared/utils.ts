/**
 * Shared utility functions for the time tracker
 */

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getCurrentDuration(startTime: Date): string {
  return formatDuration(startTime, new Date());
}

export function parseTimeInput(timeStr: string): Date | null {
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const match = timeStr.match(timeRegex);
  
  if (!match) return null;
  
  const hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function isValidTimeFormat(timeStr: string): boolean {
  return parseTimeInput(timeStr) !== null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function createDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}