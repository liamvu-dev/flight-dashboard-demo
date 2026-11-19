const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const fmtDT = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const randInt = (a, b) => Math.floor(a + Math.random() * (b + 1 - a));

const ROW_H = 38;
const MAX_TABLE_ROWS = 18;
const MAX_HISTORY = 240;

export function initPanels(options) {
  const {
    regions,
    regionKeys,
    routeCounts,
    genBooking,
    getSelectedRegion,
    onSelectRegion,
  } = options;

  // ===================== KPI count-up =====================
  const kpi = {
    sales:     { el: $('#kpi-sales'), value: 15025940, shown: 0, prefix: '$' },
    routes:    { el: $('#kpi-routes'), value: 27461, shown: 0 },
    airports:  { el: $('#kpi-airports'), value: 26682, shown: 0 },
    airlines:  { el: $('#kpi-airlines'), value: 256, shown: 0 },
    countries: { el: $('#kpi-countries'), value: 91, shown: 0 },
  };

  function animateKpis() {
    for (const k of Object.values(kpi)) {
      const diff = k.value - k.shown;
      if (Math.abs(diff) > 0.5) k.shown += diff * 0.08; else k.shown = k.value;
      if (k.el) k.el.textContent = (k.prefix || '') + Math.round(k.shown).toLocaleString('en-US');
    }
    requestAnimationFrame(animateKpis);
  }
  animateKpis();

  // ===================== Top Routes by region (rotating) =====================
  const routesTitleEl = $('#routes-title');
  const topRoutesEl = $('#top-routes');
  const btnResetRegion = $('#btn-reset-region');
  let routeRegionIdx = 0;

  function renderTopRoutes() {
    const region = getSelectedRegion?.() || regionKeys[routeRegionIdx];
    if (!region || !routeCounts[region]) return;
    if (routesTitleEl) routesTitleEl.textContent = `Top Routes – ${region}`;
    if (!topRoutesEl) return;
    const list = [...routeCounts[region].entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = list.length ? list[0][1] : 1;
    const c = regions[region].color;
    topRoutesEl.innerHTML = list.map(([name, v], i) => `
    <div class="tr">
      <span class="rank ${i < 3 ? 'g' + (i + 1) : ''}">${i + 1}</span>
      <span class="name">${name}</span>
      <span class="bar"><i style="width:${(v / max) * 100}%;background:linear-gradient(90deg, ${c}33, ${i < 3 ? '#ffb84d' : c})"></i></span>
      <span class="num">${v.toLocaleString('en-US')}</span>
    </div>`).join('');
  }
  renderTopRoutes();

  setInterval(() => {
    if (getSelectedRegion?.() || !topRoutesEl) return;
    topRoutesEl.classList.add('fade');
    setTimeout(() => {
      if (getSelectedRegion?.()) {
        topRoutesEl.classList.remove('fade');
        return;
      }
      routeRegionIdx = (routeRegionIdx + 1) % regionKeys.length;
      renderTopRoutes();
      topRoutesEl.classList.remove('fade');
    }, 400);
  }, 10000);

  if (btnResetRegion) {
    btnResetRegion.addEventListener('click', () => onSelectRegion?.(null));
  }

  // ===================== Booking table (auto-scroll, pause/resume & search) =====================
  const tableBodyEl = $('#table-body');
  const rowsEl = $('#rows');
  const liveBadgeEl = $('#live-badge');
  const liveTextEl = liveBadgeEl?.querySelector('.live-text');
  const btnLiveToggle = $('#btn-live-toggle');
  const routeSearchEl = $('#route-search');
  const btnClearSearch = $('#btn-clear-search');
  const recordsCountEl = $('#records-count');

  const bookingHistory = [];

  let isLivePaused = false;
  let rawSearchQuery = '';
  let searchQuery = '';
  let scrolling = false;
  let scrollTimer = null;
  let rowRenderToken = 0;

  function rowHtml(b) {
    return `<span class="r">${b.from.code} – ${b.to.code}</span><span>${fmtDT(b.depTime)}</span><span>${fmtDT(b.orderTime)}</span>`;
  }

  function createRowEl(b, isNew = false) {
    const div = document.createElement('div');
    div.className = isNew ? 'row new' : 'row';
    div.innerHTML = rowHtml(b);
    return div;
  }

  function saveBookingHistory(b) {
    bookingHistory.push(b);
    if (bookingHistory.length <= MAX_HISTORY) return;
    const counts = Object.fromEntries(regionKeys.map((r) => [r, 0]));
    for (const item of bookingHistory) counts[item.region]++;
    const dropIdx = bookingHistory.findIndex((item) => counts[item.region] > 12);
    bookingHistory.splice(dropIdx !== -1 ? dropIdx : 0, 1);
  }

  // Seed initial booking history with guaranteed coverage across all regions
  (function seedBookingHistory() {
    const now = Date.now();
    for (let i = 0; i < 120; i++) {
      const b = genBooking();
      b.orderTime = new Date(now - (120 - i) * 3500);
      bookingHistory.push(b);
    }
    for (const r of regionKeys) {
      let count = bookingHistory.filter((b) => b.region === r).length;
      while (count < 10) {
        const b = genBooking(r);
        b.orderTime = new Date(now - randInt(5, 420) * 1000);
        bookingHistory.push(b);
        count++;
      }
    }
    bookingHistory.sort((a, b) => a.orderTime - b.orderTime);
  })();

  function normalizeRouteQuery(s) {
    return String(s || '').trim().toLowerCase().replace(/[–—-]+/g, ' ').replace(/\s+/g, ' ');
  }

  function matchesRouteFilter(b, normalizedQuery) {
    if (!normalizedQuery) return true;
    const routeText = `${b.from.code} ${b.to.code}`.toLowerCase();
    return routeText.includes(normalizedQuery);
  }

  function cancelRowScrollAnimation() {
    rowRenderToken++;
    if (scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    if (scrolling && rowsEl) {
      rowsEl.classList.remove('anim');
      while (rowsEl.children.length > MAX_TABLE_ROWS) rowsEl.firstElementChild.remove();
      rowsEl.style.transform = 'translateY(0)';
    }
    scrolling = false;
  }

  function syncTableModeClasses() {
    if (!tableBodyEl) return;
    const isFiltered = Boolean(searchQuery);
    tableBodyEl.classList.toggle('filtered', isFiltered);
    tableBodyEl.classList.toggle('paused', isLivePaused);
    if (!isFiltered && !isLivePaused) tableBodyEl.scrollTop = 0;
  }

  function renderRows(highlightBooking = null) {
    cancelRowScrollAnimation();
    syncTableModeClasses();
    if (!rowsEl) return;
    rowsEl.innerHTML = '';

    const selectedRegion = getSelectedRegion?.() || null;
    const regionFiltered = selectedRegion
      ? bookingHistory.filter((b) => b.region === selectedRegion)
      : bookingHistory;

    if (searchQuery) {
      const matches = [];
      for (let i = regionFiltered.length - 1; i >= 0; i--) {
        const b = regionFiltered[i];
        if (matchesRouteFilter(b, searchQuery)) matches.push(b);
      }
      if (recordsCountEl) {
        recordsCountEl.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
      }
      if (matches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'table-empty';
        empty.textContent = selectedRegion
          ? `No matching routes for "${rawSearchQuery.trim()}" in ${selectedRegion}`
          : `No matching routes for "${rawSearchQuery.trim()}"`;
        rowsEl.appendChild(empty);
        return;
      }
      const frag = document.createDocumentFragment();
      for (const b of matches) frag.appendChild(createRowEl(b, b === highlightBooking));
      rowsEl.appendChild(frag);
      return;
    }

    if (recordsCountEl) recordsCountEl.textContent = '';
    const recent = regionFiltered.slice(-MAX_TABLE_ROWS);
    const frag = document.createDocumentFragment();
    for (const b of recent) frag.appendChild(createRowEl(b, false));
    rowsEl.appendChild(frag);
  }

  function setLivePaused(paused) {
    isLivePaused = Boolean(paused);
    if (isLivePaused) cancelRowScrollAnimation();
    if (liveBadgeEl) liveBadgeEl.classList.toggle('paused', isLivePaused);
    if (liveTextEl) liveTextEl.textContent = isLivePaused ? 'PAUSED' : 'LIVE';
    if (btnLiveToggle) {
      btnLiveToggle.classList.toggle('paused', isLivePaused);
      btnLiveToggle.setAttribute('aria-pressed', String(isLivePaused));
      btnLiveToggle.setAttribute('aria-label', isLivePaused ? 'Resume Live Stream' : 'Pause Live Stream');
      btnLiveToggle.setAttribute('title', isLivePaused ? 'Resume Live Stream' : 'Pause Live Stream');
    }
    syncTableModeClasses();
  }

  function updateSearchFilter() {
    rawSearchQuery = routeSearchEl ? routeSearchEl.value : '';
    searchQuery = normalizeRouteQuery(rawSearchQuery);
    if (btnClearSearch) btnClearSearch.hidden = rawSearchQuery.length === 0;
    renderRows();
  }

  if (btnLiveToggle) {
    btnLiveToggle.addEventListener('click', () => setLivePaused(!isLivePaused));
  }
  if (routeSearchEl) {
    routeSearchEl.addEventListener('input', updateSearchFilter);
    routeSearchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && routeSearchEl.value) {
        e.stopPropagation();
        routeSearchEl.value = '';
        updateSearchFilter();
      }
    });
  }
  if (btnClearSearch && routeSearchEl) {
    btnClearSearch.addEventListener('click', () => {
      routeSearchEl.value = '';
      updateSearchFilter();
      routeSearchEl.focus();
    });
  }

  renderRows();

  function pushRow(b) {
    if (isLivePaused) return;
    saveBookingHistory(b);
    const selectedRegion = getSelectedRegion?.() || null;
    if (selectedRegion && b.region !== selectedRegion) return;

    if (searchQuery) {
      if (matchesRouteFilter(b, searchQuery)) renderRows(b);
      return;
    }

    if (!rowsEl) return;
    rowsEl.appendChild(createRowEl(b, true));
    if (scrolling) return;
    scrolling = true;
    const token = rowRenderToken;
    rowsEl.classList.add('anim');
    rowsEl.style.transform = `translateY(-${ROW_H}px)`;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      if (token !== rowRenderToken) return;
      rowsEl.classList.remove('anim');
      while (rowsEl.children.length > MAX_TABLE_ROWS) rowsEl.firstElementChild.remove();
      rowsEl.style.transform = 'translateY(0)';
      scrolling = false;
    }, 650);
  }

  function syncRegionSelection(region) {
    if (topRoutesEl) topRoutesEl.classList.remove('fade');
    renderTopRoutes();

    if (btnResetRegion) {
      btnResetRegion.hidden = !region;
    }

    renderRows();
  }

  return {
    kpi,
    pushRow,
    renderRows,
    renderTopRoutes,
    setLivePaused,
    syncRegionSelection,
  };
}
