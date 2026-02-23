// ===== Auth routes =====

const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { registerUser, loginUser } = require('../database');
const { JWT_COOKIE_MAX_AGE } = require('../utils/constants');

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
  }
  try {
    const user = await loginUser(email, password);
    const token = generateToken(user);
    // Set signed httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
      maxAge: JWT_COOKIE_MAX_AGE
    });
    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
}));

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Все поля обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Пароль должен содержать минимум 6 символов' });
  }
  try {
    const user = await registerUser(name, email, password);
    const token = generateToken(user);
    // Set signed httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
      maxAge: JWT_COOKIE_MAX_AGE
    });
    res.json({
      success: true,
      message: 'Регистрация выполнена успешно',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}));

// GET /api/auth/logout
router.get('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Выход выполнен' });
});

module.exports = router;
