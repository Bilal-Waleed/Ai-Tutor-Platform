import axios from 'axios';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie'; 

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use(config => {
  const token = Cookies.get('token');  // Ab defined hai
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Response interceptor unchanged...
api.interceptors.response.use(response => response, error => {
  if (error.response) {
    const detail = error.response.data?.detail || error.response.statusText;
    if (error.response.status === 401) {
      Cookies.remove('token');  // Ab defined
      toast.error(`Auth Error: ${detail}. Logging out...`);
      window.location.href = '/login';
    } else if (error.response.status === 422) {
      toast.error(`Validation Error: ${detail}`);
    } else if (error.response.status === 500) {
      toast.error(`Server Error: ${detail}`);
    } else {
      toast.error(`Error ${error.response.status}: ${detail}`);
    }
  } else if (error.request) {
    toast.error('Network Error: No response from server.');
  } else {
    toast.error('Unexpected Error: ' + error.message);
  }
  return Promise.reject(error);
});

export default api;