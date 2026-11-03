import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Maintenance Mode Middleware
app.use((req, res, next) => {
  if (env.MAINTENANCE_MODE && !req.path.includes('/auth') && !req.path.includes('/health')) {
    return res.status(503).json({
      success: false,
      error: { code: 'MAINTENANCE_MODE', message: 'Platform is currently undergoing scheduled maintenance.' },
    });
  }
  next();
});

// API Routes
app.use(env.API_PREFIX, routes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.originalUrl} not found.` },
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
