const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Создание и подключение к базе данных
const db = new sqlite3.Database(path.join(__dirname, 'kotvukai.db'), (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  } else {
    console.log('✅ Подключено к SQLite базе данных');
  }
});

// ===== Промисифицированные обёртки =====
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ===== Создание таблиц =====
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Ошибка создания таблицы users:', err);
    else { console.log('✅ Таблица users готова'); createAdminUser(); }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS demo_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      balance REAL DEFAULT 10000,
      initial_balance REAL DEFAULT 10000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ Ошибка создания таблицы demo_accounts:', err);
    else console.log('✅ Таблица demo_accounts готова');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ Ошибка создания таблицы charts:', err);
    else console.log('✅ Таблица charts готова');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      prediction TEXT NOT NULL,
      confidence REAL,
      is_correct INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chart_id) REFERENCES charts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ Ошибка создания таблицы analyses:', err);
    else console.log('✅ Таблица analyses готова');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demo_account_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      amount REAL NOT NULL,
      profit REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (demo_account_id) REFERENCES demo_accounts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ Ошибка создания таблицы trades:', err);
    else console.log('✅ Таблица trades готова');
  });
});

// Создание администратора
async function createAdminUser() {
  const adminEmail = 'admin@corp.kz';
  const adminPassword = 'AdminDamir';
  const adminName = 'Administrator';

  try {
    const row = await dbGet('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (!row) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await dbRun('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [adminName, adminEmail, hashedPassword]);
      console.log('✅ Администратор создан:', adminEmail);
    } else {
      console.log('ℹ️  Администратор уже существует');
    }
  } catch (err) {
    console.error('❌ Ошибка создания администратора:', err);
  }
}

// ===== Регистрация =====
async function registerUser(name, email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await dbRun('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    return { id: result.lastID, name, email };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('Пользователь с таким email уже существует');
    }
    throw err;
  }
}

// ===== Вход =====
async function loginUser(email, password) {
  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new Error('Неверный email или пароль');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Неверный email или пароль');

  return { id: user.id, name: user.name, email: user.email };
}

// ===== Статистика дашборда (async/await вместо callback hell) =====
async function getDashboardStats(userId) {
  const balanceRow = await dbGet('SELECT SUM(balance) as total_balance FROM demo_accounts WHERE user_id = ?', [userId]);
  const balance = (balanceRow && balanceRow.total_balance) ? balanceRow.total_balance : 0;

  const unrealizedRow = await dbGet(`
    SELECT SUM(t.profit) as unrealized 
    FROM trades t 
    JOIN demo_accounts da ON t.demo_account_id = da.id 
    WHERE t.user_id = ? AND t.status = "open" AND da.account_type = "user"
  `, [userId]);
  const unrealizedProfit = (unrealizedRow && unrealizedRow.unrealized) || 0;

  const activeRow = await dbGet(`
    SELECT COUNT(*) as count 
    FROM trades t 
    JOIN demo_accounts da ON t.demo_account_id = da.id 
    WHERE t.user_id = ? AND t.status = "open" AND da.account_type = "user"
  `, [userId]);
  const activeTrades = activeRow.count;

  const totalCheckedRow = await dbGet('SELECT COUNT(*) as total FROM analyses WHERE user_id = ? AND is_correct IS NOT NULL', [userId]);
  const totalChecked = totalCheckedRow.total;

  let aiAccuracy = 0;
  if (totalChecked > 0) {
    const correctRow = await dbGet('SELECT COUNT(*) as correct FROM analyses WHERE user_id = ? AND is_correct = 1', [userId]);
    aiAccuracy = (correctRow.correct / totalChecked) * 100;
  }

  return { balance, unrealizedProfit, activeTrades, aiAccuracy };
}

// ===== График профита =====
async function getProfitChartData(userId, days) {
  const rows = await dbAll(`
    SELECT DATE(closed_at) as date, SUM(profit) as daily_profit
    FROM trades
    WHERE user_id = ? AND status = "closed" AND closed_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(closed_at)
    ORDER BY date ASC
  `, [userId, days]);
  return rows;
}

// ===== Демо-счета =====
async function createDemoAccounts(userId) {
  await dbRun('INSERT INTO demo_accounts (user_id, name, account_type, balance, initial_balance) VALUES (?, ?, ?, ?, ?)',
    [userId, 'Мой демо-счёт', 'user', 10000, 10000]);
  await dbRun('INSERT INTO demo_accounts (user_id, name, account_type, balance, initial_balance) VALUES (?, ?, ?, ?, ?)',
    [userId, 'ИИ демо-счёт', 'ai', 10000, 10000]);
}

async function getDemoAccounts(userId) {
  return await dbAll('SELECT * FROM demo_accounts WHERE user_id = ? ORDER BY account_type', [userId]);
}

async function getDemoAccountStats(accountId) {
  const account = await dbGet('SELECT * FROM demo_accounts WHERE id = ?', [accountId]);
  if (!account) throw new Error('Счёт не найден');

  const tradesRow = await dbGet('SELECT COUNT(*) as total, SUM(CASE WHEN status = "open" THEN 1 ELSE 0 END) as active FROM trades WHERE demo_account_id = ?', [accountId]);
  const profitRow = await dbGet('SELECT SUM(profit) as total_profit FROM trades WHERE demo_account_id = ? AND status = "closed"', [accountId]);

  return {
    account,
    totalTrades: tradesRow.total,
    activeTrades: tradesRow.active,
    totalProfit: (profitRow && profitRow.total_profit) || 0,
  };
}

async function getDemoAccountTrades(accountId) {
  return await dbAll('SELECT * FROM trades WHERE demo_account_id = ? ORDER BY created_at DESC', [accountId]);
}

async function updateUserAccountBalance(accountId, newBalance) {
  const account = await dbGet('SELECT * FROM demo_accounts WHERE id = ?', [accountId]);
  if (!account) throw new Error('Счёт не найден');

  await dbRun('UPDATE demo_accounts SET balance = ?, initial_balance = ? WHERE id = ?', [newBalance, newBalance, accountId]);
  return { updated: true };
}

// ===== Добавление сделки (перенесено из server.js) =====
async function addTrade(accountId, { symbol, type, amount, entry_price, exit_price, profit, status }) {
  const account = await dbGet('SELECT user_id FROM demo_accounts WHERE id = ?', [accountId]);
  if (!account) throw new Error('Счёт не найден');

  const tradeStatus = status || 'open';
  const tradeProfit = profit || 0;
  const tradeExitPrice = exit_price || null;

  const result = await dbRun(
    `INSERT INTO trades (demo_account_id, user_id, symbol, type, entry_price, exit_price, amount, profit, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [accountId, account.user_id, symbol.toUpperCase(), type, entry_price, tradeExitPrice, amount, tradeProfit, tradeStatus]
  );
  return { id: result.lastID };
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  registerUser,
  loginUser,
  getDashboardStats,
  getProfitChartData,
  createDemoAccounts,
  getDemoAccounts,
  getDemoAccountStats,
  getDemoAccountTrades,
  updateUserAccountBalance,
  addTrade,
};
