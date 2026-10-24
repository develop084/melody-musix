import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
