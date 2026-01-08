import { writable } from 'svelte/store';

function createUIStore() {
  const { subscribe, set, update } = writable({
    showOnboarding: false,
    sidebarOpen: true,
    theme: 'light',
    isLoading: false,
    loadingMessage: '',
    toast: null
  });

  return {
    subscribe,
    
    setOnboarding(show) {
      update(s => ({ ...s, showOnboarding: show }));
    },

    toggleSidebar() {
      update(s => ({ ...s, sidebarOpen: !s.sidebarOpen }));
    },

    setSidebarOpen(open) {
      update(s => ({ ...s, sidebarOpen: open }));
    },

    setTheme(theme) {
      update(s => ({ ...s, theme }));
    },

    setLoading(isLoading, message = '') {
      update(s => ({ ...s, isLoading, loadingMessage: message }));
    },

    showToast(message, type = 'info', duration = 3000) {
      update(s => ({ ...s, toast: { message, type, duration } }));
      setTimeout(() => {
        update(s => ({ ...s, toast: null }));
      }, duration);
    },

    clearToast() {
      update(s => ({ ...s, toast: null }));
    }
  };
}

export const uiStore = createUIStore();
export default uiStore;
