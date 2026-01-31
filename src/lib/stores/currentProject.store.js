import { writable } from 'svelte/store';
import projectsService from '$lib/services/projects.service.js';
import chaptersService from '$lib/services/chapters.service.js';
import rulesService from '$lib/services/rules.service.js';

function createCurrentProjectStore() {
  const { subscribe, set, update } = writable({
    project: null,
    chapters: [],
    rules: null,
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    async load(projectId) {
      update(s => ({ ...s, loading: true, error: null }));
      
      try {
        const [project, chapters, rules] = await Promise.all([
          projectsService.getProject(projectId),
          chaptersService.getChaptersByProject(projectId),
          rulesService.getRules(projectId)
        ]);

        if (!project) {
          throw new Error('پروژه یافت نشد');
        }

        set({
          project,
          chapters,
          rules: rules || rulesService.getDefaultRules(),
          loading: false,
          error: null
        });

        return { project, chapters, rules };
      } catch (error) {
        update(s => ({ ...s, loading: false, error: error.message }));
        return null;
      }
    },

    async updateProject(updates) {
      let current;
      const unsub = subscribe(value => {
        current = value;
      });
      unsub();

      if (!current?.project) return null;

      const project = await projectsService.updateProject(current.project.id, updates);
      update(s => ({ ...s, project }));
      return project;
    },

    async addChapter(chapterData) {
      let current;
      const unsub = subscribe(value => {
        current = value;
      });
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

    async saveRules(rulesData) {
      let current;
      const unsub = subscribe(value => {
        current = value;
      });
      unsub();

      if (!current?.project) return null;

      const rules = await rulesService.saveRules(current.project.id, rulesData);
      update(s => ({ ...s, rules }));
      return rules;
    },

    clear() {
      set({
        project: null,
        chapters: [],
        rules: null,
        loading: false,
        error: null
      });
    }
  };
}

export const currentProjectStore = createCurrentProjectStore();
export default currentProjectStore;
