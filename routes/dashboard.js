// ===== Dashboard routes =====

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getDashboardStats, getProfitChartData } = require('../database');

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  const stats = await getDashboardStats(req.user.id);
  res.json({ success: true, stats });
}));

// GET /api/dashboard/profit-chart
router.get('/profit-chart', authMiddleware, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  const data = await getProfitChartData(req.user.id, days);
  res.json({ success: true, data });
}));

module.exports = router;
