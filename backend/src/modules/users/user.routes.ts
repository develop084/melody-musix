import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateUserRoleSchema, userIdParamSchema } from './user.schema';
import { PERMISSIONS } from '../../config/rbac';

const router = Router();

// List users: Accessible to ADMIN and MANAGER with 'users:read'
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  requirePermission(PERMISSIONS.USERS_READ),
  userController.list.bind(userController)
);

// Update user role: Accessible only to ADMIN with 'users:write'
router.patch(
  '/:id/role',
  authenticate,
  authorize('ADMIN'),
  requirePermission(PERMISSIONS.USERS_WRITE),
  validate({
    params: userIdParamSchema,
    body: updateUserRoleSchema,
  }),
  userController.updateRole.bind(userController)
);

export const userRouter = router;
