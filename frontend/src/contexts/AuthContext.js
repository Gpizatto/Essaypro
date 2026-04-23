import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_URL = process.env.REACT_APP_BACKEND_URL;

// ── Chaves de localStorage para fallback (guia anônima / cross-device) ──────
const LS_ACCESS  = 'essaypro_access_token';
const LS_REFRESH = 'essaypro_refresh_token';
const LS_USER    = 'essaypro_user';

const saveTokens = (access, refresh) => {
  try {
    if (access)  localStorage.setItem(LS_ACCESS,  access);
    if (refresh) localStorage.setItem(LS_REFRESH, refresh);
  } catch (e) { /* localStorage indisponível */ }
};

const clearTokens = () => {
  try {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
  } catch (e) {}
};

const getStoredToken = (key) => {
  try { return localStorage.getItem(key) || ''; }
  catch (e) { return ''; }
};

// ── Axios: sempre enviar token do localStorage como header fallback ───────────
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const token = getStoredToken(LS_ACCESS);
  if (token) config.headers['X-Access-Token'] = token;
  return config;
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false); // evita loop de refresh

  // ── Interceptor global: tenta refresh antes de redirecionar ───────────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => {
        // Capturar tokens dos headers de resposta (login/refresh)
        const access  = response.headers['x-access-token'];
        const refresh = response.headers['x-refresh-token'];
        if (access || refresh) saveTokens(access, refresh);
        return response;
      },
      async (error) => {
        const status = error.response?.status;
        const originalReq = error.config;

        if (status === 401 && !originalReq._retry) {
          // Evitar loop infinito e não tentar refresh no próprio endpoint de refresh/login
          if (
            refreshingRef.current ||
            originalReq.url?.includes('/auth/refresh') ||
            originalReq.url?.includes('/auth/login')
          ) {
            clearTokens();
            if (window.location.pathname !== '/login') window.location.href = '/login';
            return Promise.reject(error);
          }

          originalReq._retry = true;
          refreshingRef.current = true;

          try {
            const refreshToken = getStoredToken(LS_REFRESH);
            const headers = refreshToken ? { 'X-Refresh-Token': refreshToken } : {};
            const { data, headers: respHeaders } = await axios.post(
              `${API_URL}/api/auth/refresh`,
              {},
              { withCredentials: true, headers, _retry: true }
            );
            // Salvar novo token
            const newAccess = data.access_token || respHeaders['x-access-token'];
            if (newAccess) saveTokens(newAccess, null);

            // Reenviar request original com novo token
            originalReq.headers['X-Access-Token'] = newAccess;
            refreshingRef.current = false;
            return axios(originalReq);
          } catch (refreshErr) {
            refreshingRef.current = false;
            clearTokens();
            setUser(false);
            if (window.location.pathname !== '/login') window.location.href = '/login';
            return Promise.reject(refreshErr);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
      setUser(data);
      // Salvar user no localStorage para recuperação rápida
      try { localStorage.setItem(LS_USER, JSON.stringify(data)); } catch (e) {}
    } catch (error) {
      // Tentar restaurar user do localStorage enquanto refresh acontece
      try {
        const stored = localStorage.getItem(LS_USER);
        if (stored) setUser(JSON.parse(stored));
        else setUser(false);
      } catch (e) {
        setUser(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, headers } = await axios.post(
      `${API_URL}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    // Salvar tokens do header (fallback para guia anônima)
    const access  = headers['x-access-token'];
    const refresh = headers['x-refresh-token'];
    saveTokens(access, refresh);
    try { localStorage.setItem(LS_USER, JSON.stringify(data)); } catch (e) {}
    setUser(data);
    return data;
  };

  const register = async (name, email, password, role = 'student', phone = '') => {
    const { data } = await axios.post(
      `${API_URL}/api/auth/register`,
      { name, email, password, role, phone }
    );
    return data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (e) { /* ignorar erro de logout */ }
    clearTokens();
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
