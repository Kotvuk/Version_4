// ===================================
// ИИ АНАЛИЗ — ai-page.js
// ===================================

const analysisHistory = [];
let selectedTimeframe = '1h';
let aiRefreshInterval = null;
let searchDebounceTimer = null;

function getAIContent() {
  return `
    <div class="ai-page-wrap">

      <!-- Виджеты -->
      <div class="ai-widgets-row">
        <div class="ai-widget-card">
          <p class="ai-widget-label">Общая капитализация</p>
          <p class="ai-widget-value" id="widgetMarketCap">
            <span class="ai-loading-dot"></span>
          </p>
          <p class="ai-widget-sub" id="widgetMarketCapSub" style="color:rgba(255,255,255,0.3)">Загрузка...</p>
        </div>
        <div class="ai-widget-card">
          <p class="ai-widget-label">Индекс страха и жадности</p>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-top:0.25rem;">
            <p class="ai-widget-value" id="widgetFearValue">
              <span class="ai-loading-dot"></span>
            </p>
            <span id="widgetFearLabel" class="ai-fear-badge" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.3);">Загрузка</span>
          </div>
          <div class="ai-fear-bar-track">
            <div class="ai-fear-bar-fill" id="widgetFearBar" style="width:0%;transition:width 0.8s ease;"></div>
          </div>
        </div>
        <div class="ai-widget-card">
          <p class="ai-widget-label">Точность ИИ анализа</p>
          <p class="ai-widget-value" id="widgetAiAccuracy">—</p>
          <p class="ai-widget-sub" id="widgetAiAccuracySub" style="color:rgba(255,255,255,0.4)">Нет данных</p>
        </div>
      </div>

      <!-- Статус обновления -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:0.5rem;">
        <span id="aiUpdateStatus" style="font-size:0.72rem;color:rgba(255,255,255,0.25);">Обновляется каждые 60 сек</span>
      </div>

      <!-- Форма анализа -->
      <div class="ai-card">
        <div class="ai-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
          </svg>
          Параметры анализа
        </div>

        <div class="ai-form-row">
          <div class="ai-form-group" style="position:relative;">
            <label class="ai-label">Актив</label>
            <div style="position:relative;">
              <input
                type="text"
                id="aiAssetInput"
                class="ai-select"
                placeholder="Поиск: BTC, ETH, SOL, PEPE..."
                autocomplete="off"
                value="BTC"
                oninput="onAssetSearch(this.value)"
                onfocus="onAssetInputFocus()"
                style="cursor:text;"
              />
              <div id="aiAssetPrice" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:0.8rem;color:rgba(255,255,255,0.4);font-family:'Space Grotesk',sans-serif;pointer-events:none;"></div>
            </div>
            <div id="aiAssetDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#1a1a24;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-top:4px;max-height:240px;overflow-y:auto;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,0.5);"></div>
          </div>

          <div class="ai-form-group">
            <label class="ai-label">Таймфрейм</label>
            <div class="ai-tf-group" id="aiTimeframeGroup">
              <button class="ai-tf-btn" data-tf="15m">15m</button>
              <button class="ai-tf-btn active" data-tf="1h">1h</button>
              <button class="ai-tf-btn" data-tf="4h">4h</button>
              <button class="ai-tf-btn" data-tf="1D">1D</button>
              <button class="ai-tf-btn" data-tf="1W">1W</button>
            </div>
          </div>
        </div>

        <button class="ai-analyze-btn" id="aiAnalyzeBtn" onclick="runAIAnalysis()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Анализировать
        </button>
      </div>

      <!-- Результат анализа -->
      <div class="ai-result-wrap" id="aiResultWrap" style="display:none;">
        <div class="ai-card ai-signal-card" id="aiSignalCard">
          <div class="ai-signal-label" id="aiSignalLabel">LONG</div>
          <div class="ai-signal-asset" id="aiSignalAsset">BTC / 1h</div>
          <div class="ai-confidence-wrap">
            <div class="ai-confidence-row">
              <span class="ai-confidence-text">Уверенность</span>
              <span class="ai-confidence-value" id="aiConfidenceValue">78%</span>
            </div>
            <div class="ai-progress-track">
              <div class="ai-progress-bar" id="aiProgressBar" style="width:78%"></div>
            </div>
          </div>
          <p class="ai-explanation" id="aiExplanation"></p>
        </div>

        <div class="ai-card" id="aiDetailCard">
          <div class="ai-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Детальный анализ ИИ
          </div>
          <div class="ai-detail-sections" id="aiDetailSections"></div>
        </div>

        <div class="ai-card">
          <div class="ai-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Технические индикаторы
          </div>
          <div class="ai-indicators-grid" id="aiIndicatorsGrid"></div>
        </div>

        <div class="ai-card">
          <div class="ai-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Рекомендуемые уровни
          </div>
          <div class="ai-levels-grid" id="aiLevelsGrid"></div>
        </div>
      </div>

      <!-- История -->
      <div class="ai-card ai-history-card">
        <div class="ai-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          История анализов
        </div>
        <div id="aiHistoryWrap">
          <p class="ai-history-empty">История пуста — запустите первый анализ</p>
        </div>
      </div>

    </div>
  `;
}

// ===== Инициализация =====
function initAIPage() {
  // Таймфрейм-кнопки
  const tfGroup = document.getElementById('aiTimeframeGroup');
  if (tfGroup) {
    tfGroup.querySelectorAll('.ai-tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tfGroup.querySelectorAll('.ai-tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTimeframe = btn.getAttribute('data-tf');
      });
    });
  }

  // Загрузка всех виджетов
  loadAllWidgets();

  // Автообновление каждые 60 сек
  if (aiRefreshInterval) clearInterval(aiRefreshInterval);
  aiRefreshInterval = setInterval(() => {
    loadAllWidgets();
    updateTimestamp();
  }, 60000);

  // Закрытие dropdown при клике вне
  document.addEventListener('click', handleAssetDropdownClose);
}

function updateTimestamp() {
  const el = document.getElementById('aiUpdateStatus');
  if (el) {
    const now = new Date();
    el.textContent = `Обновлено: ${now.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'})} • каждые 60 сек`;
  }
}

// ===== Загрузка всех виджетов =====
async function loadAllWidgets() {
  loadMarketCapWidget();
  loadFearGreedWidget();
  loadAiAccuracyWidget();
}

// ===== Виджет: Общая капитализация =====
async function loadMarketCapWidget() {
  try {
    const resp = await apiFetch('/api/market/global');
    const data = await resp.json();
    if (!data.success) return;

    const capEl = document.getElementById('widgetMarketCap');
    const subEl = document.getElementById('widgetMarketCapSub');
    if (!capEl) return;

    // Форматирование
    const cap = data.totalMarketCap;
    let capStr;
    if (cap >= 1e12) capStr = `$${(cap / 1e12).toFixed(2)}T`;
    else if (cap >= 1e9) capStr = `$${(cap / 1e9).toFixed(1)}B`;
    else capStr = `$${(cap / 1e6).toFixed(0)}M`;

    capEl.textContent = capStr;

    if (subEl) {
      const change = data.marketCapChange24h;
      const up = change >= 0;
      subEl.innerHTML = `${up ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}% за 24ч &nbsp;•&nbsp; BTC: ${data.btcDominance.toFixed(1)}%`;
      subEl.style.color = up ? '#22c55e' : '#ef4444';
    }
  } catch (e) {
    console.error('Ошибка загрузки капитализации:', e);
  }
}

// ===== Виджет: Индекс страха и жадности =====
async function loadFearGreedWidget() {
  try {
    const resp = await apiFetch('/api/market/fear-greed');
    const data = await resp.json();
    if (!data.success) return;

    const valueEl = document.getElementById('widgetFearValue');
    const labelEl = document.getElementById('widgetFearLabel');
    const barEl = document.getElementById('widgetFearBar');
    if (!valueEl) return;

    const value = data.value;
    valueEl.textContent = value;

    // Цвет и метка по значению
    let color, bgColor, label;
    if (value <= 25) {
      color = '#ef4444'; bgColor = 'rgba(239,68,68,0.15)'; label = 'Крайний страх';
    } else if (value <= 40) {
      color = '#f97316'; bgColor = 'rgba(249,115,22,0.15)'; label = 'Страх';
    } else if (value <= 60) {
      color = '#eab308'; bgColor = 'rgba(234,179,8,0.15)'; label = 'Нейтрально';
    } else if (value <= 75) {
      color = '#22c55e'; bgColor = 'rgba(34,197,94,0.15)'; label = 'Жадность';
    } else {
      color = '#10b981'; bgColor = 'rgba(16,185,129,0.15)'; label = 'Крайняя жадность';
    }

    // Переводим label с API если есть
    const translations = {
      'Extreme Fear': 'Крайний страх',
      'Fear': 'Страх',
      'Neutral': 'Нейтрально',
      'Greed': 'Жадность',
      'Extreme Greed': 'Крайняя жадность',
    };
    label = translations[data.label] || label;

    valueEl.style.color = color;
    if (labelEl) {
      labelEl.textContent = label;
      labelEl.style.background = bgColor;
      labelEl.style.color = color;
    }
    if (barEl) {
      barEl.style.width = `${value}%`;
      barEl.style.background = `linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #10b981)`;
    }
  } catch (e) {
    console.error('Ошибка загрузки индекса страха:', e);
  }
}

// ===== Виджет: Точность ИИ =====
async function loadAiAccuracyWidget() {
  try {
    const resp = await apiFetch('/api/dashboard/stats');
    const data = await resp.json();
    if (!data.success) return;

    const acc = data.stats.aiAccuracy;
    const el = document.getElementById('widgetAiAccuracy');
    const sub = document.getElementById('widgetAiAccuracySub');
    if (el) el.textContent = `${acc.toFixed(1)}%`;
    if (sub) {
      if (acc === 0) { sub.textContent = 'Нет данных'; sub.style.color = 'rgba(255,255,255,0.4)'; }
      else if (acc >= 70) { sub.textContent = '↑ Высокая точность'; sub.style.color = '#22c55e'; }
      else if (acc >= 50) { sub.textContent = '→ Средняя точность'; sub.style.color = '#eab308'; }
      else { sub.textContent = '↓ Низкая точность'; sub.style.color = '#ef4444'; }
    }
  } catch (e) {}
}

// ===== Поиск активов =====
const DEFAULT_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'TON', name: 'Toncoin' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'PEPE', name: 'Pepe' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'FIL', name: 'Filecoin' },
];

function onAssetInputFocus() {
  const input = document.getElementById('aiAssetInput');
  if (input) input.select();
  const query = (input ? input.value : '').trim();
  if (query.length < 2) {
    showDefaultAssets();
  } else {
    onAssetSearch(query);
  }
}

function showDefaultAssets() {
  const dd = document.getElementById('aiAssetDropdown');
  if (!dd) return;
  dd.style.display = 'block';
  dd.innerHTML = `
    <div style="padding:0.5rem 1rem 0.3rem;font-size:0.72rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.05em;">Популярные активы</div>
    ${DEFAULT_ASSETS.map(a => assetOptionHTML(a.symbol, a.name)).join('')}
  `;
}

function onAssetSearch(query) {
  const q = query.trim().toUpperCase();
  const dd = document.getElementById('aiAssetDropdown');
  if (!dd) return;

  if (q.length < 1) {
    showDefaultAssets();
    return;
  }

  // Сначала фильтруем по дефолтным
  const localResults = DEFAULT_ASSETS.filter(a =>
    a.symbol.includes(q) || a.name.toUpperCase().includes(q)
  );

  if (localResults.length > 0) {
    dd.style.display = 'block';
    dd.innerHTML = localResults.map(a => assetOptionHTML(a.symbol, a.name)).join('');
  }

  // Дебаунс для API поиска
  clearTimeout(searchDebounceTimer);
  if (q.length >= 2) {
    searchDebounceTimer = setTimeout(() => searchAssetsAPI(q), 300);
  }
}

async function searchAssetsAPI(query) {
  try {
    const resp = await apiFetch(`/api/market/search?q=${encodeURIComponent(query)}`);
    const data = await resp.json();
    if (!data.success) return;

    const dd = document.getElementById('aiAssetDropdown');
    if (!dd) return;

    const results = data.results;
    if (results.length === 0) {
      // Оставляем локальные результаты
      return;
    }

    // Мержим: дефолтные первыми, потом API
    const localSymbols = DEFAULT_ASSETS.map(a => a.symbol);
    const apiOnly = results.filter(r => !localSymbols.includes(r.symbol));
    const localMatched = DEFAULT_ASSETS.filter(a =>
      a.symbol.includes(query) || a.name.toUpperCase().includes(query)
    );

    let html = '';
    if (localMatched.length > 0) {
      html += localMatched.map(a => assetOptionHTML(a.symbol, a.name)).join('');
    }
    if (apiOnly.length > 0) {
      if (localMatched.length > 0) {
        html += `<div style="border-top:1px solid rgba(255,255,255,0.06);margin:0.3rem 0;"></div>`;
        html += `<div style="padding:0.3rem 1rem 0.2rem;font-size:0.72rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.05em;">Другие на Binance</div>`;
      }
      html += apiOnly.map(a => assetOptionHTML(a.symbol, a.symbol)).join('');
    }

    dd.style.display = 'block';
    dd.innerHTML = html;
  } catch (e) {
    console.error('Ошибка поиска:', e);
  }
}

function assetOptionHTML(symbol, name) {
  const colors = {
    BTC:'#f7931a', ETH:'#627eea', BNB:'#f3ba2f', SOL:'#9945ff', XRP:'#346aa9',
    ADA:'#0033ad', DOGE:'#c2a633', TON:'#0088cc', AVAX:'#e84142', LINK:'#2a5ada',
    DOT:'#e6007a', LTC:'#bfbbbb', ATOM:'#2e3148', UNI:'#ff007a', MATIC:'#8247e5',
    PEPE:'#4a8c3f', SHIB:'#ffa409', ARB:'#28a0f0', OP:'#ff0420', FIL:'#0090ff',
  };
  const color = colors[symbol] || '#3b82f6';

  return `
    <div onclick="selectAIAsset('${symbol}')"
      style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 1rem;cursor:pointer;transition:background 0.15s;"
      onmouseover="this.style.background='rgba(255,255,255,0.06)'"
      onmouseout="this.style.background='transparent'">
      <div style="width:28px;height:28px;border-radius:6px;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.75rem;font-family:'Space Grotesk',sans-serif;flex-shrink:0;">
        ${symbol.slice(0, 2)}
      </div>
      <div>
        <span style="color:#fff;font-weight:600;font-size:0.9rem;">${symbol}</span>
        <span style="color:rgba(255,255,255,0.35);font-size:0.8rem;margin-left:0.5rem;">${name !== symbol ? name : ''}</span>
      </div>
    </div>
  `;
}

function selectAIAsset(symbol) {
  const input = document.getElementById('aiAssetInput');
  if (input) input.value = symbol;
  const dd = document.getElementById('aiAssetDropdown');
  if (dd) dd.style.display = 'none';

  // Загрузить цену
  loadAssetPrice(symbol);
}

async function loadAssetPrice(symbol) {
  const priceEl = document.getElementById('aiAssetPrice');
  if (!priceEl) return;
  try {
    const resp = await apiFetch(`/api/market/price/${symbol}`);
    const data = await resp.json();
    if (data.success) {
      const p = data.price;
      const pStr = p >= 1000 ? `$${p.toLocaleString('en-US',{maximumFractionDigits:2})}` : p < 1 ? `$${p.toFixed(6)}` : `$${p.toFixed(2)}`;
      const up = data.changePercent >= 0;
      priceEl.innerHTML = `${pStr} <span style="color:${up ? '#22c55e' : '#ef4444'};font-size:0.72rem;">${up ? '▲' : '▼'}${Math.abs(data.changePercent).toFixed(2)}%</span>`;
    }
  } catch (e) {
    priceEl.textContent = '';
  }
}

function handleAssetDropdownClose(e) {
  const dd = document.getElementById('aiAssetDropdown');
  const input = document.getElementById('aiAssetInput');
  if (dd && input && !dd.contains(e.target) && e.target !== input) {
    dd.style.display = 'none';
  }
}

// ===== Анализ =====
async function runAIAnalysis() {
  const btn = document.getElementById('aiAnalyzeBtn');
  const asset = document.getElementById('aiAssetInput').value.trim().toUpperCase();
  const tf = selectedTimeframe;

  if (!asset) {
    document.getElementById('aiAssetInput').style.borderColor = '#ef4444';
    setTimeout(() => document.getElementById('aiAssetInput').style.borderColor = '', 2000);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<svg class="ai-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Анализирую...`;

  try {
    const resp = await apiFetch('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ symbol: asset, timeframe: tf })
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Ошибка анализа');

    renderResult(asset, tf, data);
  } catch (e) {
    alert('Ошибка: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Анализировать`;
  }
}

function renderResult(asset, tf, data) {
  const isLong = data.signal === 'LONG';
  document.getElementById('aiSignalLabel').textContent = data.signal;
  document.getElementById('aiSignalLabel').style.color = isLong ? '#22c55e' : '#ef4444';
  document.getElementById('aiSignalCard').style.borderColor = isLong ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)';
  document.getElementById('aiSignalAsset').textContent = `${asset} / ${tf}`;
  document.getElementById('aiConfidenceValue').textContent = `${data.confidence}%`;
  document.getElementById('aiProgressBar').style.width = `${data.confidence}%`;
  document.getElementById('aiProgressBar').style.background = data.confidence > 70 ? '#22c55e' : '#eab308';
  document.getElementById('aiExplanation').textContent = data.summary || '';

  renderDetailSections(data);
  renderIndicators(data.indicators);
  renderLevels(data.levels);

  const resultWrap = document.getElementById('aiResultWrap');
  resultWrap.style.display = 'block';
  resultWrap.style.animation = 'aiFadeIn 0.4s ease forwards';
  addToHistory(asset, tf, data);
}

function renderDetailSections(data) {
  const sections = [
    { icon: '🔍', title: 'Общая картина', text: data.summary, accent: 'blue' },
    { icon: '📈', title: 'Анализ тренда', text: data.trend_analysis, accent: data.signal === 'LONG' ? 'green' : 'red' },
    { icon: '📊', title: 'Разбор индикаторов', text: data.indicator_analysis, accent: 'purple' },
    { icon: '⚡', title: 'Почему входить сейчас', text: data.entry_reason, accent: data.signal === 'LONG' ? 'green' : 'red' },
    { icon: '⚠️', title: 'Риски и сценарий отмены', text: data.risk_analysis, accent: 'yellow' },
    { icon: '🎯', title: `Почему точность ${data.confidence}%`, text: data.confidence_reason, accent: 'purple' },
  ];

  const accentColors = {
    blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: '#3b82f6' },
    green:  { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   icon: '#22c55e' },
    red:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   icon: '#ef4444' },
    purple: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: '#a78bfa' },
    yellow: { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   icon: '#eab308' },
  };

  const wrap = document.getElementById('aiDetailSections');
  wrap.innerHTML = sections.filter(s => s.text).map(s => {
    const c = accentColors[s.accent];
    return `
      <div class="ai-detail-section" style="background:${c.bg};border:1px solid ${c.border};">
        <div class="ai-detail-section-title" style="color:${c.icon};">${s.icon} ${s.title}</div>
        <p class="ai-detail-section-text">${s.text}</p>
      </div>
    `;
  }).join('');
}

function renderIndicators(ind) {
  function fmt(v, d = 2) { return v == null ? '—' : v >= 1000 ? v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : v < 1 ? v.toFixed(4) : v.toFixed(d); }
  function sig(v, buy, sell) {
    if (v == null) return '<span style="color:rgba(255,255,255,0.4)">—</span>';
    if (buy(v)) return '<span style="color:#22c55e">Покупать</span>';
    if (sell(v)) return '<span style="color:#ef4444">Продавать</span>';
    return '<span style="color:rgba(255,255,255,0.45)">Нейтрально</span>';
  }
  const emaSignal = ind.ema20 && ind.ema50
    ? (ind.ema20 > ind.ema50 ? '<span style="color:#22c55e">Покупать</span>' : '<span style="color:#ef4444">Продавать</span>')
    : '<span style="color:rgba(255,255,255,0.4)">—</span>';
  const bbPos = ind.bb_upper && ind.bb_lower && ind.ema20
    ? (ind.ema20 < ind.bb_middle ? '<span style="color:#22c55e">Ниже средней</span>' : '<span style="color:#ef4444">Выше средней</span>')
    : '<span style="color:rgba(255,255,255,0.4)">—</span>';

  const indicators = [
    { name: 'RSI (14)', value: fmt(ind.rsi, 1), signal: sig(ind.rsi, v => v < 45, v => v > 65) },
    { name: 'MACD', value: fmt(ind.macd, 4), signal: sig(ind.macd, v => v > 0, v => v < 0) },
    { name: 'EMA 20 / 50', value: `${fmt(ind.ema20)} / ${fmt(ind.ema50)}`, signal: emaSignal },
    { name: 'Bollinger (mid)', value: fmt(ind.bb_middle), signal: bbPos },
    { name: 'BB Верхняя', value: fmt(ind.bb_upper), signal: '<span style="color:rgba(255,255,255,0.4)">Сопротивление</span>' },
    { name: 'BB Нижняя', value: fmt(ind.bb_lower), signal: '<span style="color:rgba(255,255,255,0.4)">Поддержка</span>' },
  ];

  document.getElementById('aiIndicatorsGrid').innerHTML = indicators.map(i => `
    <div class="ai-indicator-card">
      <div class="ai-ind-name">${i.name}</div>
      <div class="ai-ind-value">${i.value}</div>
      <div class="ai-ind-signal">${i.signal}</div>
    </div>
  `).join('');
}

function renderLevels(levels) {
  function fmt(v) { return !v ? '—' : v >= 1000 ? v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : v < 1 ? v.toFixed(4) : v.toFixed(2); }
  const entry = levels.entry, tp = levels.tp, sl = levels.sl;
  const tpPct = entry ? ((Math.abs(tp - entry) / entry) * 100).toFixed(2) : null;
  const slPct = entry ? ((Math.abs(sl - entry) / entry) * 100).toFixed(2) : null;
  const rr = tpPct && slPct && parseFloat(slPct) > 0 ? (parseFloat(tpPct) / parseFloat(slPct)).toFixed(2) : null;

  document.getElementById('aiLevelsGrid').innerHTML = `
    <div class="ai-level-card">
      <div class="ai-level-label">Точка входа</div>
      <div class="ai-level-value" style="color:#3b82f6">$${fmt(entry)}</div>
    </div>
    <div class="ai-level-card">
      <div class="ai-level-label">Take Profit</div>
      <div class="ai-level-value" style="color:#22c55e">$${fmt(tp)}</div>
      ${tpPct ? `<div class="ai-level-sub">+${tpPct}%</div>` : ''}
    </div>
    <div class="ai-level-card">
      <div class="ai-level-label">Stop Loss</div>
      <div class="ai-level-value" style="color:#ef4444">$${fmt(sl)}</div>
      ${slPct ? `<div class="ai-level-sub">-${slPct}%</div>` : ''}
    </div>
    <div class="ai-level-card">
      <div class="ai-level-label">Risk / Reward</div>
      <div class="ai-level-value" style="color:#a78bfa">${rr ? `1 : ${rr}` : '—'}</div>
    </div>
  `;
}

// ===== История =====
function addToHistory(asset, tf, data) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  analysisHistory.unshift({ asset, tf, time: timeStr, data });
  if (analysisHistory.length > 20) analysisHistory.pop();
  renderHistory();
}

function renderHistory() {
  const wrap = document.getElementById('aiHistoryWrap');
  if (!analysisHistory.length) {
    wrap.innerHTML = '<p class="ai-history-empty">История пуста — запустите первый анализ</p>';
    return;
  }
  wrap.innerHTML = `
    <table class="ai-history-table">
      <thead><tr><th>Актив</th><th>Тайм.</th><th>Сигнал</th><th>Уверен.</th><th>Время</th><th></th></tr></thead>
      <tbody>
        ${analysisHistory.map((row, idx) => `
          <tr>
            <td><strong>${row.asset}</strong></td>
            <td style="color:rgba(255,255,255,0.5)">${row.tf}</td>
            <td style="color:${row.data.signal === 'LONG' ? '#22c55e' : '#ef4444'};font-weight:600">${row.data.signal}</td>
            <td>${row.data.confidence}%</td>
            <td style="color:rgba(255,255,255,0.4);font-size:0.82rem">${row.time}</td>
            <td><button class="ai-history-btn" onclick="showHistoryResult(${idx})">Анализ</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function showHistoryResult(idx) {
  const row = analysisHistory[idx];
  if (!row) return;
  const data = row.data;
  const isLong = data.signal === 'LONG';

  const accentColors = {
    blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
    green:  { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)' },
    red:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
    purple: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
    yellow: { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)' },
  };

  const sections = [
    { title: 'Общая картина', text: data.summary, accent: 'blue' },
    { title: 'Анализ тренда', text: data.trend_analysis, accent: isLong ? 'green' : 'red' },
    { title: 'Разбор индикаторов', text: data.indicator_analysis, accent: 'purple' },
    { title: 'Почему входить', text: data.entry_reason, accent: isLong ? 'green' : 'red' },
    { title: 'Риски', text: data.risk_analysis, accent: 'yellow' },
    { title: `Точность ${data.confidence}%`, text: data.confidence_reason, accent: 'purple' },
  ].filter(s => s.text);

  const sectionsHTML = sections.map(s => {
    const c = accentColors[s.accent];
    return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:1rem 1.25rem;margin-bottom:0.75rem;">
      <div style="color:rgba(255,255,255,0.7);font-family:'Space Grotesk',sans-serif;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;">${s.title}</div>
      <p style="font-size:0.9rem;color:rgba(255,255,255,0.75);line-height:1.65;margin:0;">${s.text}</p>
    </div>`;
  }).join('');

  const existing = document.getElementById('aiHistoryModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'aiHistoryModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:aiFadeIn 0.2s ease;`;
  modal.innerHTML = `
    <div style="background:#111116;border:1px solid rgba(255,255,255,0.08);border-radius:16px;width:100%;max-width:680px;max-height:88vh;overflow-y:auto;padding:1.75rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;">
        <div>
          <div style="font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:700;color:#fff;">
            ${row.asset} / ${row.tf} <span style="color:${isLong ? '#22c55e' : '#ef4444'}">${data.signal}</span>
          </div>
          <div style="font-size:0.8rem;color:rgba(255,255,255,0.35);margin-top:0.2rem;">${row.time}</div>
        </div>
        <button onclick="document.getElementById('aiHistoryModal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;width:32px;height:32px;cursor:pointer;color:rgba(255,255,255,0.6);font-size:1.1rem;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
      ${sectionsHTML}
      ${data.levels ? `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;margin-top:0.5rem;">
        <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:0.9rem;text-align:center;">
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);">Вход</div>
          <div style="color:#3b82f6;font-weight:700;">$${data.levels.entry.toFixed(2)}</div>
        </div>
        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:0.9rem;text-align:center;">
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);">TP</div>
          <div style="color:#22c55e;font-weight:700;">$${data.levels.tp.toFixed(2)}</div>
        </div>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:0.9rem;text-align:center;">
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);">SL</div>
          <div style="color:#ef4444;font-weight:700;">$${data.levels.sl.toFixed(2)}</div>
        </div>
        <div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:10px;padding:0.9rem;text-align:center;">
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);">R/R</div>
          <div style="color:#a78bfa;font-weight:700;">${(() => { const t=Math.abs(data.levels.tp-data.levels.entry)/data.levels.entry*100; const s=Math.abs(data.levels.sl-data.levels.entry)/data.levels.entry*100; return s>0?'1:'+(t/s).toFixed(2):'—'; })()}</div>
        </div>
      </div>` : ''}
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
