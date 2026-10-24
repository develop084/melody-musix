import { prisma } from '../../db/prisma';
import { NotFoundError } from '../../utils/errors';
import { Role } from '../../types/auth';
import { resolvePermissions } from '../../config/rbac';

export class UserService {
  async listUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      let customPermissions: string[] = [];
      try {
        customPermissions = JSON.parse(user.permissions);
      } catch {
        customPermissions = [];
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        permissions: resolvePermissions(user.role as Role, customPermissions),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    });
  }

  async updateUserRole(id: string, newRole: Role) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError(`User with ID '${id}' was not found`);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: newRole },
    });

    let customPermissions: string[] = [];
    try {
      customPermissions = JSON.parse(updated.permissions);
    } catch {
      customPermissions = [];
    }

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as Role,
      permissions: resolvePermissions(updated.role as Role, customPermissions),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

export const userService = new UserService();
