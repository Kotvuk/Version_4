// ===================================
// ПАНЕЛЬ: СКРИНЕР (реальные данные Binance)
// ===================================

let SCREENER_ASSETS = [];
let screenerFilter = '';
let screenerSort = { col: 'volRaw', dir: -1 };

function getScreenerContent() {
  return `
    <div class="screener-wrap">
      <div class="screener-toolbar">
        <input
          id="screenerSearch"
          type="text"
          placeholder="🔍  Поиск актива..."
          oninput="screenerFilter=this.value.toUpperCase();renderScreenerTable()"
          style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;
                 padding:0.55rem 1rem;color:#fff;font-size:0.9rem;outline:none;font-family:'Inter',sans-serif;width:240px;"
        />
        <span class="screener-badge" id="screenerBadge">Загрузка...</span>
      </div>

      <div class="screener-table-wrap">
        <table class="screener-table" id="screenerTable">
          <thead>
            <tr>
              <th onclick="sortScreener('symbol')">#  Актив <span class="sort-icon">↕</span></th>
              <th onclick="sortScreener('price')">Цена <span class="sort-icon">↕</span></th>
              <th onclick="sortScreener('change')">24h % <span class="sort-icon">↕</span></th>
              <th onclick="sortScreener('volRaw')">Объём <span class="sort-icon">↕</span></th>
              <th>24h Диапазон</th>
            </tr>
          </thead>
          <tbody id="screenerBody">
            <tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.4);padding:2rem;">Загрузка данных с Binance...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function initScreenerPage() {
  try {
    const response = await apiFetch('/api/market/screener');
    const data = await response.json();
    
    if (data.success) {
      SCREENER_ASSETS = data.assets;
      const badge = document.getElementById('screenerBadge');
      if (badge) {
        badge.textContent = 'Binance • Live';
        badge.style.background = 'rgba(34,197,94,0.15)';
        badge.style.color = '#22c55e';
      }
      renderScreenerTable();
    }
  } catch (e) {
    const badge = document.getElementById('screenerBadge');
    if (badge) { badge.textContent = 'Ошибка загрузки'; badge.style.color = '#ef4444'; }
    console.error('Ошибка загрузки скринера:', e);
  }
}

function renderScreenerTable() {
  const tbody = document.getElementById('screenerBody');
  if (!tbody) return;

  let data = SCREENER_ASSETS.filter(a =>
    a.symbol.includes(screenerFilter) || a.name.toUpperCase().includes(screenerFilter)
  );

  data.sort((a, b) => {
    let av = a[screenerSort.col], bv = b[screenerSort.col];
    if (typeof av === 'string') return av.localeCompare(bv) * screenerSort.dir;
    return (av - bv) * screenerSort.dir;
  });

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.4);padding:2rem;">Ничего не найдено</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((a, i) => {
    const up = a.change >= 0;
    const pct = Math.abs(a.change);
    const rangePct = a.high !== a.low ? ((a.price - a.low) / (a.high - a.low) * 100).toFixed(1) : 50;

    return `
      <tr class="screener-row" style="animation: fadeInRow 0.3s ease ${i * 0.04}s both;">
        <td>
          <div class="screener-asset">
            <div class="screener-icon" style="background:${assetColor(a.symbol)}22;color:${assetColor(a.symbol)};">
              ${a.symbol.slice(0, 1)}
            </div>
            <div>
              <p style="font-weight:600;color:#fff;font-size:0.9rem;">${a.symbol}</p>
              <p style="font-size:0.75rem;color:rgba(255,255,255,0.4);">${a.name}</p>
            </div>
          </div>
        </td>
        <td style="font-family:'Space Grotesk',sans-serif;font-weight:600;color:#fff;">
          $${a.price >= 1000 ? a.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) : a.price < 1 ? a.price.toFixed(4) : a.price.toFixed(2)}
        </td>
        <td>
          <span class="screener-change ${up ? 'up' : 'down'}">
            ${up ? '▲' : '▼'} ${pct.toFixed(2)}%
          </span>
        </td>
        <td style="color:rgba(255,255,255,0.6);font-size:0.88rem;">$${a.vol}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:rgba(255,255,255,0.4);">
            <span>$${a.low < 1 ? a.low.toFixed(4) : a.low.toFixed(2)}</span>
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;position:relative;min-width:60px;">
              <div style="position:absolute;left:${rangePct}%;top:-2px;width:8px;height:8px;border-radius:50%;background:${up ? '#22c55e' : '#ef4444'};transform:translateX(-50%);"></div>
            </div>
            <span>$${a.high < 1 ? a.high.toFixed(4) : a.high.toFixed(2)}</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function sortScreener(col) {
  if (screenerSort.col === col) screenerSort.dir *= -1;
  else { screenerSort.col = col; screenerSort.dir = col === 'symbol' ? 1 : -1; }
  renderScreenerTable();
}

function assetColor(symbol) {
  const colors = {
    BTC:'#f7931a', ETH:'#627eea', BNB:'#f3ba2f', SOL:'#9945ff', XRP:'#346aa9',
    ADA:'#0033ad', DOGE:'#c2a633', TON:'#0088cc', AVAX:'#e84142', LINK:'#2a5ada',
    DOT:'#e6007a', LTC:'#bfbbbb', ATOM:'#2e3148', UNI:'#ff007a', MATIC:'#8247e5'
  };
  return colors[symbol] || '#3b82f6';
}
