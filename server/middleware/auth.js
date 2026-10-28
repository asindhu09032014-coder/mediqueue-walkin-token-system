const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

// Authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB (check clinic_users first, then users)
    let user = null;
    try {
      const { data: cUser } = await supabaseAdmin
        .from('clinic_users')
        .select('id, email, full_name, role, is_active')
        .eq('id', decoded.userId)
        .single();
      if (cUser) user = cUser;
    } catch {}

    if (!user) {
      try {
        const { data: uUser } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, role, is_active')
          .eq('id', decoded.userId)
          .single();
        if (uUser) user = uUser;
      } catch {}
    }

    if (!user && decoded.userId) {
      // Demo / synthetic fallback user
      user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'staff',
        full_name: decoded.email,
        is_active: true
      };
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ success: false, error: 'Account is deactivated.' });
    }

    if (user.role === 'requester') user.role = 'patient';

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
    return res.status(500).json({ success: false, error: 'Authentication error.' });
  }
};

// Authorization middleware factory
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required role: ${roles.join(' or ')}.` 
      });
    }
    next();
  };
};

// Optional auth - continues even if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('id', decoded.userId)
        .single();
      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch (err) {
    // Continue without auth
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
