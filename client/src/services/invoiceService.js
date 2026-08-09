import api from './api';

export const scanInvoice = async (fileOrFiles) => {
  const formData = new FormData();
  const fileArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];

  fileArray.forEach((file) => {
    formData.append('images', file);
  });

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

export const checkDuplicateInvoice = async (supplierName, invoiceNo) => {
  const response = await api.get('/invoices/check-duplicate', {
    params: { supplierName, invoiceNo },
  });
  return response.data;
};

export const searchInvoiceByNumber = async (invoiceNo) => {
  const response = await api.get('/invoices/search', {
    params: { invoiceNo },
  });
  return response.data;
};

export const deleteInvoice = async (id, { rollbackStock = false } = {}) => {
  const response = await api.delete(`/invoices/${id}`, {
    data: { rollbackStock },
    params: { rollbackStock },
  });
  return response.data;
};

export const getOrCreateInvoiceShareLink = async (id) => {
  const response = await api.get(`/invoices/${id}/share-link`);
  return response.data;
};

export const getInvoiceByShareToken = async (token) => {
  const response = await api.get(`/invoices/public/${token}`);
  return response.data;
};
