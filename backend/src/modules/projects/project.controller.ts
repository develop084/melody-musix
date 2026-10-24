import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { UnauthorizedError } from '../../utils/errors';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const project = await projectService.create(req.user.id, req.body);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const projects = await projectService.list(req.user.id);
      res.status(200).json(projects);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const project = await projectService.getById(req.user.id, req.params.id);
      res.status(200).json(project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      await projectService.delete(req.user.id, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
