import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BrandingContext = createContext();
const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULTS = {
  platform_name: 'redação com nicolle',
  logo_url: '',
  favicon_url: '',
  primary_color: '#7C1805',
  secondary_color: '#D66B27',
  accent_color: '#36555A',
  role_student: 'Aluno',
  role_teacher: 'Professor',
  role_admin: 'Admin',
  welcome_message: '',
  footer_text: '',
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be within BrandingProvider');
  return ctx;
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULTS);

  useEffect(() => {
    axios.get(`${API_URL}/api/settings/branding/public`)
      .then(r => setBranding({ ...DEFAULTS, ...r.data }))
      .catch(() => {});
  }, []);

  // Aplicar cores CSS dinamicamente
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primary_color);
    root.style.setProperty('--brand-secondary', branding.secondary_color);
    root.style.setProperty('--brand-accent', branding.accent_color);

    // Favicon
    if (branding.favicon_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }

    // Título da aba
    if (branding.platform_name) {
      document.title = branding.platform_name;
    }
  }, [branding]);

  const roleLabel = (role) => {
    if (role === 'student') return branding.role_student || 'Aluno';
    if (role === 'teacher') return branding.role_teacher || 'Professor';
    if (role === 'admin') return branding.role_admin || 'Admin';
    return role;
  };

  return (
    <BrandingContext.Provider value={{ branding, setBranding, roleLabel }}>
      {children}
    </BrandingContext.Provider>
  );
};
