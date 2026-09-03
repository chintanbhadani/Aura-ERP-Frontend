import dataService from '../axios/dataService';

export const fetchClients = async () => {
  const response = await dataService.get('/clients');
  return response.data;
};

export const createClient = async (clientData: any) => {
  const response = await dataService.post('/clients', clientData);
  return response.data;
};

export const checkClientConflict = async (checkData: any) => {
  const response = await dataService.post('/clients/check-conflict', checkData);
  return response.data;
};
