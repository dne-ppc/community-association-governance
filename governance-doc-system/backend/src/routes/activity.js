const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get activity log
router.get('/', authenticate, authorize('admin', 'president'), async (req, res) => {
  try {
    const { userId, action, entityType, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let queryText = `
      SELECT 
        al.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (userId) {
      queryText += ` AND al.user_id = $${++paramCount}`;
      params.push(userId);
    }
    
    if (action) {
      queryText += ` AND al.action = $${++paramCount}`;
      params.push(action);
    }
    
    if (entityType) {
      queryText += ` AND al.entity_type = $${++paramCount}`;
      params.push(entityType);
    }
    
    if (startDate) {
      queryText += ` AND al.timestamp >= $${++paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      queryText += ` AND al.timestamp <= $${++paramCount}`;
      params.push(endDate);
    }
    
    queryText += ' ORDER BY al.timestamp DESC';
    
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM activity_log WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (userId) {
      countQuery += ` AND user_id = $${++countParamCount}`;
      countParams.push(userId);
    }
    
    if (action) {
      countQuery += ` AND action = $${++countParamCount}`;
      countParams.push(action);
    }
    
    if (entityType) {
      countQuery += ` AND entity_type = $${++countParamCount}`;
      countParams.push(entityType);
    }
    
    if (startDate) {
      countQuery += ` AND timestamp >= $${++countParamCount}`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ` AND timestamp <= $${++countParamCount}`;
      countParams.push(endDate);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        activities: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity log'
    });
  }
});

// Get user's activity
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Users can only view their own activity unless admin
    if (req.user.id !== userId && !['admin', 'president'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT * FROM activity_log 
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    const countResult = await query(
      'SELECT COUNT(*) as total FROM activity_log WHERE user_id = $1',
      [userId]
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        activities: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity'
    });
  }
});

// Get activity statistics
router.get('/stats', authenticate, authorize('admin', 'president'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE timestamp BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE timestamp >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE timestamp <= $1';
      params.push(endDate);
    }
    
    // Get activity by action
    const actionStatsQuery = `
      SELECT action, COUNT(*) as count
      FROM activity_log
      ${dateFilter}
      GROUP BY action
      ORDER BY count DESC
    `;
    
    const actionStats = await query(actionStatsQuery, params);
    
    // Get activity by user
    const userStatsQuery = `
      SELECT 
        u.first_name || ' ' || u.last_name as user_name,
        COUNT(*) as count
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      ${dateFilter ? dateFilter.replace('WHERE', 'WHERE al.') : ''}
      GROUP BY u.first_name, u.last_name
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const userStats = await query(userStatsQuery, params);
    
    // Get activity by hour
    const hourlyStatsQuery = `
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM activity_log
      ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `;
    
    const hourlyStats = await query(hourlyStatsQuery, params);
    
    // Get total activities
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM activity_log
      ${dateFilter}
    `;
    
    const totalResult = await query(totalQuery, params);
    
    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        byAction: actionStats.rows,
        byUser: userStats.rows,
        byHour: hourlyStats.rows
      }
    });
  } catch (error) {
    logger.error('Get activity statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics'
    });
  }
});

module.exports = router;