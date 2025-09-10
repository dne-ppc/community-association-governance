import { Request, Response, NextFunction } from 'express';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// PDF template HTML
const getPDFTemplate = (title: string, content: string, formFields: any[] = []) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            color: #333;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .header .subtitle {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        .content {
            margin-bottom: 40px;
        }
        .content h1, .content h2, .content h3 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .content h1 {
            font-size: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .content h2 {
            font-size: 18px;
        }
        .content h3 {
            font-size: 16px;
        }
        .content p {
            margin-bottom: 15px;
            text-align: justify;
        }
        .content ul, .content ol {
            margin-bottom: 15px;
            padding-left: 30px;
        }
        .content li {
            margin-bottom: 5px;
        }
        .content table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .content table th,
        .content table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .content table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .form-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .form-section h2 {
            background-color: #f5f5f5;
            padding: 10px;
            margin: 0 0 20px 0;
            border-left: 4px solid #333;
        }
        .form-field {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .form-field label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .form-field input[type="text"],
        .form-field input[type="email"],
        .form-field input[type="date"],
        .form-field textarea,
        .form-field select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
        }
        .form-field textarea {
            height: 80px;
            resize: vertical;
        }
        .form-field .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        .form-field .checkbox-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .form-field .radio-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .form-field .radio-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .signature-field {
            border: 1px solid #ccc;
            height: 60px;
            margin-top: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f9f9f9;
        }
        .required {
            color: red;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        @media print {
            body {
                margin: 0;
                padding: 20px;
            }
            .form-field input,
            .form-field textarea,
            .form-field select {
                border: none;
                border-bottom: 1px solid #000;
                background: transparent;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">Community Association Governance Document</div>
    </div>
    
    <div class="content">
        ${content}
    </div>
    
    ${formFields.length > 0 ? `
    <div class="form-section">
        <h2>Form Section</h2>
        ${formFields.map(field => generateFormFieldHTML(field)).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>
</body>
</html>`;
};

const generateFormFieldHTML = (field: any) => {
  const required = field.required ? '<span class="required">*</span>' : '';
  
  switch (field.fieldType) {
    case 'TEXT':
    case 'EMAIL':
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <input type="${field.fieldType.toLowerCase()}" 
                 name="${field.fieldName}" 
                 placeholder="${field.placeholderText || ''}"
                 ${field.required ? 'required' : ''}>
        </div>
      `;
      
    case 'DATE':
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <input type="date" 
                 name="${field.fieldName}"
                 ${field.required ? 'required' : ''}>
        </div>
      `;
      
    case 'TEXTAREA':
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <textarea name="${field.fieldName}" 
                    placeholder="${field.placeholderText || ''}"
                    ${field.required ? 'required' : ''}></textarea>
        </div>
      `;
      
    case 'CHECKBOX':
      const checkboxOptions = field.options ? JSON.parse(field.options) : [];
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <div class="checkbox-group">
            ${checkboxOptions.map((option: string) => `
              <div class="checkbox-item">
                <input type="checkbox" name="${field.fieldName}" value="${option}">
                <label>${option}</label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
    case 'RADIO':
      const radioOptions = field.options ? JSON.parse(field.options) : [];
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <div class="radio-group">
            ${radioOptions.map((option: string) => `
              <div class="radio-item">
                <input type="radio" name="${field.fieldName}" value="${option}">
                <label>${option}</label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
    case 'SELECT':
      const selectOptions = field.options ? JSON.parse(field.options) : [];
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <select name="${field.fieldName}" ${field.required ? 'required' : ''}>
            <option value="">Please select...</option>
            ${selectOptions.map((option: string) => `
              <option value="${option}">${option}</option>
            `).join('')}
          </select>
        </div>
      `;
      
    case 'SIGNATURE':
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <div class="signature-field">
            <span>Signature: _________________________ Date: ___________</span>
          </div>
        </div>
      `;
      
    default:
      return `
        <div class="form-field">
          <label>${field.fieldName} ${required}</label>
          <input type="text" 
                 name="${field.fieldName}" 
                 placeholder="${field.placeholderText || ''}"
                 ${field.required ? 'required' : ''}>
        </div>
      `;
  }
};

export const generatePDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;

    // Get document with form fields
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        formFields: {
          orderBy: { position: 'asc' }
        },
        category: true
      }
    });

    if (!document) {
      throw createError('Document not found.', 404);
    }

    // Check if user has access to this document
    if (req.user) {
      const canAccess = req.user.role === 'ADMIN' || 
                       req.user.role === 'PRESIDENT' || 
                       req.user.role === 'BOARD_MEMBER' ||
                       document.authorId === req.user.id ||
                       (document.isPublic && document.status === 'LIVE');

      if (!canAccess) {
        throw createError('You do not have permission to generate PDF for this document.', 403);
      }
    } else {
      // Public users can only access public live documents
      if (!document.isPublic || document.status !== 'LIVE') {
        throw createError('You do not have permission to generate PDF for this document.', 403);
      }
    }

    // Convert markdown to HTML
    const htmlContent = marked(document.contentMarkdown);

    // Generate HTML template
    const html = getPDFTemplate(document.title, htmlContent, document.formFields);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for it to load
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

    await browser.close();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.slug}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Log activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'GENERATE_PDF',
          entityType: 'DOCUMENT',
          entityId: documentId,
          details: { documentTitle: document.title },
          ipAddress: req.ip
        }
      });
    }

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const generateFillablePDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;

    // Get document with form fields
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        formFields: {
          orderBy: { position: 'asc' }
        },
        category: true
      }
    });

    if (!document) {
      throw createError('Document not found.', 404);
    }

    if (!document.hasFillableFields || document.formFields.length === 0) {
      throw createError('This document does not have fillable form fields.', 400);
    }

    // Check if user has access to this document
    if (req.user) {
      const canAccess = req.user.role === 'ADMIN' || 
                       req.user.role === 'PRESIDENT' || 
                       req.user.role === 'BOARD_MEMBER' ||
                       document.authorId === req.user.id ||
                       (document.isPublic && document.status === 'LIVE');

      if (!canAccess) {
        throw createError('You do not have permission to generate fillable PDF for this document.', 403);
      }
    } else {
      // Public users can only access public live documents
      if (!document.isPublic || document.status !== 'LIVE') {
        throw createError('You do not have permission to generate fillable PDF for this document.', 403);
      }
    }

    // Convert markdown to HTML
    const htmlContent = marked(document.contentMarkdown);

    // Generate HTML template with fillable forms
    const html = getPDFTemplate(document.title, htmlContent, document.formFields);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for it to load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF with form fields
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

    await browser.close();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.slug}-fillable.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Log activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'GENERATE_FILLABLE_PDF',
          entityType: 'DOCUMENT',
          entityId: documentId,
          details: { documentTitle: document.title },
          ipAddress: req.ip
        }
      });
    }

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const previewPDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        formFields: {
          orderBy: { position: 'asc' }
        },
        category: true
      }
    });

    if (!document) {
      throw createError('Document not found.', 404);
    }

    // Check if user has access to this document
    if (req.user) {
      const canAccess = req.user.role === 'ADMIN' || 
                       req.user.role === 'PRESIDENT' || 
                       req.user.role === 'BOARD_MEMBER' ||
                       document.authorId === req.user.id ||
                       (document.isPublic && document.status === 'LIVE');

      if (!canAccess) {
        throw createError('You do not have permission to preview this document.', 403);
      }
    } else {
      // Public users can only access public live documents
      if (!document.isPublic || document.status !== 'LIVE') {
        throw createError('You do not have permission to preview this document.', 403);
      }
    }

    // Convert markdown to HTML
    const htmlContent = marked(document.contentMarkdown);

    // Generate HTML template
    const html = getPDFTemplate(document.title, htmlContent, document.formFields);

    res.json({
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug
      },
      html
    });
  } catch (error) {
    next(error);
  }
};