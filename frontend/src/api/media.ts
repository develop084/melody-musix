import { apiClient } from './client';
import { MediaTrack } from '../types';

export const mediaApi = {
  search: async (query: string): Promise<MediaTrack[]> => {
    const response = await apiClient.get<MediaTrack[]>('/media/search', {
      params: { q: query },
    });
    return response.data;
  },

  getSamples: async (): Promise<MediaTrack[]> => {
    const response = await apiClient.get<MediaTrack[]>('/media/samples');
    return response.data;
  },
};
