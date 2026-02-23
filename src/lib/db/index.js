import Dexie from 'dexie';

export const db = new Dexie('tarjomai');

db.version(1).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt',
  chapters: '++id, projectId, order, status',
  translationRules: '++id, projectId, name, isPreset',
  presets: '++id, name, createdAt'
});

db.version(2).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt',
  chapters: '++id, projectId, order, status',
  translationRules: '++id, projectId, name, isPreset',
  presets: '++id, name, createdAt',
  usageHistory: '++id, model, timestamp, projectId'
});

db.version(3).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt, setupStep',
  chapters: '++id, projectId, order, status',
  translationRules: '++id, projectId, name, isPreset',
  presets: '++id, name, createdAt',
  usageHistory: '++id, model, timestamp, projectId'
});

db.version(4).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt, setupStep',
  chapters: '++id, projectId, order, status',
  translationRules: '++id, projectId, name, isPreset',
  presets: '++id, name, createdAt',
  usageHistory: '++id, model, timestamp, projectId',
  reviewMessages: '++id, chapterId, role, createdAt'
});

// Setup steps: 'created' -> 'analyze' -> 'compare' -> 'completed'
// Or quick path: 'created' -> 'quick-setup' -> 'completed'

export default db;
