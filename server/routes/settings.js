const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { validate } = require('../validators/tokenValidators');

// GET /api/settings - Get all settings (staff/admin)
router.get('/', authenticate, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    let data = null;
    try {
      const res = await supabaseAdmin
        .from('system_settings')
        .select('*')
        .order('setting_key');
      if (res.data && res.data.length > 0) data = res.data;
    } catch {}

    if (!data) {
      try {
        const res = await supabaseAdmin.from('clinic_configs').select('*');
        if (res.data && res.data.length > 0) {
          data = res.data.map(c => ({
            setting_key: c.key,
            setting_value: typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value),
            description: c.description
          }));
        }
      } catch {}
    }

    if (!data) {
      data = [
        { setting_key: 'clinic_name', setting_value: 'MediQueue Clinical Care', description: 'Name of the medical clinic' },
        { setting_key: 'max_tokens_per_day', setting_value: '250', description: 'Maximum tokens allowed daily' },
        { setting_key: 'default_consultation_minutes', setting_value: '15', description: 'Default expected consultation time' },
        { setting_key: 'operating_hours_start', setting_value: '08:00', description: 'Morning clinic start time' },
        { setting_key: 'operating_hours_end', setting_value: '20:00', description: 'Evening clinic close time' }
      ];
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/public - Get public settings (no auth needed)
router.get('/public', async (req, res, next) => {
  try {
    let settings = {
      clinic_name: 'MediQueue Clinical Care',
      operating_hours_start: '08:00',
      operating_hours_end: '20:00',
      display_board_refresh_seconds: '10'
    };

    try {
      const { data } = await supabaseAdmin
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['clinic_name', 'operating_hours_start', 'operating_hours_end', 'display_board_refresh_seconds']);

      if (data && data.length > 0) {
        data.forEach(s => { settings[s.setting_key] = s.setting_value; });
      }
    } catch {}

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/:key - Update setting (admin only)
router.put('/:key', authenticate, authorize('admin'), [
  body('value').notEmpty().withMessage('Setting value is required'),
  validate
], async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .update({ 
        setting_value: req.body.value,
        updated_by: req.user.id 
      })
      .eq('setting_key', req.params.key)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Setting not found.' });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
