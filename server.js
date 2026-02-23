require('dotenv').config();

const express = require('express');
const path = require('path');
const https = require('https');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const {
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
} = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

// ===== Groq: ключи из .env =====
const GROQ_KEYS = [];
for (let i = 1; i <= 15; i++) {
  const key = process.env[`GROQ_KEY_${i}`] || '';
  const modelIndex = Math.ceil(i / 3); // 1-3 → model 1, 4-6 → model 2, ...
  const model = process.env[`GROQ_MODEL_${modelIndex}`] || 'llama-3.3-70b-versatile';
  GROQ_KEYS.push({ key, model });
}

const GROQ_GROUPS = [
  [GROQ_KEYS[0],  GROQ_KEYS[1],  GROQ_KEYS[2]],
  [GROQ_KEYS[3],  GROQ_KEYS[4],  GROQ_KEYS[5]],
  [GROQ_KEYS[6],  GROQ_KEYS[7],  GROQ_KEYS[8]],
  [GROQ_KEYS[9],  GROQ_KEYS[10], GROQ_KEYS[11]],
  [GROQ_KEYS[12], GROQ_KEYS[13], GROQ_KEYS[14]],
];

// ===== Groq запрос =====
async function groqRequest(keyEntry, prompt, maxTokens = 512) {
  if (!keyEntry || !keyEntry.key) return null;
  const body = JSON.stringify({
    model: keyEntry.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: maxTokens,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyEntry.key}`,
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===== Ансамблевый анализ =====
async function callGroqEnsemble(prompt) {
  for (const group of GROQ_GROUPS) {
    const [master, agent1, agent2] = group;
    if (!master || !master.key) continue;
    try {
      const [r1, r2] = await Promise.all([
        groqRequest(agent1, prompt, 400).catch(() => null),
        groqRequest(agent2, prompt, 400).catch(() => null),
      ]);

      const opinions = [];
      if (r1 && r1.status === 200) opinions.push(r1.data.choices[0].message.content);
      if (r2 && r2.status === 200) opinions.push(r2.data.choices[0].message.content);
      if (opinions.length === 0) continue;

      const jsonSchema = `{"signal":"LONG или SHORT","confidence":число 60-95,"confidence_reason":"почему именно эта точность","summary":"общая картина 1-2 предложения","trend_analysis":"анализ тренда","indicator_analysis":"разбор индикаторов","entry_reason":"почему входить сейчас","risk_analysis":"риски и сценарий отмены","tp_percent":число,"sl_percent":число}`;

      const masterPrompt = opinions.length === 2
        ? `Ты главный аналитик. Два независимых ИИ-агента проанализировали актив.\n\nМнение Агента 1:\n${opinions[0]}\n\nМнение Агента 2:\n${opinions[1]}\n\nОбъедини оба мнения, найди консенсус. Верни ТОЛЬКО валидный JSON без markdown:\n${jsonSchema}`
        : `На основе анализа агента сформируй полный финальный анализ. Верни ТОЛЬКО валидный JSON без markdown:\n${opinions[0]}\nФормат: ${jsonSchema}`;

      const masterResult = await groqRequest(master, masterPrompt, 512).catch(() => null);
      if (masterResult && masterResult.status === 200) {
        return masterResult.data.choices[0].message.content;
      }
      continue;
    } catch (e) {
      continue;
    }
  }
  throw new Error('Все группы Groq исчерпаны');
}

// ===== HTTP fetch helper (с поддержкой редиректов) =====
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'KotvukAI/1.0' } }, (res) => {
      // Обработка редиректов
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// ===== Индикаторы =====
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
}

function calcEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

function calcMACD(closes) {
  return calcEMA(closes, 12) - calcEMA(closes, 26);
}

function calcBollinger(closes, period = 20) {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
}

// ===== Middleware =====

// Helmet — HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false, // отключаем CSP чтобы не ломать фронтенд с CDN
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json());
app.use(express.static('public'));

// Общий rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 300,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Строгий rate limit для AI анализа
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 5,
  message: { error: 'Лимит ИИ анализа: максимум 5 запросов в минуту. Подождите.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// JWT Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, name: decoded.name, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Неверный или истёкший токен' });
  }
}

// Генерация JWT
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ===== Роуты =====

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- AUTH (публичные) ---

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  try {
    const user = await loginUser(email, password);
    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
  }
  try {
    const user = await registerUser(name, email, password);
    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Регистрация выполнена успешно',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ЗАЩИЩЁННЫЕ РОУТЫ (все используют authMiddleware) ---

// Dashboard stats
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await getDashboardStats(req.user.id);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Profit chart
app.get('/api/dashboard/profit-chart', authMiddleware, async (req, res) => {
  const days = req.query.days || 7;
  try {
    const data = await getProfitChartData(req.user.id, days);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения данных графика' });
  }
});

// Demo accounts
app.get('/api/demo-accounts', authMiddleware, async (req, res) => {
  try {
    let accounts = await getDemoAccounts(req.user.id);
    if (accounts.length === 0) {
      await createDemoAccounts(req.user.id);
      accounts = await getDemoAccounts(req.user.id);
    }
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения счетов' });
  }
});

// Demo account stats
app.get('/api/demo-accounts/:accountId/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await getDemoAccountStats(req.params.accountId);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demo account trades
app.get('/api/demo-accounts/:accountId/trades', authMiddleware, async (req, res) => {
  try {
    const trades = await getDemoAccountTrades(req.params.accountId);
    res.json({ success: true, trades });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения сделок' });
  }
});

// Add trade (через абстракцию database.js)
app.post('/api/demo-accounts/:accountId/trades', authMiddleware, async (req, res) => {
  const { symbol, type, amount, entry_price, exit_price, profit, status } = req.body;
  if (!symbol || !type || !amount || !entry_price) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }
  try {
    const result = await addTrade(req.params.accountId, { symbol, type, amount, entry_price, exit_price, profit, status });
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update balance
app.patch('/api/demo-accounts/:accountId/balance', authMiddleware, async (req, res) => {
  const { balance } = req.body;
  if (balance === undefined || isNaN(balance) || Number(balance) < 0) {
    return res.status(400).json({ error: 'Некорректная сумма' });
  }
  try {
    const result = await updateUserAccountBalance(req.params.accountId, Number(balance));
    res.json({ success: true, result });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// ===== Market data (Binance) — защищённые =====

app.get('/api/market/price/:symbol', authMiddleware, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
    if (data.code) return res.status(400).json({ error: `Binance: ${data.msg}` });
    res.json({
      success: true,
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChange),
      changePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/market/klines/:symbol', authMiddleware, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const interval = req.query.interval || '1h';
    const limit = req.query.limit || 100;
    const binanceInterval = interval.toLowerCase();
    const data = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${binanceInterval}&limit=${limit}`);
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Binance error' });
    const klines = data.map(k => ({
      time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
    }));
    res.json({ success: true, klines });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Глобальная капитализация (CoinGecko) =====
let globalCache = { data: null, ts: 0 };

app.get('/api/market/global', authMiddleware, async (req, res) => {
  try {
    // Кэш на 60 секунд
    if (globalCache.data && Date.now() - globalCache.ts < 60000) {
      return res.json({ success: true, ...globalCache.data });
    }
    const raw = await fetchJson('https://api.coingecko.com/api/v3/global');
    if (!raw || !raw.data) throw new Error('CoinGecko unavailable');
    const d = raw.data;
    const result = {
      totalMarketCap: d.total_market_cap.usd,
      totalVolume: d.total_volume.usd,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd,
      btcDominance: d.market_cap_percentage.btc,
      ethDominance: d.market_cap_percentage.eth,
      activeCryptos: d.active_cryptocurrencies,
    };
    globalCache = { data: result, ts: Date.now() };
    res.json({ success: true, ...result });
  } catch (e) {
    // Fallback: если CoinGecko недоступен, отдаём кэш или ошибку
    if (globalCache.data) return res.json({ success: true, ...globalCache.data, cached: true });
    res.status(500).json({ error: 'Не удалось загрузить данные капитализации' });
  }
});

// ===== Индекс страха и жадности =====
let fearCache = { data: null, ts: 0 };

app.get('/api/market/fear-greed', authMiddleware, async (req, res) => {
  try {
    if (fearCache.data && Date.now() - fearCache.ts < 300000) {
      return res.json({ success: true, ...fearCache.data });
    }
    const raw = await fetchJson('https://api.alternative.me/fng/?limit=1');
    if (!raw || !raw.data || !raw.data[0]) throw new Error('Fear & Greed unavailable');
    const d = raw.data[0];
    const result = {
      value: parseInt(d.value),
      label: d.value_classification,
      timestamp: parseInt(d.timestamp),
    };
    fearCache = { data: result, ts: Date.now() };
    res.json({ success: true, ...result });
  } catch (e) {
    if (fearCache.data) return res.json({ success: true, ...fearCache.data, cached: true });
    res.status(500).json({ error: 'Не удалось загрузить индекс страха' });
  }
});

// ===== Поиск активов (Binance) =====
let allSymbolsCache = { data: null, ts: 0 };

async function loadAllSymbols() {
  if (allSymbolsCache.data && Date.now() - allSymbolsCache.ts < 3600000) return allSymbolsCache.data;
  try {
    const info = await fetchJson('https://api.binance.com/api/v3/exchangeInfo');
    const symbols = info.symbols
      .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map(s => ({
        symbol: s.baseAsset,
        pair: s.symbol,
        name: s.baseAsset,
      }));
    allSymbolsCache = { data: symbols, ts: Date.now() };
    return symbols;
  } catch (e) {
    return allSymbolsCache.data || [];
  }
}

app.get('/api/market/search', authMiddleware, async (req, res) => {
  try {
    const query = (req.query.q || '').toUpperCase().trim();
    if (!query || query.length < 1) {
      return res.json({ success: true, results: [] });
    }
    const all = await loadAllSymbols();
    const results = all
      .filter(s => s.symbol.includes(query))
      .slice(0, 20)
      .map(s => ({ symbol: s.symbol, pair: s.pair }));
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Screener endpoint (реальные данные Binance) =====
const SCREENER_SYMBOLS = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TON','AVAX','MATIC','DOT','LINK','LTC','UNI','ATOM'];
const SCREENER_NAMES = {
  BTC:'Bitcoin', ETH:'Ethereum', BNB:'BNB', SOL:'Solana', XRP:'XRP',
  ADA:'Cardano', DOGE:'Dogecoin', TON:'Toncoin', AVAX:'Avalanche', MATIC:'Polygon',
  DOT:'Polkadot', LINK:'Chainlink', LTC:'Litecoin', UNI:'Uniswap', ATOM:'Cosmos'
};

app.get('/api/market/screener', authMiddleware, async (req, res) => {
  try {
    const promises = SCREENER_SYMBOLS.map(sym =>
      fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}USDT`).catch(() => null)
    );
    const results = await Promise.all(promises);

    const assets = results
      .map((data, i) => {
        if (!data || data.code) return null;
        const sym = SCREENER_SYMBOLS[i];
        const price = parseFloat(data.lastPrice);
        const vol = parseFloat(data.quoteVolume);
        return {
          symbol: sym,
          name: SCREENER_NAMES[sym] || sym,
          price,
          change: parseFloat(parseFloat(data.priceChangePercent).toFixed(2)),
          vol: vol > 1e9 ? (vol / 1e9).toFixed(2) + 'B' : (vol / 1e6).toFixed(1) + 'M',
          volRaw: vol,
          mcap: '—', // Binance не предоставляет market cap напрямую
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice),
        };
      })
      .filter(Boolean);

    res.json({ success: true, assets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Heatmap endpoint =====
app.get('/api/market/heatmap', authMiddleware, async (req, res) => {
  try {
    const promises = SCREENER_SYMBOLS.map(sym =>
      fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}USDT`).catch(() => null)
    );
    const results = await Promise.all(promises);

    const assets = results
      .map((data, i) => {
        if (!data || data.code) return null;
        const sym = SCREENER_SYMBOLS[i];
        return {
          symbol: sym,
          name: SCREENER_NAMES[sym] || sym,
          change: parseFloat(parseFloat(data.priceChangePercent).toFixed(2)),
          mcap: parseFloat(data.quoteVolume), // используем объём как приближение для размера ячейки
        };
      })
      .filter(Boolean);

    res.json({ success: true, assets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Groq AI анализ (с aiLimiter) =====
app.post('/api/ai/analyze', authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { symbol, timeframe } = req.body;
    if (!symbol || !timeframe) return res.status(400).json({ error: 'symbol и timeframe обязательны' });

    const binanceInterval = timeframe.toLowerCase();
    const klinesData = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${binanceInterval}&limit=100`);
    if (!Array.isArray(klinesData)) return res.status(400).json({ error: 'Не удалось получить свечи' });

    const closes = klinesData.map(k => parseFloat(k[4]));
    const price = closes[closes.length - 1];

    const rsi = calcRSI(closes);
    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const macd = calcMACD(closes);
    const bb = calcBollinger(closes);

    const ticker = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`);
    const change = parseFloat(ticker.priceChangePercent || 0);

    const prompt = `Ты профессиональный криптовалютный трейдер и аналитик. Проведи детальный анализ актива ${symbol}/USDT на таймфрейме ${timeframe}.

Текущие рыночные данные:
- Цена: $${price.toFixed(4)}
- Изменение за 24ч: ${change.toFixed(2)}%
- RSI(14): ${rsi ? rsi.toFixed(2) : 'N/A'}
- EMA20: $${ema20.toFixed(4)}
- EMA50: $${ema50.toFixed(4)}
- MACD: ${macd.toFixed(4)}
- Bollinger Bands: верхняя $${bb.upper.toFixed(4)}, средняя $${bb.middle.toFixed(4)}, нижняя $${bb.lower.toFixed(4)}

Верни ТОЛЬКО валидный JSON без markdown и без переносов строк внутри значений:
{"signal":"LONG или SHORT","confidence":число от 60 до 95,"confidence_reason":"1-2 предложения почему именно эта точность","summary":"1-2 предложения что происходит с активом","trend_analysis":"куда движется цена какие уровни ключевые","indicator_analysis":"что говорит RSI EMA MACD Bollinger Bands","entry_reason":"почему именно сейчас входить в позицию","risk_analysis":"что может пойти не так сценарий отмены","tp_percent":число,"sl_percent":число}`;

    const raw = await callGroqEnsemble(prompt);

    let aiResult;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      aiResult = { signal: 'LONG', confidence: 70, summary: raw.slice(0, 200), tp_percent: 3, sl_percent: 1.5 };
    }

    const tp = aiResult.signal === 'LONG'
      ? price * (1 + aiResult.tp_percent / 100)
      : price * (1 - aiResult.tp_percent / 100);
    const sl = aiResult.signal === 'LONG'
      ? price * (1 - aiResult.sl_percent / 100)
      : price * (1 + aiResult.sl_percent / 100);

    res.json({
      success: true,
      signal: aiResult.signal,
      confidence: aiResult.confidence,
      summary: aiResult.summary || '',
      confidence_reason: aiResult.confidence_reason || '',
      trend_analysis: aiResult.trend_analysis || '',
      indicator_analysis: aiResult.indicator_analysis || '',
      entry_reason: aiResult.entry_reason || '',
      risk_analysis: aiResult.risk_analysis || '',
      indicators: {
        rsi: rsi ? parseFloat(rsi.toFixed(2)) : null,
        ema20: parseFloat(ema20.toFixed(4)),
        ema50: parseFloat(ema50.toFixed(4)),
        macd: parseFloat(macd.toFixed(4)),
        bb_upper: parseFloat(bb.upper.toFixed(4)),
        bb_middle: parseFloat(bb.middle.toFixed(4)),
        bb_lower: parseFloat(bb.lower.toFixed(4)),
      },
      levels: {
        entry: parseFloat(price.toFixed(4)),
        tp: parseFloat(tp.toFixed(4)),
        sl: parseFloat(sl.toFixed(4)),
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 KotvukAI запущен на http://localhost:${PORT}`);
  console.log(`📊 JWT авторизация активна`);
  console.log(`🛡️  Helmet + Rate Limiting включены`);
});
