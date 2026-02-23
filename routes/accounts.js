// ===== Demo accounts routes =====

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createDemoAccounts,
  getDemoAccounts,
  getDemoAccountStats,
  getDemoAccountTrades,
  updateUserAccountBalance,
  addTrade,
  verifyAccountOwnership,
} = require('../database');

// GET /api/demo-accounts
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  let accounts = await getDemoAccounts(req.user.id);
  if (accounts.length === 0) {
    await createDemoAccounts(req.user.id);
    accounts = await getDemoAccounts(req.user.id);
  }
  res.json({ success: true, accounts });
}));

// GET /api/demo-accounts/:accountId/stats
router.get('/:accountId/stats', authMiddleware, asyncHandler(async (req, res) => {
  const account = await verifyAccountOwnership(req.params.accountId, req.user.id);
  if (!account) {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }
  const stats = await getDemoAccountStats(req.params.accountId);
  res.json({ success: true, stats });
}));

// GET /api/demo-accounts/:accountId/trades
router.get('/:accountId/trades', authMiddleware, asyncHandler(async (req, res) => {
  const account = await verifyAccountOwnership(req.params.accountId, req.user.id);
  if (!account) {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }
  const trades = await getDemoAccountTrades(req.params.accountId);
  res.json({ success: true, trades });
}));

// POST /api/demo-accounts/:accountId/trades
router.post('/:accountId/trades', authMiddleware, asyncHandler(async (req, res) => {
  const account = await verifyAccountOwnership(req.params.accountId, req.user.id);
  if (!account) {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }
  const { symbol, type, amount, entry_price, exit_price, profit, status } = req.body;
  if (!symbol || !type || !amount || !entry_price) {
    return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
  }
  const result = await addTrade(req.params.accountId, { symbol, type, amount, entry_price, exit_price, profit, status });
  res.json({ success: true, id: result.id });
}));

// PATCH /api/demo-accounts/:accountId/balance
router.patch('/:accountId/balance', authMiddleware, asyncHandler(async (req, res) => {
  const account = await verifyAccountOwnership(req.params.accountId, req.user.id);
  if (!account) {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }
  const { balance } = req.body;
  if (balance === undefined || isNaN(balance) || Number(balance) < 0) {
    return res.status(400).json({ success: false, error: 'Некорректная сумма' });
  }
  const result = await updateUserAccountBalance(req.params.accountId, Number(balance));
  res.json({ success: true, result });
}));

module.exports = router;
