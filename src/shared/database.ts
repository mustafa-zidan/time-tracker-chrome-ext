/**
 * Modern IndexedDB wrapper for time tracking data
 * Replaces the legacy WebSQL implementation
 */

export interface Activity {
  id?: number;
  activity: string;
  description?: string;
  tags?: string[];
  start: Date;
  end?: Date;
  day: number;
  month: number;
  year: number;
}

export class TimeTrackerDB {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'TimeTrackerDB';
  private readonly version = 2;
  private readonly storeName = 'activities';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;
        
        let store: IDBObjectStore;
        
        if (oldVersion < 1) {
          // Initial database creation
          store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Create indexes for efficient querying
          store.createIndex('date', ['year', 'month', 'day']);
          store.createIndex('activity', 'activity');
          store.createIndex('start', 'start');
        } else {
          // Get an existing store for migrations
          store = transaction.objectStore(this.storeName);
        }
        
        if (oldVersion < 2) {
          // Version 2: Add tag support
          // Create a tag index for filtering
          if (!store.indexNames.contains('tags')) {
            store.createIndex('tags', 'tags', { multiEntry: true });
          }
          
          // Migration: Add empty tags array to existing activities
          store.openCursor().onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
            if (cursor) {
              const activity = cursor.value;
              if (!activity.tags) {
                activity.tags = [];
                cursor.update(activity);
              }
              cursor.continue();
            }
          };
        }
      };
    });
  }

  async addActivity(activity: Omit<Activity, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(activity);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async updateActivity(id: number, updates: Partial<Activity>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const activity = getRequest.result;
        if (!activity) {
          reject(new Error('Activity not found'));
          return;
        }

        const updatedActivity = { ...activity, ...updates };
        const updateRequest = store.put(updatedActivity);
        
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteActivity(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getActivitiesByDate(date: Date): Promise<Activity[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('date');
      
      const keyRange = IDBKeyRange.only([
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      ]);
      
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const activities = request.result.sort((a, b) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        resolve(activities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getCurrentActivity(): Promise<Activity | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const activities = request.result;
        const currentActivity = activities.find(activity => !activity.end);
        resolve(currentActivity || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async stopCurrentActivity(): Promise<void> {
    const currentActivity = await this.getCurrentActivity();
    if (currentActivity && currentActivity.id) {
      await this.updateActivity(currentActivity.id, { 
        end: new Date() 
      });
    }
  }

  async getActivitiesByDateAndTags(date: Date, tags: string[] = []): Promise<Activity[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let activities = request.result.filter((activity: Activity) => {
          const activityDate = new Date(activity.start);
          return activityDate.getFullYear() === date.getFullYear() &&
                 activityDate.getMonth() === date.getMonth() &&
                 activityDate.getDate() === date.getDate();
        });

        // Filter by tags if provided
        if (tags.length > 0) {
          activities = activities.filter((activity: Activity) =>
            tags.every(tag => activity.tags && activity.tags.includes(tag))
          );
        }

        activities.sort((a, b) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        
        resolve(activities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTags(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const allTags = new Set<string>();
        request.result.forEach((activity: Activity) => {
          if (activity.tags) {
            activity.tags.forEach(tag => allTags.add(tag));
          }
        });
        
        resolve(Array.from(allTags).sort());
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const db = new TimeTrackerDB();