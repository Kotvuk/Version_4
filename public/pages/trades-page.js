// ===================================
// ПАНЕЛЬ: СПИСОК СДЕЛОК
// ===================================

let currentDemoAccountId = null;
let _allAccounts = [];

function getTradesContent() {
  return `
    <div class="trades-header">
      <div class="account-switcher-wrap">
        <div id="accountLeft" class="account-slot"></div>
        <button class="balance-center-btn" onclick="openEditBalanceModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Изменить баланс
        </button>
        <div id="accountRight" class="account-slot"></div>
      </div>
      <div id="accountSwitcher" style="display:none;"></div>
    </div>

    <div class="account-stats-card" id="accountStatsCard"></div>

    <div class="trades-card">
      <div class="trades-card-header">
        <h3>Список сделок</h3>
        <button class="add-trade-btn" onclick="openAddTradeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Добавить сделку
        </button>
      </div>
      <div class="trades-table-container">
        <table class="trades-table" id="tradesTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Символ</th>
              <th>Тип</th>
              <th>Количество</th>
              <th>Вход</th>
              <th>Выход</th>
              <th>Профит</th>
              <th>Статус</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody id="tradesTableBody">
            <tr><td colspan="9" class="empty-state">Загрузка...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function loadTradesPage() {
  try {
    const response = await apiFetch('/api/demo-accounts');
    const data = await response.json();
    
    if (data.success && data.accounts.length > 0) {
      const sorted = data.accounts.sort((a, b) => {
        if (a.account_type === 'user') return -1;
        if (b.account_type === 'user') return 1;
        return 0;
      });
      _allAccounts = sorted;
      renderAccountSwitcher(sorted);
      currentDemoAccountId = sorted[0].id;
      loadAccountData(currentDemoAccountId);
    }
  } catch (error) {
    console.error('Ошибка загрузки счетов:', error);
  }
}

function renderAccountSwitcher(accounts) {
  const left  = document.getElementById('accountLeft');
  const right = document.getElementById('accountRight');
  if (!left || !right) return;

  function makeBtn(account, active) {
    const btn = document.createElement('button');
    btn.className = 'account-btn' + (active ? ' active' : '');
    btn.dataset.accountId = account.id;
    btn.innerHTML = `
      <div class="account-btn-icon ${account.account_type}">
        ${account.account_type === 'user' ? '👤' : '🤖'}
      </div>
      <div class="account-btn-info">
        <p class="account-btn-name">${account.name}</p>
        <p class="account-btn-type">${account.account_type === 'user' ? 'Пользовательский' : 'ИИ'}</p>
      </div>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDemoAccountId = account.id;
      loadAccountData(account.id);
    });
    return btn;
  }

  left.innerHTML = '';
  right.innerHTML = '';
  if (accounts[0]) left.appendChild(makeBtn(accounts[0], true));
  if (accounts[1]) right.appendChild(makeBtn(accounts[1], false));
}

async function loadAccountData(accountId) {
  try {
    const statsResponse = await apiFetch(`/api/demo-accounts/${accountId}/stats`);
    const statsData = await statsResponse.json();
    if (statsData.success) renderAccountStats(statsData.stats);
    
    const tradesResponse = await apiFetch(`/api/demo-accounts/${accountId}/trades`);
    const tradesData = await tradesResponse.json();
    if (tradesData.success) renderTradesTable(tradesData.trades);
  } catch (error) {
    console.error('Ошибка загрузки данных счёта:', error);
  }
}

function renderAccountStats(stats) {
  const statsCard = document.getElementById('accountStatsCard');
  if (!statsCard) return;
  
  const account = stats.account;
  const profitPercent = ((account.balance - account.initial_balance) / account.initial_balance * 100).toFixed(2);
  const profitAmount = (account.balance - account.initial_balance).toFixed(2);

  statsCard.innerHTML = `
    <div class="account-stat">
      <p class="account-stat-label">Текущий баланс</p>
      <p class="account-stat-value">$${account.balance.toFixed(2)}</p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Начальный баланс</p>
      <p class="account-stat-value secondary">$${account.initial_balance.toFixed(2)}</p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Профит/убыток</p>
      <p class="account-stat-value ${profitAmount >= 0 ? 'profit' : 'loss'}">
        ${profitAmount >= 0 ? '+' : ''}$${profitAmount} (${profitAmount >= 0 ? '+' : ''}${profitPercent}%)
      </p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Всего сделок</p>
      <p class="account-stat-value">${stats.totalTrades}</p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Активных сделок</p>
      <p class="account-stat-value">${stats.activeTrades}</p>
    </div>
  `;
}

function openEditBalanceModal(preselectedId) {
  const old = document.getElementById('editBalanceModal');
  if (old) old.remove();
  if (_allAccounts.length === 0) return;

  const firstAccount = _allAccounts.find(a => a.id == preselectedId) || _allAccounts[0];
  const accountId = firstAccount.id;
  const currentBalance = firstAccount.balance;

  const modal = document.createElement('div');
  modal.id = 'editBalanceModal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(6px);`;

  const accountTabs = _allAccounts.map(a => `
    <button class="modal-account-tab ${a.id === accountId ? 'active' : ''}"
      data-id="${a.id}" data-balance="${a.balance}" data-name="${a.name}"
      onclick="switchModalAccount(${a.id})">
      👤 ${a.name}
      <span style="font-size:0.75rem;opacity:0.6;margin-left:6px;">$${a.balance.toFixed(2)}</span>
    </button>
  `).join('');

  modal.innerHTML = `
    <div style="background:#13131a;border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:2rem;width:400px;max-width:92vw;">
      <h3 style="font-family:'Space Grotesk',sans-serif;color:#fff;font-size:1.1rem;margin-bottom:1.25rem;">Изменить баланс</h3>
      <p style="color:rgba(255,255,255,0.45);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;">Счёт</p>
      <div id="modalAccountTabs" style="display:flex;gap:0.5rem;margin-bottom:1.25rem;flex-wrap:wrap;">${accountTabs}</div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0.9rem 1rem;margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:rgba(255,255,255,0.5);font-size:0.85rem;">Текущий баланс</span>
        <span id="modalCurrentBalance" style="font-family:'Space Grotesk',sans-serif;font-size:1.2rem;font-weight:700;color:#fff;">$${currentBalance.toFixed(2)}</span>
      </div>
      <p style="color:rgba(255,255,255,0.5);font-size:0.78rem;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em;">Сумма изменения</p>
      <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;">
        <button onclick="adjustModalBalance(-1)" style="width:44px;height:44px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.1);color:#ef4444;font-size:1.4rem;cursor:pointer;flex-shrink:0;line-height:1;">−</button>
        <input id="balanceAmountInput" type="number" min="0" step="100" value="1000" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.7rem 1rem;color:#fff;font-size:1rem;outline:none;text-align:center;" />
        <button onclick="adjustModalBalance(1)" style="width:44px;height:44px;border-radius:8px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#22c55e;font-size:1.4rem;cursor:pointer;flex-shrink:0;line-height:1;">+</button>
      </div>
      <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${[100,500,1000,5000,10000].map(v => `
          <button onclick="document.getElementById('balanceAmountInput').value=${v}" style="padding:0.35rem 0.75rem;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:0.8rem;cursor:pointer;">$${v.toLocaleString()}</button>
        `).join('')}
      </div>
      <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:0.9rem 1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:rgba(255,255,255,0.5);font-size:0.85rem;">Новый баланс</span>
        <span id="newBalancePreview" style="font-family:'Space Grotesk',sans-serif;font-size:1.2rem;font-weight:700;color:#3b82f6;">$${currentBalance.toFixed(2)}</span>
      </div>
      <div style="display:flex;gap:0.75rem;">
        <button onclick="document.getElementById('editBalanceModal').remove()" style="flex:1;padding:0.7rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#aaa;cursor:pointer;font-size:0.9rem;">Отмена</button>
        <button onclick="saveBalanceFromModal()" style="flex:2;padding:0.7rem;border-radius:8px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;">Сохранить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.dataset.accountId = accountId;
  modal.dataset.currentBalance = currentBalance;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function switchModalAccount(id) {
  const account = _allAccounts.find(a => a.id === id);
  if (!account) return;
  const modal = document.getElementById('editBalanceModal');
  modal.dataset.accountId = account.id;
  modal.dataset.currentBalance = account.balance;
  document.querySelectorAll('.modal-account-tab').forEach(t => {
    t.classList.toggle('active', parseInt(t.dataset.id) === id);
  });
  document.getElementById('modalCurrentBalance').textContent = `$${account.balance.toFixed(2)}`;
  const preview = document.getElementById('newBalancePreview');
  preview.textContent = `$${account.balance.toFixed(2)}`;
  preview.style.color = '#3b82f6';
  delete preview.dataset.value;
}

function adjustModalBalance(direction) {
  const modal = document.getElementById('editBalanceModal');
  const currentBalance = parseFloat(modal.dataset.currentBalance) || 0;
  const input = document.getElementById('balanceAmountInput');
  const amount = parseFloat(input.value) || 0;
  if (amount <= 0) { input.style.borderColor = '#ef4444'; return; }
  input.style.borderColor = 'rgba(255,255,255,0.12)';
  const newBalance = Math.max(0, currentBalance + direction * amount);
  const preview = document.getElementById('newBalancePreview');
  preview.textContent = `$${newBalance.toFixed(2)}`;
  preview.style.color = direction > 0 ? '#22c55e' : '#ef4444';
  preview.dataset.value = newBalance;
}

async function saveBalanceFromModal() {
  const modal = document.getElementById('editBalanceModal');
  const accountId = modal.dataset.accountId;
  const preview = document.getElementById('newBalancePreview');
  const newBalance = parseFloat(preview.dataset.value);
  if (isNaN(newBalance) || newBalance < 0) { modal.remove(); return; }

  try {
    const response = await apiFetch(`/api/demo-accounts/${accountId}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ balance: newBalance })
    });
    const data = await response.json();
    if (data.success) {
      const acc = _allAccounts.find(a => a.id == accountId);
      if (acc) acc.balance = newBalance;
      modal.remove();
      loadAccountData(currentDemoAccountId);
    } else {
      alert('Ошибка: ' + data.error);
    }
  } catch (err) {
    alert('Ошибка соединения');
  }
}

// ===== Добавление сделки =====
const POPULAR_ASSETS = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TON','AVAX','MATIC','DOT','LINK','LTC','UNI','ATOM'];

function openAddTradeModal() {
  const old = document.getElementById('addTradeModal');
  if (old) old.remove();

  const accountOptions = _allAccounts.map(a =>
    `<option value="${a.id}" ${a.id == currentDemoAccountId ? 'selected' : ''}>${a.account_type === 'user' ? '👤' : '🤖'} ${a.name}</option>`
  ).join('');

  const S = `width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.65rem 1rem;color:#fff;font-size:0.9rem;outline:none;font-family:'Inter',sans-serif;box-sizing:border-box;`;
  const L = `display:block;color:rgba(255,255,255,0.45);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.4rem;`;

  const modal = document.createElement('div');
  modal.id = 'addTradeModal';
  modal.dataset.direction = 'buy';
  modal.dataset.orderType = 'market';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(6px);`;

  modal.innerHTML = `
    <div style="background:#13131a;border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:2rem;width:460px;max-width:92vw;max-height:90vh;overflow-y:auto;">
      <h3 style="font-family:'Space Grotesk',sans-serif;color:#fff;font-size:1.1rem;margin-bottom:1.5rem;">Открыть сделку</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div style="grid-column:1/-1;position:relative;">
          <label style="${L}">Актив <span style="color:#ef4444">*</span></label>
          <input id="tradeAsset" type="text" placeholder="Поиск: BTC, ETH, SOL..." autocomplete="off" style="${S}" oninput="filterAssets(this.value)" onfocus="showAssetDropdown()" />
          <div id="assetDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#1a1a24;border:1px solid rgba(255,255,255,0.1);border-radius:8px;margin-top:4px;max-height:180px;overflow-y:auto;z-index:100;"></div>
        </div>
        <div>
          <label style="${L}">Направление</label>
          <div style="display:flex;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
            <button id="btnLong" onclick="setDirection('buy')" style="flex:1;padding:0.6rem;border:none;background:rgba(34,197,94,0.15);color:#22c55e;cursor:pointer;font-size:0.85rem;font-weight:700;font-family:'Inter',sans-serif;">LONG</button>
            <button id="btnShort" onclick="setDirection('sell')" style="flex:1;padding:0.6rem;border:none;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4);cursor:pointer;font-size:0.85rem;font-weight:700;font-family:'Inter',sans-serif;">SHORT</button>
          </div>
        </div>
        <div>
          <label style="${L}">Тип ордера</label>
          <div style="display:flex;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
            <button id="btnMarket" onclick="setOrderType('market')" style="flex:1;padding:0.6rem;border:none;background:rgba(59,130,246,0.15);color:#3b82f6;cursor:pointer;font-size:0.85rem;font-weight:600;font-family:'Inter',sans-serif;">Рыночный</button>
            <button id="btnLimit" onclick="setOrderType('limit')" style="flex:1;padding:0.6rem;border:none;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4);cursor:pointer;font-size:0.85rem;font-weight:600;font-family:'Inter',sans-serif;">Лимитный</button>
          </div>
        </div>
        <div>
          <label style="${L}">Сумма входа ($) <span style="color:#ef4444">*</span></label>
          <input id="tradeAmount" type="number" min="0" step="0.01" placeholder="$0.00" style="${S}" />
        </div>
        <div>
          <label style="${L}">Точка входа ($) <span style="color:#ef4444">*</span></label>
          <input id="tradeEntryPrice" type="number" min="0" step="0.01" placeholder="$0.00" style="${S}" />
        </div>
        <div>
          <label style="${L}">Take Profit ($)</label>
          <input id="tradeTP" type="number" min="0" step="0.01" placeholder="Опционально" style="${S}" />
        </div>
        <div>
          <label style="${L}">Stop Loss ($)</label>
          <input id="tradeSL" type="number" min="0" step="0.01" placeholder="Опционально" style="${S}" />
        </div>
        <div style="grid-column:1/-1;">
          <label style="${L}">Счёт</label>
          <select id="tradeAccount" style="${S};cursor:pointer;">${accountOptions}</select>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
        <button onclick="document.getElementById('addTradeModal').remove()" style="flex:1;padding:0.7rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#aaa;cursor:pointer;font-size:0.9rem;font-family:'Inter',sans-serif;">Отмена</button>
        <button onclick="submitAddTrade()" style="flex:2;padding:0.7rem;border-radius:8px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:'Inter',sans-serif;">Открыть сделку</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  showAssetDropdown();
}

function showAssetDropdown() {
  const input = document.getElementById('tradeAsset');
  if (!input) return;
  filterAssets(input.value);
  document.getElementById('assetDropdown').style.display = 'block';
  setTimeout(() => {
    document.addEventListener('click', hideAssetOnClickOutside, { once: false });
  }, 100);
}

function hideAssetOnClickOutside(e) {
  const dd = document.getElementById('assetDropdown');
  const input = document.getElementById('tradeAsset');
  if (dd && !dd.contains(e.target) && e.target !== input) {
    dd.style.display = 'none';
    document.removeEventListener('click', hideAssetOnClickOutside);
  }
}

function filterAssets(query) {
  const dd = document.getElementById('assetDropdown');
  if (!dd) return;
  const q = query.toUpperCase();
  const filtered = q ? POPULAR_ASSETS.filter(a => a.includes(q)) : POPULAR_ASSETS;
  if (filtered.length === 0) { dd.style.display = 'none'; return; }
  dd.style.display = 'block';
  dd.innerHTML = filtered.map(a => `
    <div onclick="selectAsset('${a}')" style="padding:0.6rem 1rem;cursor:pointer;color:#e0e0e0;font-size:0.9rem;font-family:'Inter',sans-serif;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.background='transparent'">${a}</div>
  `).join('');
}

function selectAsset(asset) {
  const input = document.getElementById('tradeAsset');
  if (input) input.value = asset;
  const dd = document.getElementById('assetDropdown');
  if (dd) dd.style.display = 'none';
}

function setDirection(dir) {
  const modal = document.getElementById('addTradeModal');
  if (!modal) return;
  modal.dataset.direction = dir;
  const btnLong = document.getElementById('btnLong');
  const btnShort = document.getElementById('btnShort');
  if (dir === 'buy') {
    btnLong.style.background = 'rgba(34,197,94,0.15)'; btnLong.style.color = '#22c55e';
    btnShort.style.background = 'rgba(255,255,255,0.04)'; btnShort.style.color = 'rgba(255,255,255,0.4)';
  } else {
    btnShort.style.background = 'rgba(239,68,68,0.15)'; btnShort.style.color = '#ef4444';
    btnLong.style.background = 'rgba(255,255,255,0.04)'; btnLong.style.color = 'rgba(255,255,255,0.4)';
  }
}

function setOrderType(type) {
  const modal = document.getElementById('addTradeModal');
  if (!modal) return;
  modal.dataset.orderType = type;
  const btnM = document.getElementById('btnMarket');
  const btnL = document.getElementById('btnLimit');
  if (type === 'market') {
    btnM.style.background = 'rgba(59,130,246,0.15)'; btnM.style.color = '#3b82f6';
    btnL.style.background = 'rgba(255,255,255,0.04)'; btnL.style.color = 'rgba(255,255,255,0.4)';
  } else {
    btnL.style.background = 'rgba(59,130,246,0.15)'; btnL.style.color = '#3b82f6';
    btnM.style.background = 'rgba(255,255,255,0.04)'; btnM.style.color = 'rgba(255,255,255,0.4)';
  }
}

async function submitAddTrade() {
  const modal = document.getElementById('addTradeModal');
  const accountId = document.getElementById('tradeAccount').value;
  const symbol = document.getElementById('tradeAsset').value.trim().toUpperCase();
  const type = modal.dataset.direction || 'buy';
  const amount = parseFloat(document.getElementById('tradeAmount').value);
  const entryPrice = parseFloat(document.getElementById('tradeEntryPrice').value);

  if (!symbol) { highlight('tradeAsset'); return; }
  if (isNaN(amount) || amount <= 0) { highlight('tradeAmount'); return; }
  if (isNaN(entryPrice) || entryPrice <= 0) { highlight('tradeEntryPrice'); return; }

  try {
    const response = await apiFetch(`/api/demo-accounts/${accountId}/trades`, {
      method: 'POST',
      body: JSON.stringify({ symbol, type, amount, entry_price: entryPrice, exit_price: null, profit: 0, status: 'open' })
    });
    const data = await response.json();
    if (data.success) {
      modal.remove();
      loadAccountData(currentDemoAccountId);
    } else {
      alert('Ошибка: ' + data.error);
    }
  } catch (err) {
    alert('Ошибка соединения');
  }
}

function highlight(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#ef4444';
  el.focus();
  setTimeout(() => el.style.borderColor = 'rgba(255,255,255,0.12)', 2000);
}

function renderTradesTable(trades) {
  const tbody = document.getElementById('tradesTableBody');
  if (!tbody) return;
  
  if (trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Нет сделок</td></tr>';
    return;
  }
  
  tbody.innerHTML = trades.map(trade => {
    const profit = trade.profit || 0;
    const profitClass = profit > 0 ? 'profit' : profit < 0 ? 'loss' : '';
    const statusClass = trade.status === 'open' ? 'status-open' : 'status-closed';
    
    return `
      <tr>
        <td>#${trade.id}</td>
        <td><strong>${trade.symbol}</strong></td>
        <td><span class="trade-type ${trade.type}">${trade.type === 'buy' ? 'LONG' : 'SHORT'}</span></td>
        <td>${trade.amount}</td>
        <td>$${trade.entry_price.toFixed(2)}</td>
        <td>${trade.exit_price ? '$' + trade.exit_price.toFixed(2) : '—'}</td>
        <td class="${profitClass}">${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}</td>
        <td><span class="trade-status ${statusClass}">${trade.status === 'open' ? 'Открыта' : 'Закрыта'}</span></td>
        <td>${new Date(trade.created_at).toLocaleDateString('ru-RU')}</td>
      </tr>
    `;
  }).join('');
}
