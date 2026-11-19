const $ = (s) => document.querySelector(s);

export function initCharts(options) {
  const {
    regions,
    airlines,
    regionKeys,
    regionCounts,
    airlineCounts,
    getSelectedRegion,
    getDashboardPrefs,
    onSelectRegion,
  } = options;

  const donutEl = $('#donut');
  const barsEl = $('#bars');
  const legendLeftEl = $('#legend-left');
  const legendRightEl = $('#legend-right');

  const [donut, bars] = [donutEl, barsEl].map((el) => {
    if (typeof echarts === 'undefined' || !el) return null;
    // A saved preset can hide either panel at startup.
    return echarts.init(el, null, {
      width: el.clientWidth || 1,
      height: el.clientHeight || 1,
    });
  });

  // ===================== Donut: Global Route Distribution =====================
  function renderDonut() {
    if (!donut) return;
    const selectedRegion = getSelectedRegion?.() || null;
    const isDock = getDashboardPrefs?.()?.layout === 'dock';
    const total = regionKeys.reduce((s, r) => s + regionCounts[r], 0) || 1;
    const data = regionKeys.map((r) => {
      const color = regions[r].color;
      const isSelected = selectedRegion === r;
      const isDimmed = Boolean(selectedRegion) && !isSelected;
      return {
        name: r,
        value: regionCounts[r],
        selected: isSelected,
        itemStyle: {
          color,
          opacity: isDimmed ? 0.25 : 1,
          borderColor: isSelected ? '#ffffff' : 'transparent',
          borderWidth: isSelected ? 2 : 0,
          shadowBlur: isSelected ? 20 : (isDimmed ? 0 : 12),
          shadowColor: isSelected ? color : 'rgba(31,209,249,.6)',
        },
      };
    });
    const centerText = selectedRegion
      ? `${selectedRegion}\n${((regionCounts[selectedRegion] / total) * 100).toFixed(1)}%`
      : 'Partner\nAirlines';
    donut.setOption({
      title: {
        text: centerText, left: 'center', top: 'center',
        textStyle: {
          color: selectedRegion ? regions[selectedRegion].color : '#e8f8ff',
          fontFamily: 'Rajdhani', fontWeight: 700, fontSize: isDock ? 15 : 18, lineHeight: isDock ? 17 : 20,
        },
      },
      series: [
        { type: 'pie', radius: ['86%', '88%'], silent: true, label: { show: false }, data: [{ value: 1, itemStyle: { color: 'rgba(31,209,249,.35)' } }] },
        {
          type: 'pie', radius: ['58%', '78%'], padAngle: 2,
          selectedMode: 'single', selectedOffset: 7,
          itemStyle: { borderRadius: 3, shadowBlur: 12, shadowColor: 'rgba(31,209,249,.6)' },
          label: { show: false }, data, animationDurationUpdate: 800,
        },
        { type: 'pie', radius: ['48%', '50%'], silent: true, label: { show: false }, data: [{ value: 1, itemStyle: { color: 'rgba(31,209,249,.25)' } }] },
      ],
    });
    const item = (r) => {
      const c = regions[r].color;
      const isActive = selectedRegion === r;
      const isDimmed = Boolean(selectedRegion) && !isActive;
      const cls = ['legend-item', isActive ? 'active' : '', isDimmed ? 'dimmed' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-region="${r}" aria-pressed="${isActive}" style="--region-color:${c};--region-glow:${c}88"><i style="background:${c};color:${c}"></i><span>${r}</span><b>${((regionCounts[r] / total) * 100).toFixed(1)}%</b></button>`;
    };
    if (legendLeftEl) legendLeftEl.innerHTML = regionKeys.slice(0, 3).map(item).join('');
    if (legendRightEl) legendRightEl.innerHTML = regionKeys.slice(3).map(item).join('');
  }

  if (donut) {
    donut.on('click', (params) => {
      if (params.seriesIndex !== 1 || !params.name || !regions[params.name]) return;
      onSelectRegion?.(params.name);
    });
  }

  for (const legendEl of [legendLeftEl, legendRightEl]) {
    if (legendEl) {
      legendEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-region]');
        if (!btn) return;
        onSelectRegion?.(btn.dataset.region);
      });
    }
  }

  // ===================== Bars: Top 10 Airlines =====================
  function renderBars() {
    if (!bars) return;
    const layout = getDashboardPrefs?.()?.layout;
    const isDock = layout === 'dock';
    const isSplit = layout === 'split';
    const top = airlines.map((a) => ({ ...a, v: airlineCounts[a.code] })).sort((a, b) => b.v - a.v).slice(0, 10);
    bars.setOption({
      grid: isDock ? { left: 40, right: 62, top: 4, bottom: 2 } : { left: 44, right: 70, top: 6, bottom: 0 },
      xAxis: { type: 'value', show: false, max: (v) => v.max * 1.02 },
      yAxis: {
        type: 'category', inverse: true, data: top.map((a) => a.code),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#cfe9ff', fontFamily: 'Orbitron', fontSize: isDock ? 12 : 14 },
      },
      series: [{
        type: 'bar', barWidth: isDock ? 10 : (isSplit ? 12 : 13), showBackground: true,
        backgroundStyle: { color: 'rgba(255,255,255,.06)', borderRadius: 7 },
        data: top.map((a) => ({
          value: a.v,
          itemStyle: {
            borderRadius: 7, shadowBlur: 10, shadowColor: a.color[1],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: a.color[0] + '55' }, { offset: 1, color: a.color[1] }]),
          },
        })),
        label: { show: true, position: 'right', color: '#fff', fontFamily: 'Share Tech Mono', fontSize: isDock ? 12.5 : 15, formatter: (p) => p.value.toLocaleString('en-US') },
        animationDurationUpdate: 900,
      }],
    });
  }

  function resize() {
    for (const chart of [donut, bars]) {
      if (!chart) continue;
      const { clientWidth: width, clientHeight: height } = chart.getDom();
      if (width && height && (width !== chart.getWidth() || height !== chart.getHeight())) {
        chart.resize({ width, height });
      }
    }
  }

  renderDonut();
  renderBars();

  return {
    donut,
    bars,
    renderDonut,
    renderBars,
    resize,
  };
}
