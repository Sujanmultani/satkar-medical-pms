import api from './api';

export const createReturn = async (returnData) => {
  const response = await api.post('/returns', returnData);
  return response.data;
};

export const getReturns = async (params = {}) => {
  const response = await api.get('/returns', { params });
  return response.data;
};

export const getReturnById = async (id) => {
  const response = await api.get(`/returns/${id}`);
  return response.data;
};

export default {
  createReturn,
  getReturns,
  getReturnById,
};
