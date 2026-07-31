import api from './api';

export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettings = async (settingsData) => {
  const response = await api.put('/settings', settingsData);
  return response.data;
};

export const clearAllDataApi = async () => {
  const response = await api.post('/admin/clear-all-data');
  return response.data;
};
