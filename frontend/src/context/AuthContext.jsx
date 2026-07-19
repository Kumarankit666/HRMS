import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hrms_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (employeeCode, password) => {
    const res = await api.post('/auth/login', { employeeCode, password });
    const data = res.data.data;
    localStorage.setItem('hrms_token', data.token);
    localStorage.setItem('hrms_user', JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    setUser(null);
  }, []);

  const isAdminOrHr = user && ['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, isAdminOrHr }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
