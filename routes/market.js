// ===== Market data routes =====

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { fetchJson, loadAllSymbols, fetchMultipleAssetData, SCREENER_SYMBOLS } = require('../services/binance');
const { GLOBAL_CACHE_TTL, FEAR_CACHE_TTL } = require('../utils/constants');

// ===== Кэши =====
let globalCache = { data: null, ts: 0 };
let fearCache = { data: null, ts: 0 };

// GET /api/market/price/:symbol
router.get('/price/:symbol', authMiddleware, asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const data = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
  if (data.code) return res.status(400).json({ success: false, error: `Binance: ${data.msg}` });
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
}));

// GET /api/market/klines/:symbol
router.get('/klines/:symbol', authMiddleware, asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const interval = req.query.interval || '1h';
  const limit = req.query.limit || 100;
  const binanceInterval = interval.toLowerCase();
  const data = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${binanceInterval}&limit=${limit}`);
  if (!Array.isArray(data)) return res.status(400).json({ success: false, error: 'Binance error' });
  const klines = data.map(k => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
  }));
  res.json({ success: true, klines });
}));

// GET /api/market/global — Глобальная капитализация (CoinGecko)
router.get('/global', authMiddleware, asyncHandler(async (req, res) => {
  try {
    // Кэш
    if (globalCache.data && Date.now() - globalCache.ts < GLOBAL_CACHE_TTL) {
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
    res.status(500).json({ success: false, error: 'Не удалось загрузить данные капитализации' });
  }
}));

// GET /api/market/fear-greed — Индекс страха и жадности
router.get('/fear-greed', authMiddleware, asyncHandler(async (req, res) => {
  try {
    if (fearCache.data && Date.now() - fearCache.ts < FEAR_CACHE_TTL) {
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
    res.status(500).json({ success: false, error: 'Не удалось загрузить индекс страха' });
  }
}));

// GET /api/market/search — Поиск активов (Binance)
router.get('/search', authMiddleware, asyncHandler(async (req, res) => {
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
}));

// GET /api/market/screener — Screener endpoint (реальные данные Binance)
router.get('/screener', authMiddleware, asyncHandler(async (req, res) => {
  const rawAssets = await fetchMultipleAssetData(SCREENER_SYMBOLS);
  const assets = rawAssets.map(a => ({
    symbol: a.symbol,
    name: a.name,
    price: a.price,
    change: a.change,
    vol: a.quoteVolume > 1e9 ? (a.quoteVolume / 1e9).toFixed(2) + 'B' : (a.quoteVolume / 1e6).toFixed(1) + 'M',
    volRaw: a.quoteVolume,
    mcap: '—',
    high: a.high,
    low: a.low,
  }));
  res.json({ success: true, assets });
}));

// GET /api/market/heatmap — Heatmap endpoint
router.get('/heatmap', authMiddleware, asyncHandler(async (req, res) => {
  const rawAssets = await fetchMultipleAssetData(SCREENER_SYMBOLS);
  const assets = rawAssets.map(a => ({
    symbol: a.symbol,
    name: a.name,
    change: a.change,
    mcap: a.quoteVolume, // используем объём как приближение для размера ячейки
  }));
  res.json({ success: true, assets });
}));

module.exports = router;
