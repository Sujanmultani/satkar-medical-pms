import api from './api';

export const scanInvoice = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/invoices/scan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const confirmInvoice = async (invoiceData) => {
  const response = await api.post('/invoices/confirm', invoiceData);
  return response.data;
};
