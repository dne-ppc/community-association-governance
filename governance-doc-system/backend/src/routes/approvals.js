const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticate, authorize, logActivity } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { sendNotification } = require('../utils/notifications');
const logger = require('../utils/logger');

const router = express.Router();

// Get all approval requests
router.get('/', authenticate, authorize('admin', 'president'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let queryText = `
      SELECT 
        ar.id, ar.status, ar.requested_at, ar.reviewed_at, ar.notes, ar.priority, ar.due_date,
        d.id as document_id, d.title as document_title, d.slug as document_slug,
        dv.version_number,
        u1.first_name || ' ' || u1.last_name as requested_by_name,
        u2.first_name || ' ' || u2.last_name as reviewed_by_name
      FROM approval_requests ar
      JOIN documents d ON ar.document_id = d.id
      LEFT JOIN document_versions dv ON ar.version_id = dv.id
      LEFT JOIN users u1 ON ar.requested_by = u1.id
      LEFT JOIN users u2 ON ar.reviewed_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      queryText += ` AND ar.status = $${++paramCount}`;
      params.push(status);
    }
    
    queryText += ' ORDER BY ar.priority DESC, ar.requested_at DESC';
    
    const offset = (page - 1) * limit;
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM approval_requests WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countQuery += ' AND status = $1';
      countParams.push(status);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        approvals: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get approval requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval requests'
    });
  }
});

// Create approval request
router.post('/', authenticate, logActivity('create_approval_request'), [
  body('documentId').isUUID(),
  body('priority').optional().isInt({ min: 0, max: 5 }),
  body('dueDate').optional().isISO8601(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { documentId, priority = 0, dueDate, notes } = req.body;
    
    const result = await transaction(async (client) => {
      // Check if document exists and is pending
      const docResult = await client.query(
        'SELECT title, status, author_id FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      const doc = docResult.rows[0];
      
      if (doc.status !== 'pending') {
        throw new Error('Document is not in pending status');
      }
      
      // Check if user can request approval
      if (doc.author_id !== req.user.id && !['admin', 'president'].includes(req.user.role)) {
        throw new Error('You can only request approval for your own documents');
      }
      
      // Get latest version
      const versionResult = await client.query(
        'SELECT id FROM document_versions WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1',
        [documentId]
      );
      
      const versionId = versionResult.rows[0]?.id;
      
      // Create approval request
      const approvalResult = await client.query(
        `INSERT INTO approval_requests (
          document_id, version_id, requested_by, status, priority, due_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [documentId, versionId, req.user.id, 'pending', priority, dueDate, notes]
      );
      
      // Update document status
      await client.query(
        'UPDATE documents SET status = $1 WHERE id = $2',
        ['under_review', documentId]
      );
      
      // Send notifications to approvers
      const approversResult = await client.query(
        `SELECT id, email, first_name, last_name FROM users 
         WHERE role IN ('admin', 'president') AND active = true`
      );
      
      for (const approver of approversResult.rows) {
        await sendNotification(client, {
          userId: approver.id,
          type: 'approval_request',
          title: 'New Approval Request',
          message: `Document "${doc.title}" requires your approval`,
          data: {
            documentId,
            authorName: `${req.user.first_name} ${req.user.last_name}`
          }
        });
      }
      
      return approvalResult.rows[0];
    });
    
    res.status(201).json({
      success: true,
      message: 'Approval request created',
      data: result
    });
  } catch (error) {
    logger.error('Create approval request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create approval request'
    });
  }
});

// Approve or reject document
router.put('/:id', authenticate, authorize('admin', 'president'), logActivity('review_approval'), [
  body('status').isIn(['approved', 'rejected', 'changes_requested']),
  body('notes').optional().trim()
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
    const { status, notes } = req.body;
    
    const result = await transaction(async (client) => {
      // Get approval request
      const approvalResult = await client.query(
        `SELECT ar.*, d.title, d.author_id, u.email, u.first_name, u.last_name
         FROM approval_requests ar
         JOIN documents d ON ar.document_id = d.id
         JOIN users u ON d.author_id = u.id
         WHERE ar.id = $1`,
        [id]
      );
      
      if (approvalResult.rows.length === 0) {
        throw new Error('Approval request not found');
      }
      
      const approval = approvalResult.rows[0];
      
      if (approval.status !== 'pending') {
        throw new Error('Approval request has already been processed');
      }
      
      // Update approval request
      await client.query(
        `UPDATE approval_requests 
         SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, notes = $3
         WHERE id = $4`,
        [status, req.user.id, notes, id]
      );
      
      // Update document status
      let documentStatus = 'pending';
      if (status === 'approved') {
        documentStatus = 'approved';
        
        await client.query(
          `UPDATE documents 
           SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [documentStatus, req.user.id, approval.document_id]
        );
      } else if (status === 'rejected') {
        documentStatus = 'pending';
        
        await client.query(
          'UPDATE documents SET status = $1 WHERE id = $2',
          [documentStatus, approval.document_id]
        );
      } else if (status === 'changes_requested') {
        documentStatus = 'pending';
        
        await client.query(
          'UPDATE documents SET status = $1 WHERE id = $2',
          [documentStatus, approval.document_id]
        );
      }
      
      // Send notification to author
      await sendNotification(client, {
        userId: approval.author_id,
        type: 'approval_status',
        title: `Document ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Changes Requested'}`,
        message: `Your document "${approval.title}" has been ${status}`,
        data: {
          documentId: approval.document_id,
          status,
          notes
        }
      });
      
      // Send email notification
      await sendEmail(emailTemplates.approvalNotification({
        authorName: `${approval.first_name} ${approval.last_name}`,
        documentTitle: approval.title,
        status,
        approverName: `${req.user.first_name} ${req.user.last_name}`,
        notes,
        documentId: approval.document_id
      }));
      
      return {
        id,
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        notes
      };
    });
    
    res.json({
      success: true,
      message: `Document ${status}`,
      data: result
    });
  } catch (error) {
    logger.error('Review approval error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process approval'
    });
  }
});

// Get approval history for a document
router.get('/document/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const result = await query(
      `SELECT 
        ar.id, ar.status, ar.requested_at, ar.reviewed_at, ar.notes,
        dv.version_number,
        u1.first_name || ' ' || u1.last_name as requested_by_name,
        u2.first_name || ' ' || u2.last_name as reviewed_by_name
      FROM approval_requests ar
      LEFT JOIN document_versions dv ON ar.version_id = dv.id
      LEFT JOIN users u1 ON ar.requested_by = u1.id
      LEFT JOIN users u2 ON ar.reviewed_by = u2.id
      WHERE ar.document_id = $1
      ORDER BY ar.requested_at DESC`,
      [documentId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history'
    });
  }
});

module.exports = router;