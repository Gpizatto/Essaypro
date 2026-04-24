import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BrandingContext = createContext();
const API_URL = process.env.REACT_APP_BACKEND_URL;

export const BRANDING_DEFAULTS = {
  platform_name: 'redação com nicolle',
  logo_url: '',
  favicon_url: '',
  // Cores principais
  primary_color: '#7C1805',
  secondary_color: '#D66B27',
  accent_color: '#36555A',
  // Cores de fundo e texto
  bg_color: '#FDF3E8',
  bg_card_color: '#FFFFFF',
  text_color: '#2C1A0E',
  text_soft_color: '#6B5B4E',
  border_color: '#E8DDD0',
  // Nomes de perfis
  role_student: 'Aluno',
  role_teacher: 'Professor',
  role_admin: 'Admin',
  // Textos
  welcome_message: '',
  footer_text: '',
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be within BrandingProvider');
  return ctx;
};

// Aplica todas as variáveis CSS baseadas no branding
const applyBrandingCSS = (b) => {
  const root = document.documentElement;

  const primary    = b.primary_color    || BRANDING_DEFAULTS.primary_color;
  const secondary  = b.secondary_color  || BRANDING_DEFAULTS.secondary_color;
  const accent     = b.accent_color     || BRANDING_DEFAULTS.accent_color;
  const bg         = b.bg_color         || BRANDING_DEFAULTS.bg_color;
  const bgCard     = b.bg_card_color    || BRANDING_DEFAULTS.bg_card_color;
  const text       = b.text_color       || BRANDING_DEFAULTS.text_color;
  const textSoft   = b.text_soft_color  || BRANDING_DEFAULTS.text_soft_color;
  const border     = b.border_color     || BRANDING_DEFAULTS.border_color;

  // Variáveis de branding (--brand-*)
  root.style.setProperty('--brand-primary',   primary);
  root.style.setProperty('--brand-secondary', secondary);
  root.style.setProperty('--brand-accent',    accent);
  root.style.setProperty('--brand-bg',        bg);
  root.style.setProperty('--brand-bg-card',   bgCard);
  root.style.setProperty('--brand-text',      text);
  root.style.setProperty('--brand-text-soft', textSoft);
  root.style.setProperty('--brand-border',    border);

  // Variáveis semânticas usadas pelos componentes (--accent-*, --bg-*, --text-*, --border-color)
  // Estas são as variáveis usadas após o Q-05 em todos os arquivos da plataforma
  root.style.setProperty('--accent-red',    primary);
  root.style.setProperty('--accent-orange', secondary);
  root.style.setProperty('--accent-green',  accent);
  root.style.setProperty('--bg-primary',    bg);
  root.style.setProperty('--bg-card',       bgCard);
  root.style.setProperty('--text-primary',  text);
  root.style.setProperty('--text-secondary',textSoft);
  root.style.setProperty('--border-color',  border);

  // Aplicar direto no body para garantir propagação imediata
  document.body.style.backgroundColor = bg;
  document.body.style.color           = text;

  // Favicon
  if (b.favicon_url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = b.favicon_url;
  }

  // Título da aba
  if (b.platform_name) document.title = b.platform_name;
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBrandingState] = useState(BRANDING_DEFAULTS);

  // Carregar branding público ao iniciar
  useEffect(() => {
    axios.get(`${API_URL}/api/settings/branding/public`)
      .then(r => {
        const merged = { ...BRANDING_DEFAULTS, ...r.data };
        setBrandingState(merged);
        applyBrandingCSS(merged);
      })
      .catch(() => applyBrandingCSS(BRANDING_DEFAULTS));
  }, []);

  // Re-aplicar CSS sempre que branding mudar
  useEffect(() => {
    applyBrandingCSS(branding);
  }, [branding]);

  // setBranding também aplica CSS imediatamente
  const setBranding = (newBranding) => {
    const merged = { ...BRANDING_DEFAULTS, ...newBranding };
    setBrandingState(merged);
    applyBrandingCSS(merged);
  };

  const roleLabel = (role) => {
    if (role === 'student') return branding.role_student || 'Aluno';
    if (role === 'teacher') return branding.role_teacher || 'Professor';
    if (role === 'admin')   return branding.role_admin   || 'Admin';
    return role;
  };

  return (
    <BrandingContext.Provider value={{ branding, setBranding, roleLabel }}>
      {children}
    </BrandingContext.Provider>
  );
};
