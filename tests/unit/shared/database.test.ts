/**
 * Unit tests for database layer
 */

import { TimeTrackerDB, Activity } from '../../../src/shared/database';

describe('TimeTrackerDB', () => {
  let db: TimeTrackerDB;

  beforeEach(async () => {
    db = new TimeTrackerDB();
    await db.init();
  });

  afterEach(() => {
    // Clean up IndexedDB
    indexedDB.deleteDatabase('TimeTrackerDB');
  });

  describe('init', () => {
    it('should initialize the database successfully', async () => {
      const newDb = new TimeTrackerDB();
      await expect(newDb.init()).resolves.not.toThrow();
    });

    it('should create the activities object store', async () => {
      // Database should be initialized and ready to use
      const activity: Omit<Activity, 'id'> = {
        activity: 'Test Activity',
        start: new Date(),
        day: 1,
        month: 1,
        year: 2024,
      };

      await expect(db.addActivity(activity)).resolves.toBeDefined();
    });
  });

  describe('addActivity', () => {
    it('should add a new activity and return its ID', async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'Test Activity',
        description: 'Test description',
        start: new Date('2024-01-01T10:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };

      const id = await db.addActivity(activity);
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should handle activities without description', async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'Simple Activity',
        start: new Date('2024-01-01T10:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };

      const id = await db.addActivity(activity);
      expect(id).toBeDefined();
    });

    it('should reject if database is not initialized', async () => {
      const uninitializedDb = new TimeTrackerDB();
      const activity: Omit<Activity, 'id'> = {
        activity: 'Test Activity',
        start: new Date(),
        day: 1,
        month: 1,
        year: 2024,
      };

      await expect(uninitializedDb.addActivity(activity)).rejects.toThrow('Database not initialized');
    });
  });

  describe('updateActivity', () => {
    let activityId: number;

    beforeEach(async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'Original Activity',
        start: new Date('2024-01-01T10:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };
      activityId = await db.addActivity(activity);
    });

    it('should update an existing activity', async () => {
      const updates = {
        activity: 'Updated Activity',
        end: new Date('2024-01-01T11:00:00Z'),
        description: 'Updated description',
      };

      await expect(db.updateActivity(activityId, updates)).resolves.not.toThrow();
    });

    it('should reject for non-existent activity', async () => {
      const nonExistentId = 999;
      const updates = { activity: 'Updated Activity' };

      await expect(db.updateActivity(nonExistentId, updates)).rejects.toThrow('Activity not found');
    });

    it('should reject if database is not initialized', async () => {
      const uninitializedDb = new TimeTrackerDB();
      await expect(uninitializedDb.updateActivity(1, {})).rejects.toThrow('Database not initialized');
    });
  });

  describe('deleteActivity', () => {
    let activityId: number;

    beforeEach(async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'To be deleted',
        start: new Date('2024-01-01T10:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };
      activityId = await db.addActivity(activity);
    });

    it('should delete an existing activity', async () => {
      await expect(db.deleteActivity(activityId)).resolves.not.toThrow();
    });

    it('should handle deleting non-existent activity gracefully', async () => {
      const nonExistentId = 999;
      await expect(db.deleteActivity(nonExistentId)).resolves.not.toThrow();
    });

    it('should reject if database is not initialized', async () => {
      const uninitializedDb = new TimeTrackerDB();
      await expect(uninitializedDb.deleteActivity(1)).rejects.toThrow('Database not initialized');
    });
  });

  describe('getActivitiesByDate', () => {
    beforeEach(async () => {
      // Add test activities for different dates
      const activities = [
        {
          activity: 'Activity 1',
          start: new Date('2024-01-01T10:00:00Z'),
          day: 1,
          month: 1,
          year: 2024,
        },
        {
          activity: 'Activity 2',
          start: new Date('2024-01-01T14:00:00Z'),
          end: new Date('2024-01-01T15:00:00Z'),
          day: 1,
          month: 1,
          year: 2024,
        },
        {
          activity: 'Different Day Activity',
          start: new Date('2024-01-02T10:00:00Z'),
          day: 2,
          month: 1,
          year: 2024,
        },
      ];

      for (const activity of activities) {
        await db.addActivity(activity);
      }
    });

    it('should return activities for specific date', async () => {
      const date = new Date('2024-01-01');
      const activities = await db.getActivitiesByDate(date);

      expect(activities).toHaveLength(2);
      expect(activities[0].activity).toBe('Activity 1');
      expect(activities[1].activity).toBe('Activity 2');
    });

    it('should return empty array for date with no activities', async () => {
      const date = new Date('2024-01-03');
      const activities = await db.getActivitiesByDate(date);

      expect(activities).toHaveLength(0);
    });

    it('should sort activities by start time', async () => {
      const date = new Date('2024-01-01');
      const activities = await db.getActivitiesByDate(date);

      expect(activities).toHaveLength(2);
      expect(new Date(activities[0].start).getTime()).toBeLessThan(
        new Date(activities[1].start).getTime()
      );
    });
  });

  describe('getCurrentActivity', () => {
    it('should return null when no current activity', async () => {
      const currentActivity = await db.getCurrentActivity();
      expect(currentActivity).toBeNull();
    });

    it('should return activity without end time', async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'Current Activity',
        start: new Date('2024-01-01T10:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };

      await db.addActivity(activity);
      const currentActivity = await db.getCurrentActivity();

      expect(currentActivity).not.toBeNull();
      expect(currentActivity!.activity).toBe('Current Activity');
      expect(currentActivity!.end).toBeUndefined();
    });

    it('should return null when all activities have end times', async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'Completed Activity',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };

      await db.addActivity(activity);
      const currentActivity = await db.getCurrentActivity();

      expect(currentActivity).toBeNull();
    });
  });

  describe('stopCurrentActivity', () => {
    it('should do nothing when no current activity', async () => {
      await expect(db.stopCurrentActivity()).resolves.not.toThrow();
    });

    it('should stop the current activity by setting end time', async () => {
      const activity: Omit<Activity, 'id'> = {
        activity: 'Activity to Stop',
        start: new Date('2024-01-01T10:00:00Z'),
        day: 1,
        month: 1,
        year: 2024,
      };

      const activityId = await db.addActivity(activity);
      await db.stopCurrentActivity();

      const currentActivity = await db.getCurrentActivity();
      expect(currentActivity).toBeNull();

      // Verify the activity now has an end time
      const date = new Date('2024-01-01');
      const activities = await db.getActivitiesByDate(date);
      expect(activities).toHaveLength(1);
      expect(activities[0].end).toBeDefined();
      expect(activities[0].end).toBeInstanceOf(Date);
    });
  });
});