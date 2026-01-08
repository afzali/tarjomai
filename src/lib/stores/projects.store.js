import { writable } from 'svelte/store';
import projectsService from '$lib/services/projects.service.js';

function createProjectsStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    
    async load() {
      const projects = await projectsService.getAllProjects();
      set(projects);
      return projects;
    },

    async create(projectData) {
      const project = await projectsService.createProject(projectData);
      update(projects => [project, ...projects]);
      return project;
    },

    async update(id, updates) {
      const project = await projectsService.updateProject(id, updates);
      update(projects => projects.map(p => p.id === id ? project : p));
      return project;
    },

    async delete(id) {
      await projectsService.deleteProject(id);
      update(projects => projects.filter(p => p.id !== id));
    },

    async export(id) {
      return await projectsService.exportProject(id);
    },

    async import(data) {
      const project = await projectsService.importProject(data);
      update(projects => [project, ...projects]);
      return project;
    }
  };
}

export const projectsStore = createProjectsStore();
export default projectsStore;
