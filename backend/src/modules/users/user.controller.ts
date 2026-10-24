import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { Role } from '../../types/auth';

export class UserController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.listUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body as { role: Role };
      const updatedUser = await userService.updateUserRole(id, role);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
