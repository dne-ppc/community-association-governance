const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticate, authorize, checkDocumentPermission, logActivity } = require('../middleware/auth');
const { convertMarkdownToHtml } = require('../utils/markdown');
const { createDiff } = require('../utils/diff');
const { sendNotification } = require('../utils/notifications');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all documents with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      status, 
      category, 
      author, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    let queryText = `
      SELECT 
        d.id, d.title, d.slug, d.status, d.excerpt,
        d.created_at, d.updated_at, d.is_public, d.has_fillable_fields,
        d.view_count, d.download_count,
        c.name as category_name, c.slug as category_slug,
        u.first_name || ' ' || u.last_name as author_name,
        a.first_name || ' ' || a.last_name as approved_by_name,
        d.approved_at,
        COUNT(DISTINCT dv.id) as version_count,
        array_agg(DISTINCT t.name) as tags
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN users u ON d.author_id = u.id
      LEFT JOIN users a ON d.approved_by = a.id
      LEFT JOIN document_versions dv ON d.id = dv.document_id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Apply filters based on user role
    if (!['admin', 'president'].includes(req.user.role)) {
      if (req.user.role === 'public') {
        queryText += ` AND d.is_public = true AND d.status = 'approved'`;
      } else {
        queryText += ` AND (d.is_public = true OR d.author_id = $${++paramCount} OR EXISTS (
          SELECT 1 FROM document_permissions dp 
          WHERE dp.document_id = d.id AND dp.user_id = $${paramCount} AND dp.can_view = true
        ))`;
        params.push(req.user.id);
      }
    }

    if (status) {
      queryText += ` AND d.status = $${++paramCount}`;
      params.push(status);
    }

    if (category) {
      queryText += ` AND c.slug = $${++paramCount}`;
      params.push(category);
    }

    if (author) {
      queryText += ` AND d.author_id = $${++paramCount}`;
      params.push(author);
    }

    if (search) {
      queryText += ` AND (
        d.title ILIKE $${++paramCount} OR 
        d.content_markdown ILIKE $${paramCount} OR
        d.excerpt ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    queryText += ` GROUP BY d.id, c.name, c.slug, u.first_name, u.last_name, a.first_name, a.last_name`;

    // Add sorting
    const allowedSortFields = ['created_at', 'updated_at', 'title', 'status', 'view_count'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryText += ` ORDER BY d.${sortField} ${order}`;

    // Add pagination
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      WHERE 1=1
    `;

    const countParams = [];
    let countParamCount = 0;

    // Apply same filters for count
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

    if (status) {
      countQuery += ` AND d.status = $${++countParamCount}`;
      countParams.push(status);
    }

    if (category) {
      countQuery += ` AND c.slug = $${++countParamCount}`;
      countParams.push(category);
    }

    if (author) {
      countQuery += ` AND d.author_id = $${++countParamCount}`;
      countParams.push(author);
    }

    if (search) {
      countQuery += ` AND (
        d.title ILIKE $${++countParamCount} OR 
        d.content_markdown ILIKE $${countParamCount} OR
        d.excerpt ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
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
    logger.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

// Get single document
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        d.*,
        c.name as category_name, c.slug as category_slug,
        u.first_name || ' ' || u.last_name as author_name,
        u.email as author_email,
        a.first_name || ' ' || a.last_name as approved_by_name,
        array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)) as tags
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      LEFT JOIN users u ON d.author_id = u.id
      LEFT JOIN users a ON d.approved_by = a.id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.id = $1
      GROUP BY d.id, c.name, c.slug, u.first_name, u.last_name, u.email, a.first_name, a.last_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = result.rows[0];

    // Check permissions
    if (!['admin', 'president'].includes(req.user.role)) {
      if (document.is_public && document.status === 'approved') {
        // Public document, allow access
      } else if (document.author_id === req.user.id) {
        // Author can view their own documents
      } else {
        // Check specific permissions
        const permResult = await query(
          'SELECT can_view FROM document_permissions WHERE document_id = $1 AND user_id = $2',
          [id, req.user.id]
        );

        if (permResult.rows.length === 0 || !permResult.rows[0].can_view) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    }

    // Get form fields if document has fillable fields
    let formFields = [];
    if (document.has_fillable_fields) {
      const fieldsResult = await query(
        'SELECT * FROM form_fields WHERE document_id = $1 ORDER BY position',
        [id]
      );
      formFields = fieldsResult.rows;
    }

    // Get attachments
    const attachmentsResult = await query(
      'SELECT * FROM document_attachments WHERE document_id = $1 ORDER BY uploaded_at DESC',
      [id]
    );

    // Update view count
    await query(
      'UPDATE documents SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...document,
        formFields,
        attachments: attachmentsResult.rows
      }
    });
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
});

// Create new document
router.post('/', authenticate, logActivity('create_document'), [
  body('title').notEmpty().trim(),
  body('content').notEmpty(),
  body('categoryId').optional().isUUID(),
  body('isPublic').optional().isBoolean(),
  body('tags').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      content,
      categoryId,
      isPublic = false,
      tags = [],
      formFields = []
    } = req.body;

    const result = await transaction(async (client) => {
      // Generate slug
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now();

      // Convert markdown to HTML
      const contentHtml = convertMarkdownToHtml(content);

      // Create excerpt
      const excerpt = content.substring(0, 200).replace(/[#*`]/g, '').trim() + '...';

      // Insert document
      const docResult = await client.query(
        `INSERT INTO documents (
          title, slug, category_id, status, content_markdown, content_html, 
          excerpt, author_id, is_public, has_fillable_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          title,
          slug,
          categoryId,
          'pending',
          content,
          contentHtml,
          excerpt,
          req.user.id,
          isPublic,
          formFields.length > 0
        ]
      );

      const document = docResult.rows[0];

      // Create initial version
      await client.query(
        `INSERT INTO document_versions (
          document_id, version_number, content_markdown, content_html, 
          author_id, change_description, is_major_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          document.id,
          '1.0.0',
          content,
          contentHtml,
          req.user.id,
          'Initial version',
          true
        ]
      );

      // Add tags
      for (const tagName of tags) {
        // Get or create tag
        let tagResult = await client.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );

        if (tagResult.rows.length === 0) {
          const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          tagResult = await client.query(
            'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, tagSlug]
          );
        }

        // Link tag to document
        await client.query(
          'INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2)',
          [document.id, tagResult.rows[0].id]
        );
      }

      // Add form fields
      for (let i = 0; i < formFields.length; i++) {
        const field = formFields[i];
        await client.query(
          `INSERT INTO form_fields (
            document_id, field_name, field_label, field_type, position, 
            required, placeholder_text, default_value, options, validation_rules, width
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            document.id,
            field.name,
            field.label,
            field.type,
            i,
            field.required || false,
            field.placeholder,
            field.defaultValue,
            field.options ? JSON.stringify(field.options) : null,
            field.validationRules ? JSON.stringify(field.validationRules) : null,
            field.width || '100%'
          ]
        );
      }

      // Send notification to approvers
      const approversResult = await client.query(
        `SELECT id, email, first_name FROM users 
         WHERE role IN ('admin', 'president') AND active = true`
      );

      for (const approver of approversResult.rows) {
        await sendNotification(client, {
          userId: approver.id,
          type: 'approval_request',
          title: 'New Document Pending Approval',
          message: `${req.user.first_name} ${req.user.last_name} has created a new document "${title}" that requires approval.`,
          data: { documentId: document.id }
        });
      }

      return document;
    });

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document'
    });
  }
});

// Update document
router.put('/:id', authenticate, checkDocumentPermission('can_edit'), logActivity('update_document'), [
  body('title').optional().notEmpty().trim(),
  body('content').optional().notEmpty(),
  body('categoryId').optional().isUUID(),
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

    // Get current document
    const currentResult = await query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const currentDoc = currentResult.rows[0];

    const result = await transaction(async (client) => {
      // Update document
      let updateQuery = 'UPDATE documents SET updated_at = CURRENT_TIMESTAMP';
      const updateParams = [];
      let paramCount = 0;

      if (updates.title) {
        updateQuery += `, title = $${++paramCount}`;
        updateParams.push(updates.title);
      }

      if (updates.content) {
        const contentHtml = convertMarkdownToHtml(updates.content);
        const excerpt = updates.content.substring(0, 200).replace(/[#*`]/g, '').trim() + '...';
        
        updateQuery += `, content_markdown = $${++paramCount}, content_html = $${++paramCount}, excerpt = $${++paramCount}`;
        updateParams.push(updates.content, contentHtml, excerpt);

        // Create new version
        const versionResult = await client.query(
          'SELECT COUNT(*) as count FROM document_versions WHERE document_id = $1',
          [id]
        );
        
        const versionCount = parseInt(versionResult.rows[0].count);
        const newVersion = `1.${versionCount}.0`;
        
        // Calculate diff
        const diff = createDiff(currentDoc.content_markdown, updates.content);
        
        await client.query(
          `INSERT INTO document_versions (
            document_id, version_number, content_markdown, content_html, 
            author_id, change_description, content_diff, is_major_version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            newVersion,
            updates.content,
            contentHtml,
            req.user.id,
            updates.changeDescription || 'Content updated',
            diff,
            false
          ]
        );
      }

      if (updates.categoryId !== undefined) {
        updateQuery += `, category_id = $${++paramCount}`;
        updateParams.push(updates.categoryId);
      }

      if (updates.isPublic !== undefined) {
        updateQuery += `, is_public = $${++paramCount}`;
        updateParams.push(updates.isPublic);
      }

      updateQuery += ` WHERE id = $${++paramCount} RETURNING *`;
      updateParams.push(id);

      const updateResult = await client.query(updateQuery, updateParams);

      // Update tags if provided
      if (updates.tags) {
        // Remove existing tags
        await client.query('DELETE FROM document_tags WHERE document_id = $1', [id]);

        // Add new tags
        for (const tagName of updates.tags) {
          let tagResult = await client.query(
            'SELECT id FROM tags WHERE name = $1',
            [tagName]
          );

          if (tagResult.rows.length === 0) {
            const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            tagResult = await client.query(
              'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
              [tagName, tagSlug]
            );
          }

          await client.query(
            'INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2)',
            [id, tagResult.rows[0].id]
          );
        }
      }

      // Reset approval status if content changed
      if (updates.content && currentDoc.status === 'approved') {
        await client.query(
          'UPDATE documents SET status = $1, approved_by = NULL, approved_at = NULL WHERE id = $2',
          ['pending', id]
        );

        // Notify approvers
        const approversResult = await client.query(
          `SELECT id, email, first_name FROM users 
           WHERE role IN ('admin', 'president') AND active = true`
        );

        for (const approver of approversResult.rows) {
          await sendNotification(client, {
            userId: approver.id,
            type: 'approval_request',
            title: 'Document Updated - Approval Required',
            message: `${req.user.first_name} ${req.user.last_name} has updated the document "${updates.title || currentDoc.title}" which requires re-approval.`,
            data: { documentId: id }
          });
        }
      }

      return updateResult.rows[0];
    });

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
});

// Delete document
router.delete('/:id', authenticate, checkDocumentPermission('can_delete'), logActivity('delete_document'), async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by archiving
    const result = await query(
      `UPDATE documents SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING title`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: 'Document archived successfully'
    });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

module.exports = router;