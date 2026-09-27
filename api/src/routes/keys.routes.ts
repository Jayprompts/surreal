import { Router } from 'express';
import { getCurrentKey, listKeys, postFreeKey, revealCurrentKey } from '../controllers/keys.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listKeys);
router.get('/current', getCurrentKey);
router.post('/current/reveal', revealCurrentKey);
router.post('/free', postFreeKey);

export default router;
