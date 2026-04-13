import db from '$lib/db/index.js';

export const foldersService = {
  async getAllFolders() {
    return await db.folders.orderBy('name').toArray();
  },

  async getFolder(id) {
    return await db.folders.get(id);
  },

  async getFoldersByParent(parentId = null) {
    return await db.folders.where('parentId').equals(parentId).sortBy('name');
  },

  async createFolder(name, parentId = null) {
    const now = new Date().toISOString();
    const folder = {
      name: name.trim(),
      parentId,
      createdAt: now,
      updatedAt: now
    };
    const id = await db.folders.add(folder);
    return { ...folder, id };
  },

  async updateFolder(id, updates) {
    const plainUpdates = JSON.parse(JSON.stringify(updates));
    await db.folders.update(id, { ...plainUpdates, updatedAt: new Date().toISOString() });
    return this.getFolder(id);
  },

  async deleteFolder(id) {
    // Move all projects in this folder to root
    await db.projects.where('folderId').equals(id).modify({ folderId: null });
    // Move sub-folders to root (one level only — we keep it simple)
    await db.folders.where('parentId').equals(id).modify({ parentId: null });
    await db.folders.delete(id);
  },

  async getProjectsInFolder(folderId) {
    return await db.projects.where('folderId').equals(folderId).toArray();
  },

  async getFolderPath(folderId) {
    // Returns breadcrumb array: [{ id, name }, ...]
    const path = [];
    let current = folderId;
    const visited = new Set();
    while (current !== null && current !== undefined) {
      if (visited.has(current)) break;
      visited.add(current);
      const folder = await db.folders.get(current);
      if (!folder) break;
      path.unshift({ id: folder.id, name: folder.name });
      current = folder.parentId;
    }
    return path;
  }
};

export default foldersService;
