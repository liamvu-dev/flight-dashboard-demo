import { VALID_LAYOUTS } from './storage.js';

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LAYOUT_TRANSITION_PROPS = new Set([
  'width', 'height', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'left', 'right', 'top', 'bottom',
]);

export function initToolbar(options) {
  const {
    dashboardPrefs,
    saveDashboardPrefs,
    resizeVisuals,
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
  const globeEl = $('#globe');
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

  let transitionRafId = 0;
  let transitionTimeoutId = 0;
  let transitionCleanup = null;

  // ===================== Auto scale 1920x1080 =====================
  function fit() {
    if (!appEl) return;
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    appEl.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener('resize', fit);
  fit();

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
  document.addEventListener('fullscreenchange', () => { syncFullscreenState(); fit(); });
  document.addEventListener('webkitfullscreenchange', () => { syncFullscreenState(); fit(); });
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

  function applyPanelVisibility({ immediate = false } = {}) {
    if (!appEl) return;
    const prefersReducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (transitionCleanup) {
      transitionCleanup();
      transitionCleanup = null;
    }
    if (transitionRafId) {
      cancelAnimationFrame(transitionRafId);
      transitionRafId = 0;
    }
    if (transitionTimeoutId) {
      clearTimeout(transitionTimeoutId);
      transitionTimeoutId = 0;
    }

    if (immediate) {
      appEl.classList.add('no-transitions');
      syncPanelVisibilityUi();
      void appEl.offsetWidth;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => appEl.classList.remove('no-transitions'));
      });
      return;
    }

    if (prefersReducedMotion) {
      syncPanelVisibilityUi();
      appEl.classList.remove('is-transitioning');
      resizeVisuals?.({ includeCharts: true });
      return;
    }

    appEl.classList.add('is-transitioning');
    syncPanelVisibilityUi();

    const transitionTargets = [
      appEl,
      headerEl,
      kpisEl,
      colLeftEl,
      colRightEl,
      globeEl,
    ].filter(Boolean);

    const hasRunningLayoutTransitions = () => transitionTargets.some((el) => {
      if (typeof el.getAnimations !== 'function') return false;
      return el.getAnimations().some((anim) => (
        anim.playState === 'running'
        && typeof anim.transitionProperty === 'string'
        && LAYOUT_TRANSITION_PROPS.has(anim.transitionProperty)
      ));
    });

    const startTime = performance.now();
    let finished = false;
    const finishTransition = () => {
      if (finished) return;
      finished = true;
      if (transitionCleanup) {
        transitionCleanup();
        transitionCleanup = null;
      }
      if (transitionRafId) {
        cancelAnimationFrame(transitionRafId);
        transitionRafId = 0;
      }
      if (transitionTimeoutId) {
        clearTimeout(transitionTimeoutId);
        transitionTimeoutId = 0;
      }
      appEl.classList.remove('is-transitioning');
      resizeVisuals?.({ includeCharts: true });
    };

    const onTransitionEnd = (e) => {
      if (!transitionTargets.includes(e.target)) return;
      if (!LAYOUT_TRANSITION_PROPS.has(e.propertyName)) return;
      if (!hasRunningLayoutTransitions()) finishTransition();
    };
    appEl.addEventListener('transitionend', onTransitionEnd);
    transitionCleanup = () => appEl.removeEventListener('transitionend', onTransitionEnd);

    const trackTransitionResize = (now) => {
      resizeVisuals?.({ includeCharts: false });
      if (!finished && now - startTime < 8000) {
        transitionRafId = requestAnimationFrame(trackTransitionResize);
      } else {
        transitionRafId = 0;
      }
    };
    transitionRafId = requestAnimationFrame(trackTransitionResize);

    const checkTransitionSettlement = () => {
      if (finished) return;
      const elapsed = performance.now() - startTime;
      if (!hasRunningLayoutTransitions() || elapsed >= 8000) {
        finishTransition();
      } else {
        transitionTimeoutId = setTimeout(checkTransitionSettlement, 150);
      }
    };
    transitionTimeoutId = setTimeout(checkTransitionSettlement, 420);
  }

  function setLayout(layout) {
    if (!VALID_LAYOUTS.has(layout) || dashboardPrefs.layout === layout) return;
    dashboardPrefs.layout = layout;
    saveDashboardPrefs(dashboardPrefs);
    applyPanelVisibility();
    onLayoutChange?.(layout);
    requestAnimationFrame(() => resizeVisuals?.({ includeCharts: true }));
  }

  function togglePanel(key) {
    if (!['showLeft', 'showKpis', 'showRight'].includes(key)) return;
    dashboardPrefs[key] = !dashboardPrefs[key];
    saveDashboardPrefs(dashboardPrefs);
    applyPanelVisibility();
    requestAnimationFrame(() => resizeVisuals?.({ includeCharts: true }));
  }

  function setZenMode(enabled) {
    const next = Boolean(enabled);
    if (dashboardPrefs.zen === next) return;
    dashboardPrefs.zen = next;
    saveDashboardPrefs(dashboardPrefs);
    applyPanelVisibility();
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

  applyPanelVisibility({ immediate: true });

  return {
    fit,
    applyPanelVisibility,
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
