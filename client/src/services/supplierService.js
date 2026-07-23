import api from './api';

export const searchSuppliers = async (search = '') => {
  const response = await api.get('/suppliers', { params: { search } });
  return response.data;
};

export const findOrCreateSupplier = async (supplierData) => {
  const response = await api.post('/suppliers/find-or-create', supplierData);
  return response.data;
};

export default {
  searchSuppliers,
  findOrCreateSupplier,
};
