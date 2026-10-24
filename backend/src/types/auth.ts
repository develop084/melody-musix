export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface JwtUserPayload {
  id: string;
  email: string;
  role: Role;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
