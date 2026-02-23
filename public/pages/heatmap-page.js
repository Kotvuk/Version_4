// ===================================
// ПАНЕЛЬ: ТЕПЛОВАЯ КАРТА (реальные данные Binance)
// ===================================

let HEATMAP_DATA = [];

function getHeatmapContent() {
  return `
    <div class="heatmap-wrap">
      <div class="screener-toolbar">
        <span style="color:rgba(255,255,255,0.5);font-size:0.85rem;">
          Размер ячейки = объём торгов &nbsp;•&nbsp; Цвет = изменение за 24ч
        </span>
        <span class="screener-badge" id="heatmapBadge">Загрузка...</span>
      </div>
      <div id="heatmapGrid" class="heatmap-grid"></div>
      <div class="heatmap-legend">
        <div class="legend-bar"></div>
        <div class="legend-labels">
          <span>−5%</span><span>−2%</span><span>0%</span><span>+2%</span><span>+5%</span>
        </div>
      </div>
    </div>
  `;
}

async function initHeatmapPage() {
  try {
    const response = await apiFetch('/api/market/heatmap');
    const data = await response.json();
    
    if (data.success) {
      HEATMAP_DATA = data.assets;
      const badge = document.getElementById('heatmapBadge');
      if (badge) {
        badge.textContent = 'Binance • Live';
        badge.style.background = 'rgba(34,197,94,0.15)';
        badge.style.color = '#22c55e';
      }
      renderHeatmap();
    }
  } catch (e) {
    const badge = document.getElementById('heatmapBadge');
    if (badge) { badge.textContent = 'Ошибка загрузки'; badge.style.color = '#ef4444'; }
    console.error('Ошибка загрузки тепловой карты:', e);
  }
}

function renderHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  if (!grid || HEATMAP_DATA.length === 0) return;

  const total = HEATMAP_DATA.reduce((s, a) => s + a.mcap, 0);

  grid.innerHTML = HEATMAP_DATA.map((a, i) => {
    const pct = (a.mcap / total * 100).toFixed(1);
    const color = heatColor(a.change);
    const textColor = Math.abs(a.change) > 1 ? '#fff' : 'rgba(255,255,255,0.85)';
    const up = a.change >= 0;

    return `
      <div class="heatmap-cell"
        style="flex:${pct};min-width:${Math.max(60, pct * 1.5)}px;min-height:${Math.max(60, pct * 1.2)}px;
               background:${color};animation:cellPop 0.5s ease ${i * 0.05}s both;cursor:default;"
        title="${a.symbol}: ${up ? '+' : ''}${a.change}%">
        <p style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(0.7rem,1.2vw,1rem);color:${textColor};">${a.symbol}</p>
        <p style="font-size:clamp(0.65rem,1vw,0.85rem);color:${textColor};opacity:0.9;font-weight:600;">${up ? '+' : ''}${a.change}%</p>
      </div>
    `;
  }).join('');
}

function heatColor(change) {
  const c = Math.max(-5, Math.min(5, change));
  if (c >= 0) {
    const intensity = c / 5;
    const r = Math.round(22  + (34  - 22)  * intensity);
    const g = Math.round(60  + (197 - 60)  * intensity);
    const b = Math.round(60  + (94  - 60)  * intensity);
    return `rgba(${r},${g},${b},0.85)`;
  } else {
    const intensity = Math.abs(c) / 5;
    const r = Math.round(60  + (239 - 60)  * intensity);
    const g = Math.round(40  + (68  - 40)  * intensity);
    const b = Math.round(40  + (68  - 40)  * intensity);
    return `rgba(${r},${g},${b},0.85)`;
  }
}
