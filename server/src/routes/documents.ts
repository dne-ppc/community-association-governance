import { Router } from 'express';
import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  getDocumentDiff
} from '../controllers/documentController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (with optional auth for better UX)
router.get('/', optionalAuth, getDocuments);
router.get('/:id', optionalAuth, getDocument);
router.get('/:id/versions', optionalAuth, getDocumentVersions);
router.get('/:id/diff', optionalAuth, getDocumentDiff);

// Protected routes
router.post('/', authenticate, createDocument);
router.put('/:id', authenticate, updateDocument);
router.delete('/:id', authenticate, deleteDocument);

export default router;