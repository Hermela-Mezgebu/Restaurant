import { apiFetch } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'diner' | 'staff' | 'admin';
}

interface LoginResponse {
  success?: boolean;
  message?: string;
  data: {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    user: User;
  };
}

export const login = async (
  email: string,
  password: string
) => {
  const response = await apiFetch<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const token = response.data.access_token;
  const user = response.data.user;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  return user;
};

export const register = async (
  name: string,
  email: string,
  password: string,
  role: string
) => {
  const response = await apiFetch(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    }
  );

  return response;
};

export const logout = async () => {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const getToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('token');
};

<<<<<<< Updated upstream
export const getUser = () => {
=======
export const getUser = (): User | null => {
>>>>>>> Stashed changes
  if (typeof window === 'undefined') {
    return null;
  }

  const user = localStorage.getItem('user');

<<<<<<< Updated upstream
  if (!user || user === 'undefined' || user === 'null') {
=======
  if (!user) {
>>>>>>> Stashed changes
    return null;
  }

  try {
<<<<<<< Updated upstream
    return JSON.parse(user);
  } catch (error) {
    console.error('Invalid user data in localStorage:', error);
=======
    return JSON.parse(user) as User;
  } catch {
>>>>>>> Stashed changes
    localStorage.removeItem('user');
    return null;
  }
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const isAdmin = () => {
  const user = getUser();

  return user?.role === 'admin';
};

export const isStaff = () => {
  const user = getUser();

  return user?.role === 'staff' || user?.role === 'admin';
};