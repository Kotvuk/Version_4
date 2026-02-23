require('dotenv').config();

// ===== Validate required env vars before anything else =====
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET not set in environment');
  process.exit(1);
}

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { db } = require('./database');
const { errorHandler } = require('./middleware/errorHandler');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('./utils/constants');

// ===== Route modules =====
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const accountsRoutes = require('./routes/accounts');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====

// Helmet — HTTP security headers + CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],  // unsafe-inline нужен для встроенных стилей (eye-closed display:none)
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Cookie parser (с подписью через JWT_SECRET)
app.use(cookieParser(JWT_SECRET));

// JSON body parser
app.use(express.json());

// Static files
app.use(express.static('public'));

// Общий rate limit
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { success: false, error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// ===== Routes =====

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/demo-accounts', accountsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ai', aiRoutes);

// ===== Global error handler =====
app.use(errorHandler);

// ===== Start server =====
const server = app.listen(PORT, () => {
  console.log(`🚀 KotvukAI запущен на http://localhost:${PORT}`);
  console.log(`📊 JWT авторизация активна`);
  console.log(`🛡️  Helmet + CORS + Rate Limiting включены`);
});

// ===== Graceful shutdown =====
function gracefulShutdown(signal) {
  console.log(`Получен ${signal}, завершаю...`);
  server.close(() => {
    db.close(() => {
      console.log('✅ Сервер и БД закрыты');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
