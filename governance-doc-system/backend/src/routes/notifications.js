const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { read, page = 1, limit = 20 } = req.query;
    
    let queryText = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;
    
    const params = [req.user.id];
    let paramCount = 1;
    
    if (read !== undefined) {
      queryText += ` AND read = $${++paramCount}`;
      params.push(read === 'true');
    }
    
    queryText += ' ORDER BY created_at DESC';
    
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1';
    const countParams = [req.user.id];
    
    if (read !== undefined) {
      countQuery += ' AND read = $2';
      countParams.push(read === 'true');
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get unread count
    const unreadResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unreadCount: parseInt(unreadResult.rows[0].count),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE notifications 
       SET read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await query(
      `UPDATE notifications 
       SET read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      message: `${result.rowCount} notifications marked as read`
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// Delete all read notifications
router.delete('/clear-read', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE user_id = $1 AND read = true',
      [req.user.id]
    );
    
    res.json({
      success: true,
      message: `${result.rowCount} notifications deleted`
    });
  } catch (error) {
    logger.error('Clear read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
});

module.exports = router;