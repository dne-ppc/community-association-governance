const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all categories
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.*,
        pc.name as parent_name,
        COUNT(DISTINCT d.id) as document_count
      FROM document_categories c
      LEFT JOIN document_categories pc ON c.parent_id = pc.id
      LEFT JOIN documents d ON c.id = d.category_id
      GROUP BY c.id, pc.name
      ORDER BY c.sort_order, c.name`
    );
    
    // Build hierarchical structure
    const categories = result.rows;
    const categoryMap = {};
    const rootCategories = [];
    
    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });
    
    categories.forEach(cat => {
      if (cat.parent_id) {
        if (categoryMap[cat.parent_id]) {
          categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
        }
      } else {
        rootCategories.push(categoryMap[cat.id]);
      }
    });
    
    res.json({
      success: true,
      data: rootCategories
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get single category
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        c.*,
        pc.name as parent_name,
        COUNT(DISTINCT d.id) as document_count
      FROM document_categories c
      LEFT JOIN document_categories pc ON c.parent_id = pc.id
      LEFT JOIN documents d ON c.id = d.category_id
      WHERE c.id = $1
      GROUP BY c.id, pc.name`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get subcategories
    const subResult = await query(
      'SELECT * FROM document_categories WHERE parent_id = $1 ORDER BY sort_order, name',
      [id]
    );
    
    // Get documents in this category
    const docsResult = await query(
      `SELECT 
        d.id, d.title, d.slug, d.status, d.created_at,
        u.first_name || ' ' || u.last_name as author_name
      FROM documents d
      LEFT JOIN users u ON d.author_id = u.id
      WHERE d.category_id = $1
      ORDER BY d.created_at DESC
      LIMIT 10`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...result.rows[0],
        subcategories: subResult.rows,
        recent_documents: docsResult.rows
      }
    });
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
});

// Create category
router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty().trim(),
  body('slug').notEmpty().trim(),
  body('description').optional().trim(),
  body('parentId').optional().isUUID(),
  body('sortOrder').optional().isInt(),
  body('requiredApprovalRole').optional().isIn(['admin', 'president', 'board_member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { name, slug, description, parentId, sortOrder = 0, requiredApprovalRole = 'president', icon } = req.body;
    
    // Check if slug already exists
    const existingResult = await query(
      'SELECT id FROM document_categories WHERE slug = $1',
      [slug]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category slug already exists'
      });
    }
    
    const result = await query(
      `INSERT INTO document_categories 
       (name, slug, parent_id, description, icon, sort_order, required_approval_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, parentId, description, icon, sortOrder, requiredApprovalRole]
    );
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// Update category
router.put('/:id', authenticate, authorize('admin'), [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('parentId').optional().isUUID(),
  body('sortOrder').optional().isInt()
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
    
    // Build update query
    let updateQuery = 'UPDATE document_categories SET updated_at = CURRENT_TIMESTAMP';
    const updateParams = [];
    let paramCount = 0;
    
    if (updates.name) {
      updateQuery += `, name = $${++paramCount}`;
      updateParams.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateQuery += `, description = $${++paramCount}`;
      updateParams.push(updates.description);
    }
    
    if (updates.parentId !== undefined) {
      updateQuery += `, parent_id = $${++paramCount}`;
      updateParams.push(updates.parentId);
    }
    
    if (updates.sortOrder !== undefined) {
      updateQuery += `, sort_order = $${++paramCount}`;
      updateParams.push(updates.sortOrder);
    }
    
    if (updates.icon !== undefined) {
      updateQuery += `, icon = $${++paramCount}`;
      updateParams.push(updates.icon);
    }
    
    if (updates.requiredApprovalRole !== undefined) {
      updateQuery += `, required_approval_role = $${++paramCount}`;
      updateParams.push(updates.requiredApprovalRole);
    }
    
    updateQuery += ` WHERE id = $${++paramCount} RETURNING *`;
    updateParams.push(id);
    
    const result = await query(updateQuery, updateParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// Delete category
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has documents
    const docsResult = await query(
      'SELECT COUNT(*) as count FROM documents WHERE category_id = $1',
      [id]
    );
    
    if (parseInt(docsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with documents. Please move or delete documents first.'
      });
    }
    
    // Check if category has subcategories
    const subsResult = await query(
      'SELECT COUNT(*) as count FROM document_categories WHERE parent_id = $1',
      [id]
    );
    
    if (parseInt(subsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }
    
    const result = await query(
      'DELETE FROM document_categories WHERE id = $1 RETURNING name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

module.exports = router;