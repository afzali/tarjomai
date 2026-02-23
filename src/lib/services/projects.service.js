import db from '$lib/db/index.js';

export const projectsService = {
  async getAllProjects() {
    return await db.projects.orderBy('updatedAt').reverse().toArray();
  },

  async getProject(id) {
    return await db.projects.get(id);
  },

  async createProject(projectData) {
    // Convert Svelte 5 Proxy to plain object
    const plainData = JSON.parse(JSON.stringify(projectData));
    const now = new Date().toISOString();
    const project = {
      ...plainData,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      setupStep: 'created', // 'created' | 'analyze' | 'compare' | 'quick-setup' | 'completed'
      wizardData: {
        analyze: { sampleText: '', result: null },
        compare: { sampleText: '', results: [], judgeResults: null },
        quickSetup: { model: '', rules: null }
      },
      chapters: []
    };
    const id = await db.projects.add(project);
    return { ...project, id };
  },

  async updateSetupStep(id, step) {
    await db.projects.update(id, { setupStep: step, updatedAt: new Date() });
    return this.getProject(id);
  },

  async saveWizardStepData(id, stepName, data) {
    const project = await this.getProject(id);
    const wizardData = project?.wizardData || {};
    
    // Convert data to plain object to handle Svelte 5 proxies
    const plainData = JSON.parse(JSON.stringify(data));
    
    wizardData[stepName] = { ...wizardData[stepName], ...plainData };
    
    // Also ensure wizardData itself is clean (though it should be if project comes from db)
    const cleanWizardData = JSON.parse(JSON.stringify(wizardData));
    
    await db.projects.update(id, { wizardData: cleanWizardData, updatedAt: new Date().toISOString() });
    return this.getProject(id);
  },

  async getWizardStepData(id, stepName) {
    const project = await this.getProject(id);
    return project?.wizardData?.[stepName] || null;
  },

  getNextSetupStep(currentStep, isGuided = true) {
    const guidedPath = ['created', 'analyze', 'compare', 'completed'];
    const quickPath = ['created', 'quick-setup', 'completed'];
    const path = isGuided ? guidedPath : quickPath;
    const currentIndex = path.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= path.length - 1) return null;
    return path[currentIndex + 1];
  },

  getSetupStepUrl(projectId, step) {
    const stepUrls = {
      'created': `/projects/${projectId}/analyze`,
      'analyze': `/projects/${projectId}/analyze`,
      'compare': `/projects/${projectId}/compare`,
      'quick-setup': `/projects/${projectId}/quick-setup`,
      'completed': `/projects/${projectId}`
    };
    return stepUrls[step] || `/projects/${projectId}`;
  },

  async updateProject(id, updates) {
    // Convert Svelte 5 Proxy to plain object
    const plainUpdates = JSON.parse(JSON.stringify(updates));
    await db.projects.update(id, { ...plainUpdates, updatedAt: new Date().toISOString() });
    return this.getProject(id);
  },

  async deleteProject(id) {
    await db.chapters.where('projectId').equals(id).delete();
    await db.translationRules.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  },

  async exportProject(id) {
    const project = await this.getProject(id);
    const chapters = await db.chapters.where('projectId').equals(id).toArray();
    const rules = await db.translationRules.where('projectId').equals(id).first();

    // Collect reviewMessages for all chapters
    const chapterIds = chapters.map(c => c.id);
    const reviewMessages = chapterIds.length > 0
      ? await db.reviewMessages.where('chapterId').anyOf(chapterIds).toArray()
      : [];

    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      project,
      chapters,
      translationRules: rules,
      reviewMessages
    };
  },

  async exportProjects(ids) {
    const items = [];
    for (const id of ids) {
      items.push(await this.exportProject(id));
    }
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      projects: items
    };
  },

  async importProject(data, addSuffix = true) {
    const { project, chapters, translationRules, reviewMessages } = data;

    const now = new Date().toISOString();
    const projectData = {
      ...project,
      id: undefined,
      title: addSuffix ? project.title + ' (وارد شده)' : project.title,
      createdAt: now,
      updatedAt: now
    };
    const id = await db.projects.add(projectData);
    const newProject = { ...projectData, id };

    // Map old chapter ids to new ones for reviewMessages
    const chapterIdMap = {};

    if (chapters && chapters.length > 0) {
      for (const chapter of chapters) {
        const oldId = chapter.id;
        const newId = await db.chapters.add({
          ...chapter,
          id: undefined,
          projectId: newProject.id
        });
        chapterIdMap[oldId] = newId;
      }
    }

    if (translationRules) {
      await db.translationRules.add({
        ...translationRules,
        id: undefined,
        projectId: newProject.id
      });
    }

    if (reviewMessages && reviewMessages.length > 0) {
      for (const msg of reviewMessages) {
        const newChapterId = chapterIdMap[msg.chapterId];
        if (newChapterId) {
          await db.reviewMessages.add({
            ...msg,
            id: undefined,
            chapterId: newChapterId
          });
        }
      }
    }

    return newProject;
  },

  async importProjects(data) {
    const items = data.projects || [data];
    const imported = [];
    for (const item of items) {
      imported.push(await this.importProject(item, true));
    }
    return imported;
  }
};

export default projectsService;
