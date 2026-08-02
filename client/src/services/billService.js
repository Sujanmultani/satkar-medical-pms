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

export const shareBill = async (id, { channel = 'whatsapp' } = {}) => {
  const response = await api.post(`/bills/${id}/share`, { channel });
  return response.data;
};

export const deleteBill = async (id, { restock = false } = {}) => {
  const response = await api.delete(`/bills/${id}`, {
    data: { restock },
    params: { restock },
  });
  return response.data;
};

export const getOrCreateShareLink = async (id) => {
  const response = await api.get(`/bills/${id}/share-link`);
  return response.data;
};

export const getBillByShareToken = async (token) => {
  const response = await api.get(`/bills/public/${token}`);
  return response.data;
};
