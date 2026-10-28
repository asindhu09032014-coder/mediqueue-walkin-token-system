const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { validate } = require('../validators/tokenValidators');

// GET /api/departments - List all departments (public)
router.get('/', async (req, res, next) => {
  try {
    let data = null;
    try {
      const res = await supabaseAdmin
        .from('clinic_departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (res.data && res.data.length > 0) {
        data = res.data.map(d => ({
          ...d,
          avg_consultation_minutes: d.avg_consultation_mins || d.avg_consultation_minutes || 15
        }));
      }
    } catch {}

    if (!data) {
      const res = await supabaseAdmin
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      data = res.data || [];
    }

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id - Get department with counters
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select(`
        *,
        counters(id, counter_number, label, is_active, assigned_staff_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw Object.assign(new Error('Department not found'), { status: 404 });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments - Create department (admin)
router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Department name is required')
    .isLength({ max: 100 }),
  body('code').trim().notEmpty().withMessage('Department code is required')
    .isLength({ max: 10 }).isAlphanumeric().withMessage('Code must be alphanumeric'),
  body('description').optional().trim(),
  body('avg_consultation_minutes').optional().isInt({ min: 1, max: 120 }),
  validate
], async (req, res, next) => {
  try {
    const { name, code, description, avg_consultation_minutes } = req.body;
    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert({ 
        name, 
        code: code.toUpperCase(), 
        description, 
        avg_consultation_minutes: avg_consultation_minutes || 15 
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id - Update department (admin)
router.put('/:id', authenticate, authorize('admin'), [
  body('name').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim(),
  body('avg_consultation_minutes').optional().isInt({ min: 1, max: 120 }),
  body('is_active').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { name, description, avg_consultation_minutes, is_active } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (avg_consultation_minutes !== undefined) update.avg_consultation_minutes = avg_consultation_minutes;
    if (is_active !== undefined) update.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
