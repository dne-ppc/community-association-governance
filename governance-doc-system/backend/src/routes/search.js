const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Full-text search
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, type, category, status, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    let searchQuery = `
      SELECT 
        d.id, d.title, d.slug, d.excerpt, d.status, d.created_at, d.updated_at,
        c.name as category_name,
        u.first_name || ' ' || u.last_name as author_name,
        ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(d.content_markdown, '')), plainto_tsquery('english', $1)) as relevance
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN users u ON d.author_id = u.id
      WHERE to_tsvector('english', d.title || ' ' || COALESCE(d.content_markdown, '')) @@ plainto_tsquery('english', $1)
    `;
    
    const params = [q];
    let paramCount = 1;
    
    // Apply filters based on user role
    if (!['admin', 'president'].includes(req.user.role)) {
      if (req.user.role === 'public') {
        searchQuery += ` AND d.is_public = true AND d.status = 'approved'`;
      } else {
        searchQuery += ` AND (d.is_public = true OR d.author_id = $${++paramCount} OR EXISTS (
          SELECT 1 FROM document_permissions dp 
          WHERE dp.document_id = d.id AND dp.user_id = $${paramCount} AND dp.can_view = true
        ))`;
        params.push(req.user.id);
      }
    }
    
    if (type) {
      searchQuery += ` AND d.type = $${++paramCount}`;
      params.push(type);
    }
    
    if (category) {
      searchQuery += ` AND c.slug = $${++paramCount}`;
      params.push(category);
    }
    
    if (status) {
      searchQuery += ` AND d.status = $${++paramCount}`;
      params.push(status);
    }
    
    searchQuery += ' ORDER BY relevance DESC, d.created_at DESC';
    
    const offset = (page - 1) * limit;
    searchQuery += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await query(searchQuery, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      WHERE to_tsvector('english', d.title || ' ' || COALESCE(d.content_markdown, '')) @@ plainto_tsquery('english', $1)
    `;
    
    const countParams = [q];
    let countParamCount = 1;
    
    if (!['admin', 'president'].includes(req.user.role)) {
      if (req.user.role === 'public') {
        countQuery += ` AND d.is_public = true AND d.status = 'approved'`;
      } else {
        countQuery += ` AND (d.is_public = true OR d.author_id = $${++countParamCount} OR EXISTS (
          SELECT 1 FROM document_permissions dp 
          WHERE dp.document_id = d.id AND dp.user_id = $${countParamCount} AND dp.can_view = true
        ))`;
        countParams.push(req.user.id);
      }
    }
    
    if (type) {
      countQuery += ` AND d.type = $${++countParamCount}`;
      countParams.push(type);
    }
    
    if (category) {
      countQuery += ` AND c.slug = $${++countParamCount}`;
      countParams.push(category);
    }
    
    if (status) {
      countQuery += ` AND d.status = $${++countParamCount}`;
      countParams.push(status);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Log search query for analytics
    await query(
      `INSERT INTO saved_searches (user_id, name, query, filters)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        `Search: ${q}`,
        q,
        JSON.stringify({ type, category, status })
      ]
    );
    
    res.json({
      success: true,
      data: {
        results: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        query: q
      }
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// Get search suggestions
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const result = await query(
      `SELECT DISTINCT title
       FROM documents
       WHERE title ILIKE $1
       AND status = 'approved'
       LIMIT 10`,
      [`%${q}%`]
    );
    
    const suggestions = result.rows.map(row => row.title);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
});

// Get saved searches
router.get('/saved', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, query, filters, created_at
       FROM saved_searches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Get saved searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved searches'
    });
  }
});

// Delete saved search
router.delete('/saved/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(
      'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Saved search deleted'
    });
  } catch (error) {
    logger.error('Delete saved search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete saved search'
    });
  }
});

module.exports = router;