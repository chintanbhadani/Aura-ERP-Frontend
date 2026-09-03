import dataService from '../axios/dataService';
import type { User } from '../helper/fe.interface';

export const loginApi = async (credentials: any): Promise<{ user: User; token: string }> => {
  const response = await dataService.post('/auth/login', credentials);
  return response.data;
};

export const fetchUserProfile = async (): Promise<User> => {
  const response = await dataService.get('/auth/me');
  return response.data;
};
