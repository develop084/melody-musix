import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Role '${req.user.role}' does not have access. Allowed roles: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // ADMIN has superuser privileges
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const hasPermission = req.user.permissions && req.user.permissions.includes(permission);
    if (!hasPermission) {
      return next(
        new ForbiddenError(`Forbidden: Missing required permission '${permission}'`)
      );
    }

    next();
  };
}
