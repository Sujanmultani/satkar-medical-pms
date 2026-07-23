import api from './api';

export const getBatches = async (itemId) => {
  const response = await api.get('/batches', { params: { itemId } });
  return response.data;
};

export const createBatch = async (batchData) => {
  const response = await api.post('/batches', batchData);
  return response.data;
};

export const updateBatch = async (id, batchData) => {
  const response = await api.put(`/batches/${id}`, batchData);
  return response.data;
};

export const deleteBatch = async (id) => {
  const response = await api.delete(`/batches/${id}`);
  return response.data;
};
