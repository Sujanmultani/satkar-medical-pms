import api from './api';

export const changePassword = async (data) => {
  const response = await api.put('/auth/change-password', data);
  return response.data;
};

export const requestForgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordWithOtp = async (data) => {
  const response = await api.post('/auth/reset-password-otp', data);
  return response.data;
};
