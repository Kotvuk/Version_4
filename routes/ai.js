// ===== AI analysis routes =====

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { fetchJson } = require('../services/binance');
const { callGroqEnsemble } = require('../services/groq');
const { calcRSI, calcEMA, calcMACD, calcBollinger } = require('../utils/indicators');
const { AI_RATE_LIMIT_MAX, AI_RATE_LIMIT_WINDOW_MS } = require('../utils/constants');

// Строгий rate limit для AI анализа
const aiLimiter = rateLimit({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  max: AI_RATE_LIMIT_MAX,
  message: { success: false, error: 'Лимит ИИ анализа: максимум 5 запросов в минуту. Подождите.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/ai/analyze
router.post('/analyze', authMiddleware, aiLimiter, asyncHandler(async (req, res) => {
  const { symbol, timeframe } = req.body;
  if (!symbol || !timeframe) return res.status(400).json({ success: false, error: 'symbol и timeframe обязательны' });

  const binanceInterval = timeframe.toLowerCase();
  const klinesData = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${binanceInterval}&limit=100`);
  if (!Array.isArray(klinesData)) return res.status(400).json({ success: false, error: 'Не удалось получить свечи' });

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
}));

module.exports = router;
