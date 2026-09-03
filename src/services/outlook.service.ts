import api from '../axios/dataService';

export const checkOutlookStatus = async () => {
  const response = await api.get('/outlook/status');
  return response.data;
};

export const syncOutlookContacts = async () => {
  const response = await api.post('/outlook/sync');
  return response.data;
};

export const getOutlookAuthUrl = async () => {
  const response = await api.get('/outlook/auth');
  return response.data;
};
