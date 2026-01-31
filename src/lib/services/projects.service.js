import db from '$lib/db/index.js';

export const projectsService = {
  async getAllProjects() {
    return await db.projects.orderBy('updatedAt').reverse().toArray();
  },

  async getProject(id) {
    return await db.projects.get(id);
  },

  async createProject(projectData) {
    const now = new Date();
    const project = {
      ...projectData,
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
    wizardData[stepName] = { ...wizardData[stepName], ...data };
    await db.projects.update(id, { wizardData, updatedAt: new Date() });
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
    await db.projects.update(id, { ...updates, updatedAt: new Date() });
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
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project,
      chapters,
      translationRules: rules
    };
  },

  async importProject(data) {
    const { project, chapters, translationRules } = data;
    
    const newProject = await this.createProject({
      title: project.title + ' (imported)',
      description: project.description,
      sourceLanguage: project.sourceLanguage,
      targetLanguage: project.targetLanguage,
      defaultModel: project.defaultModel
    });

    if (chapters && chapters.length > 0) {
      for (const chapter of chapters) {
        await db.chapters.add({
          ...chapter,
          id: undefined,
          projectId: newProject.id
        });
      }
    }

    if (translationRules) {
      await db.translationRules.add({
        ...translationRules,
        id: undefined,
        projectId: newProject.id
      });
    }

    return newProject;
  }
};

export default projectsService;
