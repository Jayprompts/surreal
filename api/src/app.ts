import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

export const app = express();

app.set('trust proxy', 1); // behind Nginx in production (correct client IPs for rate limiting)

app.use(helmet());
app.use(cors({ origin: env.WEB_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (!isProd) app.use(morgan('dev'));

// ── API routes ──────────────────────────────────────
app.use('/api/health', healthRoutes);

// ── Fallbacks ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
