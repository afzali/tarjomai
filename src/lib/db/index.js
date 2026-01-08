import Dexie from 'dexie';

export const db = new Dexie('tarjomai');

db.version(1).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt',
  chapters: '++id, projectId, order, status',
  translationRules: '++id, projectId, name, isPreset',
  presets: '++id, name, createdAt'
});

export default db;
