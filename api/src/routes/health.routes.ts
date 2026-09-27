import { Router } from 'express';
import { pingDB } from '../db/client.js';

const router = Router();

// Used by the deploy health check and uptime monitoring.
router.get('/', async (_req, res) => {
  const ok = await pingDB();

  res.status(ok ? 200 : 503).json({
    success: ok,
    data: {
      status: ok ? 'ok' : 'degraded',
      db: ok ? 'connected' : 'unreachable',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
