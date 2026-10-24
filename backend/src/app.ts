import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/users/user.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { mediaRouter } from './modules/media/media.routes';
import { projectRouter } from './modules/projects/project.routes';
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';

export function createApp() {
  const app = express();

  // Security & Core Middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? true : (env.CORS_ORIGIN || '*'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    })
  );
  app.use(express.json());

  // Interactive OpenAPI Documentation (Single Source of Truth)
  const openApiSpecPath = path.resolve(__dirname, '../../spec/openapi.yaml');
  try {
    const swaggerDocument = YAML.load(openApiSpecPath);
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (error) {
    console.warn('⚠️ Could not load OpenAPI spec for Swagger UI at path:', openApiSpecPath, error);
  }

  // Health Endpoint
  const appStartTime = Date.now();
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: (Date.now() - appStartTime) / 1000,
      environment: env.NODE_ENV,
    });
  });

  // API Domain Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/media', mediaRouter);
  app.use('/api/v1/projects', projectRouter);

  // Serve Single-App Frontend Build in Production
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/docs')) {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // 404 Catch-All
  app.use((_req: Request, _res: Response, next) => {
    next(new NotFoundError('The requested endpoint was not found on this server'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
