import { Router } from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  getUserActivity
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUsers);
router.get('/:id', getUser);
router.get('/:id/activity', getUserActivity);
router.put('/:id', updateUser);
router.put('/:id/deactivate', deactivateUser);
router.put('/:id/activate', activateUser);

export default router;