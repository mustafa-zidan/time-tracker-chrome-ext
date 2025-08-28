# Pharaohs Time Tracker

> A modern Chrome extension for tracking time spent on different projects and activities

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-username/pharaohs-time-tracker)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-green.svg)](LICENSE)

## Overview

Pharaoh Time Tracker is a completely modernized Chrome extension that helps you track time spent on different projects and activities. If you're familiar with the Linux Hamster time tracker, this extension brings similar functionality to your browser with a modern, responsive interface.

**Key Benefits:**
- Track activities with start/stop functionality
- View daily activity lists with duration calculations
- Navigate through historical data with date picker
- Edit and manage activities with modern modal interfaces
- Export data in JSON or CSV formats for reporting
- Duplicate frequently used activities with double-click
- Real-time badge updates showing current activity duration

## Features

### Core Functionality
- **Activity Tracking**: Start and stop activities with real-time duration tracking
- **Modern UI**: Responsive popup interface with date navigation
- **Activity Management**: Edit, delete, and duplicate activities
- **Historical View**: Browse activities by date with calendar picker
- **Duration Display**: Real-time badge updates and formatted duration display

### Data Management
- **Export Options**: Export data as JSON or CSV for reporting
- **Import Capability**: Import existing data from JSON files
- **Statistics Dashboard**: View comprehensive usage analytics
- **Data Backup**: Settings and data synchronization via Chrome Storage

### Modern Enhancements
- **Manifest V3**: Uses latest Chrome Extension architecture
- **TypeScript**: Fully typed codebase for better maintainability
- **Responsive Design**: Works on different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Error Handling**: Comprehensive validation and user feedback

## Quick Start

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/pharaohs-time-tracker.git
   cd pharaohs-time-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist/` folder

### Development

1. **Start development build:**
   ```bash
   npm run dev
   ```
   This starts webpack in watch mode for automatic rebuilding.

2. **Run tests:**
   ```bash
   npm test              # Run all tests
   npm run test:watch    # Watch mode for development
   npm run test:coverage # Generate coverage report
   ```

3. **Code quality:**
   ```bash
   npm run lint          # ESLint checks
   npm run format        # Format code with Prettier
   npm run type-check    # TypeScript type checking
   ```

## Architecture

### Technology Stack
- **TypeScript**: Strongly typed JavaScript with ES2020+ features
- **Webpack**: Module bundler with development and production builds
- **IndexedDB**: Modern client-side database (replaces deprecated WebSQL)
- **Chrome Extension API v3**: Latest extension APIs with service workers
- **Jest**: Comprehensive testing framework with Chrome extension mocks
- **ESLint + Prettier**: Code quality and formatting tools

### Project Structure
```
src/
├── background/         # Service worker for background operations
│   └── background.ts   # Badge updates, notifications, message handling
├── popup/             # Main extension popup interface
│   ├── popup.html     # Popup UI structure
│   ├── popup.css      # Modern responsive styles
│   └── popup.ts       # Popup logic and interactions
├── options/           # Settings and data management page
│   ├── options.html   # Options page UI
│   ├── options.css    # Options page styles
│   └── options.ts     # Settings and export/import logic
└── shared/            # Shared utilities and database layer
    ├── database.ts    # IndexedDB wrapper and data models
    └── utils.ts       # Shared utility functions

tests/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for user workflows
└── mocks/            # Chrome extension API mocks
```

### Database Schema
```typescript
interface Activity {
  id?: number;
  activity: string;
  description?: string;
  start: Date;
  end?: Date;
  day: number;
  month: number;
  year: number;
}
```

## Usage

### Basic Time Tracking

1. **Start an activity:**
   - Enter activity name in the popup
   - Click "Start Tracking"
   - Extension badge shows elapsed time

2. **Stop tracking:**
   - Click "Stop Tracking" in popup
   - Activity is saved with duration

3. **View activities:**
   - Use date picker to navigate days
   - See list of activities with durations
   - Total time displayed at bottom

### Advanced Features

1. **Edit activities:**
   - Click edit icon on any activity
   - Modify name, times, or description
   - Mark as "in progress" for ongoing activities

2. **Duplicate activities:**
   - Double-click any completed activity
   - Creates new activity with same name
   - Useful for recurring tasks

3. **Data management:**
   - Access options page for settings
   - Export data as JSON or CSV
   - View comprehensive statistics
   - Import existing data

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Individual component testing with Jest
- **Integration Tests**: User workflow testing with mocked DOM
- **Chrome Extension Mocks**: Proper mocking of Chrome APIs
- **Coverage Reports**: Detailed coverage analysis

```bash
# Run specific test suites
npm test -- --testPathPattern=utils    # Test utilities only
npm test -- --testPathPattern=database # Test database only
npm test -- --watch                    # Interactive watch mode
```

##  Development

### Adding Features

1. **Database changes**: Modify `Activity` interface in `src/shared/database.ts`
2. **UI updates**: Update popup or options HTML/CSS/TypeScript files  
3. **Background logic**: Add functionality to `src/background/background.ts`
4. **Build & test**: Run `npm run dev` and `npm test`

### Debugging

- **Service Worker**: `chrome://extensions/` → Extension → "service worker"
- **Popup**: Right-click extension icon → "Inspect popup"
- **Options**: Right-click options page → "Inspect"
- **Storage**: Chrome DevTools → Application → Storage → IndexedDB

## Scripts Reference

| Command                 | Description                       |
|-------------------------|-----------------------------------|
| `npm run build`         | Production build for distribution |
| `npm run dev`           | Development build with watch mode |
| `npm run lint`          | ESLint code quality checks        |
| `npm run format`        | Prettier code formatting          |
| `npm run type-check`    | TypeScript type checking          |
| `npm test`              | Run all tests                     |
| `npm run test:watch`    | Tests in watch mode               |
| `npm run test:coverage` | Coverage report generation        |
| `npm run test:ci`       | CI environment testing            |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Run code quality checks: `npm run lint && npm run type-check`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## License

This project is licensed under the BSD-3-Clause License—see the [LICENSE](LICENSE) file for details.

## Authors

- **Mustafa Zidan** - [mustafa.zidan@gmail.com](mailto:mustafa.zidan@gmail.com)
- **Mohamed Emad** - [emadhegab@gmail.com](mailto:emadhegab@gmail.com)

## Migration from V1

This version represents a complete rewrite from the legacy V1 extension:

- **Manifest V1 → V3**: Modern Chrome extension architecture
- **jQuery → Vanilla TypeScript**: Better performance and maintainability
- **WebSQL → IndexedDB**: Future-proof data storage
- **Direct files → Webpack**: Professional build system
- **No tests → Comprehensive testing**: 80%+ test coverage

Existing user data can be migrated using the export/import functionality in the options page.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/pharaohs-time-tracker/issues)
- **Documentation**: This README and inline code documentation
- **Extension Help**: Click "?" in the extension popup for usage tips

---

*Made with ❤️ for productivity enthusiasts who want to track their time effectively.*