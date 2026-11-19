export const PREFS_KEY = 'onefly_dashboard_prefs_v1';
export const VALID_LAYOUTS = new Set(['classic', 'split', 'dock']);
export const DEFAULT_DASHBOARD_PREFS = {
  layout: 'classic',
  showLeft: true,
  showKpis: true,
  showRight: true,
  zen: false,
  autoRotate: true,
};

export function loadDashboardPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_DASHBOARD_PREFS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_DASHBOARD_PREFS };
    return {
      layout: VALID_LAYOUTS.has(parsed.layout) ? parsed.layout : DEFAULT_DASHBOARD_PREFS.layout,
      showLeft: typeof parsed.showLeft === 'boolean' ? parsed.showLeft : DEFAULT_DASHBOARD_PREFS.showLeft,
      showKpis: typeof parsed.showKpis === 'boolean' ? parsed.showKpis : DEFAULT_DASHBOARD_PREFS.showKpis,
      showRight: typeof parsed.showRight === 'boolean' ? parsed.showRight : DEFAULT_DASHBOARD_PREFS.showRight,
      zen: typeof parsed.zen === 'boolean' ? parsed.zen : DEFAULT_DASHBOARD_PREFS.zen,
      autoRotate: typeof parsed.autoRotate === 'boolean' ? parsed.autoRotate : DEFAULT_DASHBOARD_PREFS.autoRotate,
    };
  } catch {
    return { ...DEFAULT_DASHBOARD_PREFS };
  }
}

export function saveDashboardPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      layout: VALID_LAYOUTS.has(prefs?.layout) ? prefs.layout : DEFAULT_DASHBOARD_PREFS.layout,
      showLeft: Boolean(prefs?.showLeft),
      showKpis: Boolean(prefs?.showKpis),
      showRight: Boolean(prefs?.showRight),
      zen: Boolean(prefs?.zen),
      autoRotate: Boolean(prefs?.autoRotate),
    }));
  } catch {
    // Ignore storage errors in restricted environments
  }
}
