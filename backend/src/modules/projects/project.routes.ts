import { Router } from 'express';
import { projectController } from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createProjectSchema } from './project.schema';

const router = Router();


router.get('/', projectController.list.bind(projectController));
router.post(
  '/',
  validate({ body: createProjectSchema }),
  projectController.create.bind(projectController)
);
router.get('/:id', projectController.getById.bind(projectController));
router.delete('/:id', projectController.delete.bind(projectController));

export const projectRouter = router;
