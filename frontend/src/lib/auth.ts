import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'diner' | 'staff' | 'admin';
}

interface LoginResponse {
  token: string;
  user: User;
}

export const login = async (email: string, password: string) => {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
};

export const register = async (name: string, email: string, password: string, role: string) => {
  const { data } = await api.post('/auth/register', { name, email, password, role });
  return data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => !!getToken();

export const isAdmin = () => {
  const user = getUser();
  return user?.role === 'admin';
};

export const isStaff = () => {
  const user = getUser();
  return user?.role === 'staff' || user?.role === 'admin';
};
