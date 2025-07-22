// src/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'import.meta.env.VITE_API_URL;/api', // 设置基础URL
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器，自动在请求头中附加Token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default apiClient;