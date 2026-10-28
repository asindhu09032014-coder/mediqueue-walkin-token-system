const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const tokenService = require('../services/tokenService');
const { createTokenRules, updateStatusRules, listTokenRules } = require('../validators/tokenValidators');

// POST /api/tokens - Create new token (staff/admin or patient self check-in)
router.post('/', authenticate, createTokenRules, async (req, res, next) => {
  try {
    const payload = { ...req.body, role: req.user.role };
    const token = await tokenService.createToken(payload, req.user.id);
    res.status(201).json({ success: true, data: token });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/track/:tokenNumber - Public live token status & wait time tracker
router.get('/track/:tokenNumber', async (req, res, next) => {
  try {
    const data = await tokenService.trackToken(req.params.tokenNumber);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens - List tokens with filters
router.get('/', authenticate, listTokenRules, async (req, res, next) => {
  try {
    const result = await tokenService.listTokens(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/queue - Queue display (public - for display board)
router.get('/queue', async (req, res, next) => {
  try {
    const { department_id } = req.query;
    const queue = await tokenService.getQueueDisplay(department_id);
    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/dashboard - Dashboard metrics (staff/admin)
router.get('/dashboard', authenticate, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const { department_id } = req.query;
    const metrics = await tokenService.getDashboardMetrics(department_id);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// POST /api/tokens/daily-summary - Generate daily summary (admin)
router.post('/daily-summary', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { date } = req.body;
    const summaries = await tokenService.generateDailySummary(date);
    res.json({ success: true, data: summaries });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/daily-summary - Get daily summaries (staff/admin)
router.get('/daily-summary', authenticate, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const summaries = await tokenService.getDailySummaries(start_date, end_date);
    res.json({ success: true, data: summaries });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/:id - Get single token
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const token = await tokenService.getToken(req.params.id);

    // Patients can only see their own tokens (identified by created_by)
    if (req.user.role === 'patient' && token.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({ success: true, data: token });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/:id/events - Get token event history
router.get('/:id/events', authenticate, async (req, res, next) => {
  try {
    const events = await tokenService.getTokenEvents(req.params.id);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tokens/:id/status - Update token status (staff/admin)
router.patch('/:id/status', authenticate, authorize('staff', 'admin'), updateStatusRules, async (req, res, next) => {
  try {
    const { status, reason, counter_id } = req.body;
    const updated = await tokenService.updateStatus(
      req.params.id, status, req.user.id, reason, counter_id
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
