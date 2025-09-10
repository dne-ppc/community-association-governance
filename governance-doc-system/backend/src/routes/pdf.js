const express = require('express');
const puppeteer = require('puppeteer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { convertMarkdownToHtml } = require('../utils/markdown');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Generate PDF from document
router.get('/generate/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { fillable = false } = req.query;
    
    // Get document
    const docResult = await query(
      `SELECT d.*, c.name as category_name
       FROM documents d
       LEFT JOIN document_categories c ON d.category_id = c.id
       WHERE d.id = $1`,
      [documentId]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const document = docResult.rows[0];
    
    // Check permissions
    if (!document.is_public && document.author_id !== req.user.id) {
      if (!['admin', 'president'].includes(req.user.role)) {
        const permResult = await query(
          'SELECT can_view FROM document_permissions WHERE document_id = $1 AND user_id = $2',
          [documentId, req.user.id]
        );
        
        if (permResult.rows.length === 0 || !permResult.rows[0].can_view) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    }
    
    // Get form fields if fillable
    let formFields = [];
    if (fillable && document.has_fillable_fields) {
      const fieldsResult = await query(
        'SELECT * FROM form_fields WHERE document_id = $1 ORDER BY position',
        [documentId]
      );
      formFields = fieldsResult.rows;
    }
    
    // Generate HTML
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${document.title}</title>
          <style>
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
            }
            h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; }
            h3 { color: #7f8c8d; }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 1px solid #ecf0f1;
            }
            .category {
              color: #3498db;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .metadata {
              font-size: 12px;
              color: #95a5a6;
              margin-top: 10px;
            }
            .content {
              margin-top: 30px;
            }
            .form-field {
              margin: 20px 0;
              padding: 15px;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
            }
            .form-field label {
              display: block;
              font-weight: bold;
              margin-bottom: 5px;
              color: #495057;
            }
            .form-field input,
            .form-field textarea,
            .form-field select {
              width: 100%;
              padding: 8px;
              border: 1px solid #ced4da;
              border-radius: 4px;
              font-size: 14px;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #ecf0f1;
              font-size: 12px;
              color: #95a5a6;
              text-align: center;
            }
            @media print {
              body { padding: 20px; }
              .form-field { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${document.category_name ? `<div class="category">${document.category_name}</div>` : ''}
            <h1>${document.title}</h1>
            <div class="metadata">
              Created: ${new Date(document.created_at).toLocaleDateString()}
              ${document.approved_at ? ` | Approved: ${new Date(document.approved_at).toLocaleDateString()}` : ''}
            </div>
          </div>
          <div class="content">
            ${document.content_html || convertMarkdownToHtml(document.content_markdown)}
          </div>
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>© 2025 Community Association Governance Document System</p>
          </div>
        </body>
      </html>
    `;
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      // If fillable, add form fields
      let finalPdfBuffer = pdfBuffer;
      if (fillable && formFields.length > 0) {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const form = pdfDoc.getForm();
        
        // Add form fields
        for (const field of formFields) {
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
          
          switch (field.field_type) {
            case 'text':
            case 'email':
            case 'number':
              const textField = form.createTextField(field.field_name);
              textField.setText(field.default_value || '');
              textField.addToPage(firstPage, {
                x: 50,
                y: 700 - (formFields.indexOf(field) * 50),
                width: 200,
                height: 20
              });
              break;
              
            case 'textarea':
              const textArea = form.createTextField(field.field_name);
              textArea.setText(field.default_value || '');
              textArea.setMultiline(true);
              textArea.addToPage(firstPage, {
                x: 50,
                y: 700 - (formFields.indexOf(field) * 80),
                width: 400,
                height: 60
              });
              break;
              
            case 'checkbox':
              const checkBox = form.createCheckBox(field.field_name);
              checkBox.addToPage(firstPage, {
                x: 50,
                y: 700 - (formFields.indexOf(field) * 50),
                width: 20,
                height: 20
              });
              break;
              
            case 'dropdown':
              const dropdown = form.createDropdown(field.field_name);
              if (field.options) {
                const options = JSON.parse(field.options);
                dropdown.setOptions(options);
              }
              dropdown.addToPage(firstPage, {
                x: 50,
                y: 700 - (formFields.indexOf(field) * 50),
                width: 200,
                height: 20
              });
              break;
          }
        }
        
        finalPdfBuffer = await pdfDoc.save();
      }
      
      // Update download count
      await query(
        'UPDATE documents SET download_count = download_count + 1 WHERE id = $1',
        [documentId]
      );
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.slug}.pdf"`);
      res.send(Buffer.from(finalPdfBuffer));
      
    } finally {
      await browser.close();
    }
  } catch (error) {
    logger.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF'
    });
  }
});

// Get PDF preview
router.get('/preview/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Check if cached PDF exists
    const cacheDir = path.join(__dirname, '../../cache/pdfs');
    await fs.mkdir(cacheDir, { recursive: true });
    
    const cachePath = path.join(cacheDir, `${documentId}.pdf`);
    
    try {
      // Check if cached file exists and is recent (less than 1 hour old)
      const stats = await fs.stat(cachePath);
      const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (ageInHours < 1) {
        const pdfBuffer = await fs.readFile(cachePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.send(pdfBuffer);
        return;
      }
    } catch (err) {
      // Cache doesn't exist or is old, generate new PDF
    }
    
    // Forward to generate endpoint
    req.url = `/generate/${documentId}`;
    router.handle(req, res);
  } catch (error) {
    logger.error('PDF preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview PDF'
    });
  }
});

module.exports = router;