import { loadDashboardPrefs, saveDashboardPrefs } from './storage.js';
import { initToolbar } from './toolbar.js';
import { initGlobe } from './globe.js';
import { initCharts } from './charts.js';
import { initPanels } from './panels.js';

// ===================== Utilities =====================
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weightedPick(entries) { // [[key, weight], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[0][0];
}

// ===================== State =====================
const dashboardPrefs = loadDashboardPrefs();
const regionKeys = Object.keys(REGIONS);
const regionCounts = Object.fromEntries(regionKeys.map((r) => [r, REGIONS[r].weight * 1000]));
const airlineCounts = Object.fromEntries(AIRLINES.map((a, i) => [a.code, Math.round(17000 - i * 1200 + rand(-400, 400))]));
const routeCounts = Object.fromEntries(regionKeys.map((r) => [r, new Map()]));
const byRegion = Object.fromEntries(regionKeys.map((r) => [r, AIRPORTS.filter((a) => a.region === r)]));
let selectedRegion = null;

let globeApi = null;
let chartsApi = null;
let panelsApi = null;

function genBooking(forcedRegion = null) {
  const region = forcedRegion || weightedPick(regionKeys.map((r) => [r, REGIONS[r].weight]));
  const from = pick(byRegion[region]);
  let to;
  do {
    to = Math.random() < 0.72 ? pick(byRegion[region]) : pick(AIRPORTS);
  } while (to.code === from.code);
  const airline = weightedPick(AIRLINES.map((a, i) => [a.code, 14 - i]));
  const now = new Date();
  const dep = new Date(now.getTime() + rand(0.2, 120) * 86400000);
  return { from, to, region, airline, price: randInt(60, 1500), orderTime: now, depTime: dep };
}

function record(b, silent) {
  regionCounts[b.region] += 1;
  airlineCounts[b.airline] += randInt(1, 3);
  const key = `${b.from.code} – ${b.to.code}`;
  const m = routeCounts[b.region];
  m.set(key, (m.get(key) || 0) + (silent ? randInt(20, 400) : randInt(1, 4)));
  if (!silent && panelsApi) panelsApi.kpi.sales.value += b.price;
}

// Warm-up data before initializing charts and panels
for (let i = 0; i < 900; i++) record(genBooking(), true);
for (const r of regionKeys) {
  for (let i = 0; i < 12; i++) record(genBooking(r), true);
}

function resizeVisuals() {
  globeApi.resize();
  chartsApi.resize();
}

function selectRegion(region) {
  const next = region && REGIONS[region]
    ? (selectedRegion === region ? null : region)
    : null;
  if (next === selectedRegion) return;
  selectedRegion = next;

  globeApi?.syncRegionSelection(selectedRegion);
  chartsApi?.renderDonut();
  panelsApi?.syncRegionSelection(selectedRegion);
}

// ===================== Initialize Modules =====================
// Apply layout & panel visibility classes before Globe/ECharts measure container bounds
initToolbar({
  dashboardPrefs,
  saveDashboardPrefs,
  getControls: () => globeApi?.controls,
  getSelectedRegion: () => selectedRegion,
  onLayoutChange: () => {
    chartsApi?.renderDonut();
    chartsApi?.renderBars();
  },
  onResetGlobeView: () => globeApi?.resetView(),
  onEscapeRegion: () => selectRegion(null),
});

globeApi = initGlobe({
  regions: REGIONS,
  airports: AIRPORTS,
  regionKeys,
  getSelectedRegion: () => selectedRegion,
  getDashboardPrefs: () => dashboardPrefs,
  genBooking,
  onSelectRegion: selectRegion,
});

chartsApi = initCharts({
  regions: REGIONS,
  airlines: AIRLINES,
  regionKeys,
  regionCounts,
  airlineCounts,
  getSelectedRegion: () => selectedRegion,
  getDashboardPrefs: () => dashboardPrefs,
  onSelectRegion: selectRegion,
});

panelsApi = initPanels({
  regions: REGIONS,
  regionKeys,
  routeCounts,
  genBooking,
  getSelectedRegion: () => selectedRegion,
  onSelectRegion: selectRegion,
});

resizeVisuals();
if (typeof ResizeObserver === 'function') {
  const visualResizeObserver = new ResizeObserver(resizeVisuals);
  for (const el of document.querySelectorAll('#globe, #donut, #bars')) {
    visualResizeObserver.observe(el);
  }
} else {
  addEventListener('resize', resizeVisuals);
  // Presets and visibility can change the available space without a window resize.
  const layoutObserver = new MutationObserver(resizeVisuals);
  layoutObserver.observe(document.querySelector('#app'), {
    attributes: true,
    attributeFilter: ['class', 'data-layout'],
  });
}

// ===================== Live stream =====================
function loop() {
  const b = genBooking();
  record(b, false);
  panelsApi.pushRow(b);
  globeApi.addArc(b);
  globeApi.addRing(b.to, b.region);
  setTimeout(loop, rand(900, 1800));
}
setTimeout(loop, 1200);

// Small background drift of sales between bookings + periodic chart refresh
setInterval(() => { panelsApi.kpi.sales.value += randInt(5, 60); }, 700);
setInterval(() => { chartsApi.renderDonut(); chartsApi.renderBars(); }, 3000);
setInterval(() => { if (Math.random() < 0.3) panelsApi.kpi.routes.value += 1; }, 5000);
setInterval(() => { panelsApi.renderTopRoutes(); }, 4000);
