import { prisma } from '../../db/prisma';
import { CreateProjectInput } from './project.schema';
import { NotFoundError } from '../../utils/errors';

export class ProjectService {
  async create(userId: string | undefined, input: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        title: input.title,
        bpm: input.bpm,
        durationMs: input.durationMs,
        tracksJson: JSON.stringify(input.tracks),
        userId: userId || null,
      },
    });

    return {
      id: project.id,
      title: project.title,
      bpm: project.bpm,
      durationMs: project.durationMs,
      tracks: JSON.parse(project.tracksJson),
      userId: project.userId || undefined,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async list(userId?: string) {
    const where = userId ? { userId } : {};
    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      bpm: p.bpm,
      durationMs: p.durationMs,
      tracks: JSON.parse(p.tracksJson),
      userId: p.userId || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async getById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID '${id}' was not found`);
    }

    return {
      id: project.id,
      title: project.title,
      bpm: project.bpm,
      durationMs: project.durationMs,
      tracks: JSON.parse(project.tracksJson),
      userId: project.userId || undefined,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async delete(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID '${id}' was not found`);
    }

    await prisma.project.delete({
      where: { id },
    });
  }
}

export const projectService = new ProjectService();
