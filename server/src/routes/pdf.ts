import { Router } from 'express';
import {
  generatePDF,
  generateFillablePDF,
  previewPDF
} from '../controllers/pdfController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// PDF generation routes
router.get('/:documentId', optionalAuth, generatePDF);
router.get('/:documentId/fillable', optionalAuth, generateFillablePDF);
router.get('/:documentId/preview', optionalAuth, previewPDF);

export default router;