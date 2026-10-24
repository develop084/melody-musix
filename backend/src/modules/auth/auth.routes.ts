import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema';

const router = Router();

router.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register.bind(authController)
);

router.post(
  '/login',
  validate({ body: loginSchema }),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refresh.bind(authController)
);

router.get(
  '/me',
  authenticate,
  authController.me.bind(authController)
);

export const authRouter = router;
