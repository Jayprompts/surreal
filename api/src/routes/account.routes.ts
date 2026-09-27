import { Router } from 'express';
import { getMe } from '../controllers/account.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getMe);

export default router;
