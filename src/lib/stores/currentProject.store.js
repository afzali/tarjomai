import { writable } from 'svelte/store';
import projectsService from '$lib/services/projects.service.js';
import chaptersService from '$lib/services/chapters.service.js';
import operationConfigService from '$lib/services/operationConfig.service.js';

function createCurrentProjectStore() {
  const { subscribe, set, update } = writable({
    project: null,
    chapters: [],
    config: null,   // was 'rules' — now holds operationConfig for any operation type
    loading: false,
    error: null
  });

  function getDefaultConfig(operationType) {
    if (operationType === 'editorial') {
      return operationConfigService.getDefaultEditorialConfig();
    }
    return operationConfigService.getDefaultTranslationConfig();
  }

  return {
    subscribe,

    async load(projectId) {
      update(s => ({ ...s, loading: true, error: null }));

      try {
        const [project, chapters, config] = await Promise.all([
          projectsService.getProject(projectId),
          chaptersService.getChaptersByProject(projectId),
          operationConfigService.getConfig(projectId)
        ]);

        if (!project) {
          throw new Error('پروژه یافت نشد');
        }

        const resolvedConfig = config || getDefaultConfig(project.operationType || 'translation');

        set({
          project,
          chapters,
          config: resolvedConfig,
          loading: false,
          error: null
        });

        return { project, chapters, config: resolvedConfig };
      } catch (error) {
        update(s => ({ ...s, loading: false, error: error.message }));
        return null;
      }
    },

    async updateProject(updates) {
      let current;
      const unsub = subscribe(value => { current = value; });
      unsub();

      if (!current?.project) return null;

      const project = await projectsService.updateProject(current.project.id, updates);
      update(s => ({ ...s, project }));
      return project;
    },

    async addChapter(chapterData) {
      let current;
      const unsub = subscribe(value => { current = value; });
      unsub();

      if (!current?.project) return null;

      const chapter = await chaptersService.createChapter({
        ...chapterData,
        projectId: current.project.id
      });

      update(s => ({ ...s, chapters: [...s.chapters, chapter] }));
      return chapter;
    },

    async updateChapter(chapterId, updates) {
      const chapter = await chaptersService.updateChapter(chapterId, updates);
      update(s => ({
        ...s,
        chapters: s.chapters.map(c => c.id === chapterId ? chapter : c)
      }));
      return chapter;
    },

    async deleteChapter(chapterId) {
      await chaptersService.deleteChapter(chapterId);
      update(s => ({
        ...s,
        chapters: s.chapters.filter(c => c.id !== chapterId)
      }));
    },

    // Save operation config (works for translation and editorial)
    async saveConfig(configData) {
      let current;
      const unsub = subscribe(value => { current = value; });
      unsub();

      if (!current?.project) return null;

      const config = await operationConfigService.saveConfig(current.project.id, configData);
      update(s => ({ ...s, config }));
      return config;
    },

    // Backward-compat alias used by translation wizard pages
    async saveRules(rulesData) {
      return this.saveConfig({
        ...rulesData,
        operationType: rulesData.operationType || 'translation'
      });
    },

    clear() {
      set({
        project: null,
        chapters: [],
        config: null,
        loading: false,
        error: null
      });
    }
  };
}

export const currentProjectStore = createCurrentProjectStore();
export default currentProjectStore;
