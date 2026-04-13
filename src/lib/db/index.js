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

// v5: Add operationType + folderId to projects, add operationConfig and folders tables
// Keep translationRules alive so upgrade transaction can read from it
db.version(5).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt, setupStep, operationType, folderId',
  chapters: '++id, projectId, order, status',
  translationRules: '++id, projectId, name, isPreset',
  operationConfig: '++id, projectId, operationType, name, isPreset',
  presets: '++id, name, createdAt, operationType',
  usageHistory: '++id, model, timestamp, projectId',
  reviewMessages: '++id, chapterId, role, createdAt',
  folders: '++id, name, parentId, createdAt, updatedAt'
}).upgrade(async (tx) => {
  try {
    // 1. Backfill all projects with operationType = 'translation' and folderId = null
    await tx.table('projects').toCollection().modify((project) => {
      if (!project.operationType) {
        project.operationType = 'translation';
      }
      if (project.folderId === undefined) {
        project.folderId = null;
      }
    });

    // 2. Migrate translationRules → operationConfig
    const rules = await tx.table('translationRules').toArray();
    for (const rule of rules) {
      const { id: _id, ...ruleData } = rule;
      await tx.table('operationConfig').add({
        ...ruleData,
        operationType: 'translation'
      });
    }

    // 3. Rename chapters.translatedText → chapters.outputText and add segmentData
    await tx.table('chapters').toCollection().modify((chapter) => {
      if ('translatedText' in chapter) {
        chapter.outputText = chapter.translatedText;
        delete chapter.translatedText;
      }
      if (chapter.outputText === undefined) {
        chapter.outputText = '';
      }
      if (chapter.segmentData === undefined) {
        chapter.segmentData = null;
      }
    });
  } catch (err) {
    console.error('[DB v5 upgrade] Migration failed:', err);
    throw err;
  }
});

// v6: Drop the now-migrated translationRules table
db.version(6).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt, setupStep, operationType, folderId',
  chapters: '++id, projectId, order, status',
  translationRules: null,
  operationConfig: '++id, projectId, operationType, name, isPreset',
  presets: '++id, name, createdAt, operationType',
  usageHistory: '++id, model, timestamp, projectId',
  reviewMessages: '++id, chapterId, role, createdAt',
  folders: '++id, name, parentId, createdAt, updatedAt'
});

// v7: add chapterId + date to usageHistory for per-chapter/per-day cost tracking
db.version(7).stores({
  settings: '++id',
  projects: '++id, title, createdAt, updatedAt, setupStep, operationType, folderId',
  chapters: '++id, projectId, order, status',
  operationConfig: '++id, projectId, operationType, name, isPreset',
  presets: '++id, name, createdAt, operationType',
  usageHistory: '++id, model, timestamp, projectId, chapterId, date',
  reviewMessages: '++id, chapterId, role, createdAt',
  folders: '++id, name, parentId, createdAt, updatedAt'
});

// Setup steps:
// Translation guided:  'created' -> 'analyze' -> 'compare' -> 'completed'
// Translation quick:   'created' -> 'quick-setup' -> 'completed'
// Editorial:           'created' -> 'editorial-setup' -> 'completed'

export default db;
