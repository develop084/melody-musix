import { prisma } from '../../db/prisma';
import { CreateProjectInput } from './project.schema';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export class ProjectService {
  async create(userId: string, input: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        title: input.title,
        bpm: input.bpm,
        durationMs: input.durationMs,
        tracksJson: JSON.stringify(input.tracks),
        userId,
      },
    });

    return {
      id: project.id,
      title: project.title,
      bpm: project.bpm,
      durationMs: project.durationMs,
      tracks: JSON.parse(project.tracksJson),
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async list(userId: string) {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      bpm: p.bpm,
      durationMs: p.durationMs,
      tracks: JSON.parse(p.tracksJson),
      userId: p.userId,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async getById(userId: string, id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID '${id}' was not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this project');
    }

    return {
      id: project.id,
      title: project.title,
      bpm: project.bpm,
      durationMs: project.durationMs,
      tracks: JSON.parse(project.tracksJson),
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async delete(userId: string, id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID '${id}' was not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this project');
    }

    await prisma.project.delete({
      where: { id },
    });
  }
}

export const projectService = new ProjectService();
