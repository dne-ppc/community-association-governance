const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await query(
      'SELECT id, email, first_name, last_name, role, active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last activity in session
    await query(
      'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check document permissions
const checkDocumentPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id || req.params.documentId;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Admins and presidents have full access
      if (['admin', 'president'].includes(userRole)) {
        return next();
      }

      // Check specific document permissions
      const result = await query(
        `SELECT * FROM document_permissions 
         WHERE document_id = $1 AND user_id = $2`,
        [documentId, userId]
      );

      if (result.rows.length > 0) {
        const perms = result.rows[0];
        if (perms[permission]) {
          return next();
        }
      }

      // Check if user is the author
      if (permission === 'can_edit') {
        const docResult = await query(
          'SELECT author_id FROM documents WHERE id = $1',
          [documentId]
        );
        
        if (docResult.rows.length > 0 && docResult.rows[0].author_id === userId) {
          return next();
        }
      }

      res.status(403).json({
        success: false,
        message: 'Insufficient document permissions'
      });
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

// Log activity middleware
const logActivity = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = async function(data) {
      if (res.statusCode < 400 && req.user) {
        try {
          await query(
            `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user.id,
              action,
              req.params.type || 'document',
              req.params.id || null,
              JSON.stringify({
                method: req.method,
                path: req.path,
                body: req.body
              }),
              req.ip,
              req.get('user-agent')
            ]
          );
        } catch (error) {
          logger.error('Activity logging error:', error);
        }
      }
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  generateToken,
  authenticate,
  authorize,
  checkDocumentPermission,
  logActivity
};