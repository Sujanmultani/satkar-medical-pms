import api from './api';

export const createBill = async (billData) => {
  const response = await api.post('/bills', billData);
  return response.data;
};

export const getBills = async (params = {}) => {
  const response = await api.get('/bills', { params });
  return response.data;
};

export const getBillById = async (id) => {
  const response = await api.get(`/bills/${id}`);
  return response.data;
};

export const markPrinted = async (id) => {
  const response = await api.patch(`/bills/${id}/mark-printed`);
  return response.data;
};
