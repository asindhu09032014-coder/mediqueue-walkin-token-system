const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// GET /api/users - List users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { role, search, is_active } = req.query;
    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, phone, is_active, created_at')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/staff - List staff for counter assignment
router.get('/staff', authenticate, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role')
      .in('role', ['staff', 'admin'])
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/status - Toggle user active status (admin)
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot deactivate your own account.' });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('is_active')
      .eq('id', req.params.id)
      .single();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', req.params.id)
      .select('id, email, full_name, role, is_active')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
