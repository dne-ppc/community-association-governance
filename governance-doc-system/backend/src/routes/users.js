const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, active, page = 1, limit = 20 } = req.query;
    
    let queryText = `
      SELECT 
        id, email, first_name, last_name, role, phone, department,
        created_at, last_login, active, email_verified
      FROM users
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (role) {
      queryText += ` AND role = $${++paramCount}`;
      params.push(role);
    }
    
    if (active !== undefined) {
      queryText += ` AND active = $${++paramCount}`;
      params.push(active === 'true');
    }
    
    queryText += ' ORDER BY created_at DESC';
    
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (role) {
      countQuery += ` AND role = $${++countParamCount}`;
      countParams.push(role);
    }
    
    if (active !== undefined) {
      countQuery += ` AND active = $${++countParamCount}`;
      countParams.push(active === 'true');
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const result = await query(
      `SELECT 
        id, email, first_name, last_name, role, phone, department,
        created_at, last_login, active, email_verified
      FROM users
      WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user statistics
    const statsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM documents WHERE author_id = $1) as documents_created,
        (SELECT COUNT(*) FROM documents WHERE approved_by = $1) as documents_approved,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1) as comments_made,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = $1) as total_activities`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...result.rows[0],
        statistics: statsResult.rows[0]
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user
router.put('/:id', authenticate, [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phone').optional().trim(),
  body('department').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Users can only update their own profile unless admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Build update query
    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const updateParams = [];
    let paramCount = 0;
    
    if (updates.firstName) {
      updateQuery += `, first_name = $${++paramCount}`;
      updateParams.push(updates.firstName);
    }
    
    if (updates.lastName) {
      updateQuery += `, last_name = $${++paramCount}`;
      updateParams.push(updates.lastName);
    }
    
    if (updates.phone !== undefined) {
      updateQuery += `, phone = $${++paramCount}`;
      updateParams.push(updates.phone);
    }
    
    if (updates.department !== undefined) {
      updateQuery += `, department = $${++paramCount}`;
      updateParams.push(updates.department);
    }
    
    // Admin can update role and active status
    if (req.user.role === 'admin') {
      if (updates.role) {
        updateQuery += `, role = $${++paramCount}`;
        updateParams.push(updates.role);
      }
      
      if (updates.active !== undefined) {
        updateQuery += `, active = $${++paramCount}`;
        updateParams.push(updates.active);
      }
    }
    
    updateQuery += ` WHERE id = $${++paramCount} RETURNING *`;
    updateParams.push(id);
    
    const result = await query(updateQuery, updateParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        role: result.rows[0].role,
        phone: result.rows[0].phone,
        department: result.rows[0].department,
        active: result.rows[0].active
      }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    // Soft delete by deactivating
    const result = await query(
      'UPDATE users SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING email',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get user's documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Users can only view their own documents unless admin
    if (req.user.id !== id && !['admin', 'president'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT 
        d.id, d.title, d.slug, d.status, d.created_at, d.updated_at,
        c.name as category_name
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      WHERE d.author_id = $1
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    
    const countResult = await query(
      'SELECT COUNT(*) as total FROM documents WHERE author_id = $1',
      [id]
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        documents: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get user documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user documents'
    });
  }
});

module.exports = router;