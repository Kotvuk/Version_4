// ===================================
// ПАНЕЛЬ: ДАШБОРД
// ===================================

function getDashboardContent() {
  loadDashboardStats();
  
  return `
    <div class="welcome-card">
      <h2>Добро пожаловать в KotvukAI</h2>
      <p>Автоматический анализ криптовалютных графиков с помощью искусственного интеллекта</p>
    </div>

    <div class="stats-grid-top">
      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="stat-info">
          <p class="stat-label">Общий баланс</p>
          <p class="stat-value" id="balance">$0.00</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <p class="stat-label">Нереализованный профит</p>
          <p class="stat-value" id="unrealizedProfit">$0.00</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon yellow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-info">
          <p class="stat-label">Активные сделки</p>
          <p class="stat-value" id="activeTrades">0</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
          </svg>
        </div>
        <div class="stat-info">
          <p class="stat-label">Точность ИИ анализа</p>
          <p class="stat-value" id="aiAccuracy">0%</p>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <h3>График профита</h3>
        <div class="period-selector">
          <button class="period-btn active" data-days="7">7 дней</button>
          <button class="period-btn" data-days="30">30 дней</button>
          <button class="period-btn" data-days="180">180 дней</button>
          <button class="period-btn" data-days="365">365 дней</button>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="profitChart"></canvas>
      </div>
    </div>
  `;
}

// Загрузка статистики (JWT — userId берётся из токена на сервере)
async function loadDashboardStats() {
  try {
    const response = await apiFetch('/api/dashboard/stats');
    const data = await response.json();
    
    if (data.success) {
      const stats = data.stats;
      
      const balanceEl = document.getElementById('balance');
      const unrealizedProfitEl = document.getElementById('unrealizedProfit');
      const activeTradesEl = document.getElementById('activeTrades');
      const aiAccuracyEl = document.getElementById('aiAccuracy');
      
      if (balanceEl) balanceEl.textContent = `$${stats.balance.toFixed(2)}`;
      
      if (unrealizedProfitEl) {
        const profit = stats.unrealizedProfit;
        const sign = profit >= 0 ? '+' : '';
        unrealizedProfitEl.textContent = `${sign}$${profit.toFixed(2)}`;
        unrealizedProfitEl.style.color = profit >= 0 ? '#22c55e' : '#ef4444';
      }
      
      if (activeTradesEl) activeTradesEl.textContent = stats.activeTrades;
      if (aiAccuracyEl) aiAccuracyEl.textContent = `${stats.aiAccuracy.toFixed(1)}%`;
    }
    
    loadProfitChart(7);
    setupPeriodSelector();
    
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
  }
}

// График профита
let profitChartInstance = null;

async function loadProfitChart(days) {
  try {
    const response = await apiFetch(`/api/dashboard/profit-chart?days=${days}`);
    const data = await response.json();
    
    if (data.success) {
      renderProfitChart(data.data, days);
    }
  } catch (error) {
    console.error('Ошибка загрузки данных графика:', error);
  }
}

function renderProfitChart(data, days) {
  const ctx = document.getElementById('profitChart');
  if (!ctx) return;
  
  if (profitChartInstance) profitChartInstance.destroy();
  
  const dates = [];
  const profits = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
    const dayData = data.find(d => d.date === dateStr);
    profits.push(dayData ? dayData.daily_profit : 0);
  }
  
  profitChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(d => {
        const date = new Date(d);
        return `${date.getDate()}.${date.getMonth() + 1}`;
      }),
      datasets: [{
        label: 'Профит',
        data: profits,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#06060a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#e0e0e0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              return `${value >= 0 ? '+' : ''}$${value.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)', drawBorder: false },
          ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)', drawBorder: false },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: { size: 11 },
            callback: function(value) { return '$' + value.toFixed(0); }
          }
        }
      }
    }
  });
}

function setupPeriodSelector() {
  const periodBtns = document.querySelectorAll('.period-btn');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadProfitChart(parseInt(btn.getAttribute('data-days')));
    });
  });
}
