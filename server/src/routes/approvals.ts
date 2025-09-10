import { Router } from 'express';
import {
  requestApproval,
  getApprovalRequests,
  getApprovalRequest,
  reviewApproval,
  cancelApprovalRequest
} from '../controllers/approvalController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/request', requestApproval);
router.get('/', getApprovalRequests);
router.get('/:id', getApprovalRequest);
router.put('/:id/review', reviewApproval);
router.put('/:id/cancel', cancelApprovalRequest);

export default router;