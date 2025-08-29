/**
 * Chrome extension API mocks for testing
 */

export const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onStartup: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    onSuspend: {
      addListener: jest.fn(),
    },
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
};

export const setupChromeMocks = () => {
  (global as any).chrome = mockChrome;
  
  // Default mock implementations
  mockChrome.storage.sync.get.mockResolvedValue({});
  mockChrome.storage.sync.set.mockResolvedValue(undefined);
  mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
  mockChrome.action.setBadgeText.mockResolvedValue(undefined);
  mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);
  mockChrome.notifications.create.mockResolvedValue('notification-id');
  mockChrome.notifications.clear.mockResolvedValue(true);
};

export const resetChromeMocks = () => {
  Object.values(mockChrome).forEach(api => {
    if (typeof api === 'object') {
      Object.values(api).forEach(method => {
        if (typeof method === 'function' && 'mockClear' in method) {
          (method as jest.Mock).mockClear();
        } else if (typeof method === 'object') {
          Object.values(method).forEach(subMethod => {
            if (typeof subMethod === 'function' && 'mockClear' in subMethod) {
              (subMethod as jest.Mock).mockClear();
            }
          });
        }
      });
    }
  });
};