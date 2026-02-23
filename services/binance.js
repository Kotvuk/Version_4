// ===== Binance & HTTP fetch services =====

const https = require('https');
const http = require('http');
const { SYMBOLS_CACHE_TTL } = require('../utils/constants');

// ===== Allowed API hosts for redirect validation =====
const ALLOWED_API_HOSTS = ['api.binance.com', 'api.coingecko.com', 'api.alternative.me'];

// ===== HTTP fetch helper (с поддержкой редиректов) =====
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'KotvukAI/1.0' } }, (res) => {
      // Обработка редиректов
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        try {
          const redirectUrl = new URL(res.headers.location);
          if (!ALLOWED_API_HOSTS.includes(redirectUrl.hostname)) {
            return reject(new Error('Redirect to untrusted host blocked'));
          }
        } catch (e) {
          return reject(new Error('Invalid redirect URL'));
        }
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// ===== Screener symbols & names =====
const SCREENER_SYMBOLS = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TON','AVAX','MATIC','DOT','LINK','LTC','UNI','ATOM'];
const SCREENER_NAMES = {
  BTC:'Bitcoin', ETH:'Ethereum', BNB:'BNB', SOL:'Solana', XRP:'XRP',
  ADA:'Cardano', DOGE:'Dogecoin', TON:'Toncoin', AVAX:'Avalanche', MATIC:'Polygon',
  DOT:'Polkadot', LINK:'Chainlink', LTC:'Litecoin', UNI:'Uniswap', ATOM:'Cosmos'
};

// ===== All symbols cache (for search) =====
let allSymbolsCache = { data: null, ts: 0 };

async function loadAllSymbols() {
  if (allSymbolsCache.data && Date.now() - allSymbolsCache.ts < SYMBOLS_CACHE_TTL) return allSymbolsCache.data;
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

// ===== Shared function for fetching multiple asset data (deduplicates screener/heatmap) =====
async function fetchMultipleAssetData(symbols) {
  const promises = symbols.map(sym =>
    fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}USDT`).catch(() => null)
  );
  const results = await Promise.all(promises);
  return results.map((data, i) => {
    if (!data || data.code) return null;
    const sym = symbols[i];
    return {
      symbol: sym,
      name: SCREENER_NAMES[sym] || sym,
      price: parseFloat(data.lastPrice),
      change: parseFloat(parseFloat(data.priceChangePercent).toFixed(2)),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    };
  }).filter(Boolean);
}

module.exports = {
  fetchJson,
  loadAllSymbols,
  fetchMultipleAssetData,
  SCREENER_SYMBOLS,
  SCREENER_NAMES,
  ALLOWED_API_HOSTS,
};
