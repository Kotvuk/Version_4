// ===== JWT Auth middleware & token generation =====

const jwt = require('jsonwebtoken');
const { JWT_EXPIRY } = require('../utils/constants');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET not set in environment');
  process.exit(1);
}

// JWT Auth middleware — signed httpOnly cookie + CSRF проверка для мутирующих запросов
function authMiddleware(req, res, next) {
  const token = req.signedCookies && req.signedCookies.token ? req.signedCookies.token : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Требуется авторизация' });
  }

  // CSRF защита: мутирующие запросы должны содержать кастомный заголовок
  // Браузер не позволит cross-origin запросу с кастомным заголовком без CORS preflight
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method) && !req.headers['x-requested-with']) {
    return res.status(403).json({ success: false, error: 'Отсутствует CSRF заголовок' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, name: decoded.name, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Неверный или истёкший токен' });
  }
}

// Генерация JWT
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
