const { body, query, param } = require('express-validator');
const { validationResult } = require('express-validator');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createTokenRules = [
  body('patient_name')
    .trim()
    .notEmpty().withMessage('Patient name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Patient name must be 2-150 characters'),
  body('patient_phone')
    .optional()
    .trim()
    .matches(/^[\+]?[\d\s\-]{7,20}$/).withMessage('Invalid phone number format'),
  body('patient_age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
  body('patient_gender')
    .optional()
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('department_id')
    .notEmpty().withMessage('Department is required')
    .matches(UUID_REGEX).withMessage('Invalid department ID'),
  body('priority')
    .optional()
    .isIn(['normal', 'standard', 'priority', 'urgent', 'emergency']).withMessage('Priority must be normal, urgent, or emergency'),
  body('priority_reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Priority reason must not exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
  validate
];

const updateStatusRules = [
  param('id').matches(UUID_REGEX).withMessage('Invalid token ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['waiting', 'called', 'in_consultation', 'in-consultation', 'completed', 'skipped', 'cancelled'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  body('counter_id')
    .optional()
    .matches(UUID_REGEX).withMessage('Invalid counter ID'),
  validate
];

const listTokenRules = [
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  query('status').optional().isIn(['waiting', 'called', 'in_consultation', 'completed', 'skipped', 'cancelled']).withMessage('Invalid status'),
  query('department_id').optional().matches(UUID_REGEX).withMessage('Invalid department ID'),
  query('priority').optional().isIn(['normal', 'urgent', 'emergency']).withMessage('Invalid priority'),
  query('search').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('sort').optional().isIn(['token_number', 'created_at', 'priority', 'status', 'patient_name']),
  query('order').optional().isIn(['asc', 'desc']),
  validate
];

module.exports = { createTokenRules, updateStatusRules, listTokenRules, validate };
