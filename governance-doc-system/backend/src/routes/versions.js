const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { compareVersions } = require('../utils/diff');
const logger = require('../utils/logger');

const router = express.Router();

// Get all versions of a document
router.get('/document/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const result = await query(
      `SELECT 
        dv.id, dv.version_number, dv.created_at, dv.change_description, dv.is_major_version,
        u.first_name || ' ' || u.last_name as author_name,
        u.email as author_email
      FROM document_versions dv
      LEFT JOIN users u ON dv.author_id = u.id
      WHERE dv.document_id = $1
      ORDER BY dv.created_at DESC`,
      [documentId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Get document versions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document versions'
    });
  }
});

// Get specific version
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        dv.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.email as author_email
      FROM document_versions dv
      LEFT JOIN users u ON dv.author_id = u.id
      WHERE dv.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Get version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch version'
    });
  }
});

// Compare two versions
router.get('/compare/:version1Id/:version2Id', authenticate, async (req, res) => {
  try {
    const { version1Id, version2Id } = req.params;
    
    const version1Result = await query(
      `SELECT 
        dv.*,
        u.first_name || ' ' || u.last_name as author_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.author_id = u.id
      WHERE dv.id = $1`,
      [version1Id]
    );
    
    const version2Result = await query(
      `SELECT 
        dv.*,
        u.first_name || ' ' || u.last_name as author_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.author_id = u.id
      WHERE dv.id = $1`,
      [version2Id]
    );
    
    if (version1Result.rows.length === 0 || version2Result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'One or both versions not found'
      });
    }
    
    const comparison = compareVersions(
      version1Result.rows[0],
      version2Result.rows[0]
    );
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    logger.error('Compare versions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare versions'
    });
  }
});

// Restore a version
router.post('/:id/restore', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the version to restore
    const versionResult = await query(
      'SELECT * FROM document_versions WHERE id = $1',
      [id]
    );
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }
    
    const version = versionResult.rows[0];
    
    // Update the document with the version's content
    await query(
      `UPDATE documents 
       SET content_markdown = $1, content_html = $2, updated_at = CURRENT_TIMESTAMP, status = 'pending'
       WHERE id = $3`,
      [version.content_markdown, version.content_html, version.document_id]
    );
    
    // Create a new version entry for the restoration
    const countResult = await query(
      'SELECT COUNT(*) as count FROM document_versions WHERE document_id = $1',
      [version.document_id]
    );
    
    const versionCount = parseInt(countResult.rows[0].count);
    const newVersionNumber = `1.${versionCount}.0`;
    
    await query(
      `INSERT INTO document_versions (
        document_id, version_number, content_markdown, content_html,
        author_id, change_description, is_major_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        version.document_id,
        newVersionNumber,
        version.content_markdown,
        version.content_html,
        req.user.id,
        `Restored from version ${version.version_number}`,
        false
      ]
    );
    
    res.json({
      success: true,
      message: 'Version restored successfully',
      data: {
        restoredVersion: version.version_number,
        newVersion: newVersionNumber
      }
    });
  } catch (error) {
    logger.error('Restore version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore version'
    });
  }
});

module.exports = router;