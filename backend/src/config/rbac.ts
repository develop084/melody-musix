import { Role } from '../types/auth';

export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  ANALYTICS_READ: 'analytics:read',
  SYSTEM_ADMIN: 'system:admin',
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_WRITE,
  ],
  MANAGER: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_WRITE,
  ],
  USER: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_WRITE,
    PERMISSIONS.ANALYTICS_READ,
  ],
};

export function resolvePermissions(role: Role, customPermissions: string[] = []): string[] {
  const base = ROLE_PERMISSIONS[role] || [];
  return Array.from(new Set([...base, ...customPermissions]));
}
