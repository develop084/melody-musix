import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || undefined;
      const project = await projectService.create(userId, req.body);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || undefined;
      const projects = await projectService.list(userId);
      res.status(200).json(projects);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getById(req.params.id);
      res.status(200).json(project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
