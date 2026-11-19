import { VALID_LAYOUTS } from './storage.js';

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function initToolbar(options) {
  const {
    dashboardPrefs,
    saveDashboardPrefs,
    getControls,
    getSelectedRegion,
    onLayoutChange,
    onResetGlobeView,
    onEscapeRegion,
  } = options;

  const appEl = $('#app');
  const headerEl = $('.header');
  const kpisEl = $('#kpis');
  const colLeftEl = $('#col-left');
  const colRightEl = $('#col-right');
  const layoutBtns = Array.from(document.querySelectorAll('#control-toolbar [data-layout]'));
  const btnToggleLeft = $('#btn-toggle-left');
  const btnToggleKpis = $('#btn-toggle-kpis');
  const btnToggleRight = $('#btn-toggle-right');
  const btnToggleZen = $('#btn-toggle-zen');
  const btnZenRestore = $('#btn-zen-restore');
  const btnGlobeRotate = $('#btn-globe-rotate');
  const btnGlobeReset = $('#btn-globe-reset');
  const btnFullscreen = $('#btn-fullscreen');
  const clockTimeEl = $('#clock-time');
  const clockDateEl = $('#clock-date');

  // ===================== Fullscreen =====================
  const getFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

  function syncFullscreenState() {
    const isFs = Boolean(getFullscreenElement());
    if (btnFullscreen) {
      btnFullscreen.classList.toggle('active', isFs);
      btnFullscreen.setAttribute('aria-pressed', String(isFs));
      btnFullscreen.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'Enter Fullscreen');
      btnFullscreen.setAttribute('data-tooltip', isFs ? 'Exit Fullscreen (Esc / F)' : 'Enter Fullscreen (F)');
    }
  }

  function toggleFullscreen() {
    const fsEl = getFullscreenElement();
    const op = fsEl
      ? (document.exitFullscreen?.() || document.webkitExitFullscreen?.())
      : (document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.());
    if (op && typeof op.catch === 'function') op.catch(() => {});
  }

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  syncFullscreenState();

  // ===================== Clock =====================
  function tickClock() {
    const d = new Date();
    if (clockTimeEl) {
      clockTimeEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    if (clockDateEl) {
      clockDateEl.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${WEEK[d.getDay()]}`;
    }
  }
  setInterval(tickClock, 1000);
  tickClock();

  // ===================== Layout, Panel Visibility & Zen Mode =====================
  function setRegionHidden(el, hidden) {
    if (!el) return;
    if (hidden && document.activeElement && el.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    el.setAttribute('aria-hidden', String(hidden));
    el.inert = hidden;
  }

  function syncPanelToggleBtn(btn, visible, showLabel, hideLabel) {
    if (!btn) return;
    btn.classList.toggle('active', visible);
    btn.setAttribute('aria-pressed', String(visible));
    const label = visible ? hideLabel : showLabel;
    btn.setAttribute('data-tooltip', label);
    btn.setAttribute('aria-label', label);
  }

  function syncPanelVisibilityUi() {
    if (!appEl) return;
    const { layout, showLeft, showRight, showKpis, zen, autoRotate } = dashboardPrefs;

    appEl.dataset.layout = layout;
    appEl.dataset.globePaused = String(!autoRotate);
    appEl.classList.toggle('hide-left', !showLeft);
    appEl.classList.toggle('hide-right', !showRight);
    appEl.classList.toggle('hide-kpis', !showKpis);
    appEl.classList.toggle('zen-mode', zen);

    for (const btn of layoutBtns) {
      const active = btn.dataset.layout === layout;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    syncPanelToggleBtn(btnToggleLeft, showLeft, 'Show Left Panels', 'Hide Left Panels');
    syncPanelToggleBtn(btnToggleKpis, showKpis, 'Show KPI Bar', 'Hide KPI Bar');
    syncPanelToggleBtn(btnToggleRight, showRight, 'Show Right Panels', 'Hide Right Panels');

    if (btnToggleZen) {
      btnToggleZen.classList.toggle('active', zen);
      btnToggleZen.setAttribute('aria-pressed', String(zen));
      btnToggleZen.setAttribute('data-tooltip', zen ? 'Exit Zen Mode (Z / Esc)' : 'Zen Globe Mode (Z)');
      btnToggleZen.setAttribute('aria-label', zen ? 'Exit Zen / Globe Focus Mode' : 'Enter Zen / Globe Focus Mode');
    }

    if (btnGlobeRotate) {
      btnGlobeRotate.classList.toggle('active', autoRotate);
      btnGlobeRotate.setAttribute('aria-pressed', String(autoRotate));
      btnGlobeRotate.setAttribute('data-tooltip', autoRotate ? 'Pause Globe Rotation (R)' : 'Resume Globe Rotation (R)');
      btnGlobeRotate.setAttribute('aria-label', autoRotate ? 'Pause Globe Rotation' : 'Resume Globe Rotation');
    }

    const controls = getControls?.();
    const selectedRegion = getSelectedRegion?.();
    if (controls && !selectedRegion) {
      controls.autoRotate = autoRotate;
    }

    setRegionHidden(headerEl, zen);
    setRegionHidden(kpisEl, zen || !showKpis);
    setRegionHidden(colLeftEl, zen || !showLeft);
    setRegionHidden(colRightEl, zen || !showRight);

    if (btnZenRestore) {
      if (!zen && document.activeElement === btnZenRestore) {
        btnZenRestore.blur();
      }
      btnZenRestore.setAttribute('aria-hidden', String(!zen));
      btnZenRestore.tabIndex = zen ? 0 : -1;
      btnZenRestore.inert = !zen;
    }
  }

  function setLayout(layout) {
    if (!VALID_LAYOUTS.has(layout) || dashboardPrefs.layout === layout) return;
    dashboardPrefs.layout = layout;
    saveDashboardPrefs(dashboardPrefs);
    syncPanelVisibilityUi();
    onLayoutChange?.(layout);
  }

  function togglePanel(key) {
    if (!['showLeft', 'showKpis', 'showRight'].includes(key)) return;
    dashboardPrefs[key] = !dashboardPrefs[key];
    saveDashboardPrefs(dashboardPrefs);
    syncPanelVisibilityUi();
  }

  function setZenMode(enabled) {
    const next = Boolean(enabled);
    if (dashboardPrefs.zen === next) return;
    dashboardPrefs.zen = next;
    saveDashboardPrefs(dashboardPrefs);
    syncPanelVisibilityUi();
  }

  function toggleZenMode() {
    setZenMode(!dashboardPrefs.zen);
  }

  function toggleAutoRotate() {
    dashboardPrefs.autoRotate = !dashboardPrefs.autoRotate;
    saveDashboardPrefs(dashboardPrefs);
    const controls = getControls?.();
    if (controls) {
      controls.autoRotate = dashboardPrefs.autoRotate;
    }
    syncPanelVisibilityUi();
  }

  function resetGlobeView() {
    onResetGlobeView?.();
    if (btnGlobeReset) {
      btnGlobeReset.classList.add('active');
      setTimeout(() => btnGlobeReset.classList.remove('active'), 320);
    }
  }

  for (const btn of layoutBtns) {
    btn.addEventListener('click', () => setLayout(btn.dataset.layout));
  }
  if (btnToggleLeft) btnToggleLeft.addEventListener('click', () => togglePanel('showLeft'));
  if (btnToggleKpis) btnToggleKpis.addEventListener('click', () => togglePanel('showKpis'));
  if (btnToggleRight) btnToggleRight.addEventListener('click', () => togglePanel('showRight'));
  if (btnToggleZen) btnToggleZen.addEventListener('click', toggleZenMode);
  if (btnZenRestore) {
    btnZenRestore.addEventListener('click', () => {
      setZenMode(false);
      if (btnToggleZen) btnToggleZen.focus({ preventScroll: true });
    });
  }
  if (btnGlobeRotate) btnGlobeRotate.addEventListener('click', toggleAutoRotate);
  if (btnGlobeReset) btnGlobeReset.addEventListener('click', resetGlobeView);

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    const key = e.key.toLowerCase();
    if (key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (key === '1') {
      e.preventDefault();
      setLayout('classic');
    } else if (key === '2') {
      e.preventDefault();
      setLayout('split');
    } else if (key === '3') {
      e.preventDefault();
      setLayout('dock');
    } else if (key === 'z') {
      e.preventDefault();
      toggleZenMode();
    } else if (key === 'r') {
      e.preventDefault();
      toggleAutoRotate();
    } else if (key === '0') {
      e.preventDefault();
      resetGlobeView();
    } else if (key === 'escape' && dashboardPrefs.zen) {
      e.preventDefault();
      setZenMode(false);
    } else if (key === 'escape' && getSelectedRegion?.() && !getFullscreenElement()) {
      onEscapeRegion?.();
    }
  });

  syncPanelVisibilityUi();

  return {
    syncPanelVisibilityUi,
    setLayout,
    togglePanel,
    setZenMode,
    toggleZenMode,
    toggleAutoRotate,
    resetGlobeView,
    toggleFullscreen,
  };
}
