import { apiClient } from './client';
import { User, Role } from '../types';

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },

  updateUserRole: async (userId: string, role: Role): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${userId}/role`, { role });
    return response.data;
  },
};
