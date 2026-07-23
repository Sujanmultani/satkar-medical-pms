import api from './api';

export const getItems = async (params = {}) => {
  const response = await api.get('/items', { params });
  return response.data;
};

export const searchByComposition = async (q, storeType = '') => {
  const response = await api.get('/items/search-composition', { params: { q, storeType } });
  return response.data;
};

export const getAlternatives = async (itemId) => {
  const response = await api.get(`/items/${itemId}/alternatives`);
  return response.data;
};

export const getItemById = async (id) => {
  const response = await api.get(`/items/${id}`);
  return response.data;
};

export const createItem = async (itemData) => {
  const response = await api.post('/items', itemData);
  return response.data;
};

export const updateItem = async (id, itemData) => {
  const response = await api.put(`/items/${id}`, itemData);
  return response.data;
};

export const deleteItem = async (id) => {
  const response = await api.delete(`/items/${id}`);
  return response.data;
};
