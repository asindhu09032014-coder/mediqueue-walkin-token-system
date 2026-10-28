const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { validate } = require('../validators/tokenValidators');

// GET /api/counters - List counters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { department_id } = req.query;
    let data = null;

    try {
      let query = supabaseAdmin
        .from('counters')
        .select(`
          *,
          department:departments(id, name, code),
          staff:users!counters_assigned_staff_id_fkey(id, full_name, email)
        `)
        .order('counter_number');

      if (department_id) query = query.eq('department_id', department_id);
      const res = await query;
      if (res.data && res.data.length > 0) data = res.data;
    } catch {}

    if (!data) {
      try {
        let q = supabaseAdmin.from('clinic_rooms').select('*');
        if (department_id) q = q.eq('department_id', department_id);
        const res = await q;
        if (res.data) {
          data = res.data.map((r, i) => ({
            id: r.id,
            department_id: r.department_id,
            counter_number: i + 1,
            label: `${r.room_number} (${r.name})`,
            is_active: r.is_active,
            staff: r.assigned_doctor ? { full_name: r.assigned_doctor } : null
          }));
        }
      } catch {}
    }

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/counters - Create counter (admin)
router.post('/', authenticate, authorize('admin'), [
  body('department_id').isUUID().withMessage('Department ID required'),
  body('counter_number').isInt({ min: 1 }).withMessage('Counter number required'),
  body('label').optional().trim().isLength({ max: 50 }),
  validate
], async (req, res, next) => {
  try {
    const { department_id, counter_number, label } = req.body;
    const { data, error } = await supabaseAdmin
      .from('counters')
      .insert({ department_id, counter_number, label: label || `Counter ${counter_number}` })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/counters/:id/assign - Assign staff (admin/staff)
router.patch('/:id/assign', authenticate, authorize('staff', 'admin'), [
  body('staff_id').optional({ nullable: true }).isUUID().withMessage('Invalid staff ID'),
  validate
], async (req, res, next) => {
  try {
    const { staff_id } = req.body;
    const { data, error } = await supabaseAdmin
      .from('counters')
      .update({ assigned_staff_id: staff_id || null })
      .eq('id', req.params.id)
      .select(`*, department:departments(id, name, code), staff:users!counters_assigned_staff_id_fkey(id, full_name)`)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/counters/:id - Update counter (admin)
router.patch('/:id', authenticate, authorize('admin'), [
  body('is_active').optional().isBoolean(),
  body('label').optional().trim().isLength({ max: 50 }),
  validate
], async (req, res, next) => {
  try {
    const update = {};
    if (req.body.is_active !== undefined) update.is_active = req.body.is_active;
    if (req.body.label !== undefined) update.label = req.body.label;

    const { data, error } = await supabaseAdmin
      .from('counters')
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
