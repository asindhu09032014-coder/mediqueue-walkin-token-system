const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details || err.message
    });
  }

  // Supabase/PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A record with this information already exists.'
    });
  }
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced record does not exist.'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
