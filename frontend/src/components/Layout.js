import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBranding } from '../contexts/BrandingContext';
import { Button } from './ui/button';
import { Home, FileText, Users, LogOut, PenTool, BookOpen, BarChart3, Settings, Bell, Moon, Sun, Palette, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const notifCache = {
  data: [],
  unread: 0,
  lastFetch: 0,
  TTL: 60000,
};

// Gera iniciais a partir do nome
const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { branding, roleLabel: brandingRoleLabel } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - notifCache.lastFetch < notifCache.TTL) {
      setNotifications(notifCache.data);
      setUnread(notifCache.unread);
      return;
    }
    try {
      const { data } = await axios.get(`${API_URL}/api/notifications`, { withCredentials: true });
      notifCache.data = data.notifications || [];
      notifCache.unread = data.unread || 0;
      notifCache.lastFetch = Date.now();
      setNotifications(notifCache.data);
      setUnread(notifCache.unread);
    } catch (e) { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifications(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, { withCredentials: true });
      const updated = notifCache.data.map(n => n.id === id ? { ...n, read: true } : n);
      notifCache.data = updated;
      notifCache.unread = Math.max(0, notifCache.unread - 1);
      setNotifications(updated);
      setUnread(notifCache.unread);
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_URL}/api/notifications/read-all`, {}, { withCredentials: true });
      const updated = notifCache.data.map(n => ({ ...n, read: true }));
      notifCache.data = updated;
      notifCache.unread = 0;
      setNotifications(updated);
      setUnread(0);
    } catch (e) {}
  };

  const handleNotifClick = (notif) => {
    if (!notif.read) markRead(notif.id);
    if (notif.link) navigate(notif.link);
    setShowNotifs(false);
  };

  const NOTIF_COLORS = {
    success: '#36555A',
    warning: '#D97706',
    essay:   '#7C1805',
    info:    '#6B5B4E',
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Até logo!');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const getMenuItems = () => {
    if (user.role === 'student') {
      return [
        { path: '/dashboard', icon: Home, label: 'Início' },
        { path: '/prompts', icon: BookOpen, label: 'Temas' },
        { path: '/calendar', icon: Calendar, label: 'Calendário' },
        { path: '/my-essays', icon: FileText, label: 'Minhas Redações' },
      ];
    } else if (user.role === 'teacher') {
      return [
        { path: '/dashboard', icon: Home, label: 'Início' },
        { path: '/correction-queue', icon: PenTool, label: 'Correções' },
        { path: '/teacher/students', icon: Users, label: 'Alunos' },
        { path: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
        { path: '/manage-prompts', icon: BookOpen, label: 'Propostas' },
        { path: '/teacher/report', icon: BarChart3, label: 'Meu Relatório' },
      ];
    } else if (user.role === 'admin') {
      return [
        { path: '/dashboard', icon: Home, label: 'Início' },
        { path: '/manage-prompts', icon: BookOpen, label: 'Propostas' },
        { path: '/admin/users', icon: Users, label: 'Usuários' },
        { path: '/admin/courses', icon: Users, label: 'Turmas' },
        { path: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
        { path: '/admin/logs', icon: FileText, label: 'Logs' },
        { path: '/settings', icon: Settings, label: 'Configurações' },
        { path: '/admin/branding', icon: Palette, label: 'Personalização' },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();
  const roleLabel = user.role === 'student' ? 'ALUNA' : user.role === 'teacher' ? 'PROF.' : 'ADMIN';
  const roleColor = user.role === 'student' ? '#36555A' : user.role === 'teacher' ? '#D66B27' : '#7C1805';
  const initials = getInitials(user.name);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--brand-bg, #FDF3E8)' }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ backgroundColor: 'var(--bg-sidebar, #7C1805)' }}>

        {/* Logo */}
        <div style={{ padding: '28px 24px 20px' }}>
          <h1 className="font-script text-4xl leading-tight" style={{ color: '#FDF3E8' }} data-testid="app-logo">
            redação
          </h1>
          <h1 className="font-script text-4xl leading-tight" style={{ color: '#DAB257' }}>
            com nicolle
          </h1>
          <p className="text-xs mt-2 font-body" style={{ color: 'rgba(253,243,232,0.5)', letterSpacing: '0.05em' }}>
            Plataforma de Correção
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'rgba(253,243,232,0.1)', margin: '0 20px' }} />

        {/* Nav */}
        <nav className="flex-1 mt-2" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'rgba(253,243,232,0.15)' : 'transparent',
                  color: isActive ? '#FDF3E8' : 'rgba(253,243,232,0.6)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Indicador lateral integrado */}
                <div style={{
                  width: '3px',
                  height: '18px',
                  borderRadius: '2px',
                  backgroundColor: isActive ? '#DAB257' : 'transparent',
                  flexShrink: 0,
                  transition: 'background-color 0.15s',
                }} />
                <Icon size={16} />
                <span style={{ fontSize: '13.5px', fontWeight: isActive ? 600 : 400, letterSpacing: '0.01em' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div style={{ borderTop: '1px solid rgba(253,243,232,0.1)', padding: '16px 16px 20px' }}>

          {/* Avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#DAB257',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#7C1805',
              flexShrink: 0,
              letterSpacing: '0.02em',
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#FDF3E8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(253,243,232,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
            <span style={{
              flexShrink: 0,
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '99px',
              backgroundColor: roleColor,
              color: '#FDF3E8',
              letterSpacing: '0.03em',
            }}>
              {roleLabel}
            </span>
          </div>

          {/* Ações compactas em linha */}
          <div style={{ display: 'flex', gap: '6px' }} ref={notifRef}>
            {/* Modo escuro */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 0',
                borderRadius: '8px',
                border: '1px solid rgba(253,243,232,0.12)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'rgba(253,243,232,0.65)',
                fontSize: '11.5px',
                fontWeight: 500,
                transition: 'background-color 0.15s',
              }}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
              <span>{isDark ? 'Claro' : 'Escuro'}</span>
            </button>

            {/* Notificações */}
            <button
              onClick={() => setShowNotifs(v => !v)}
              title="Notificações"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 0',
                borderRadius: '8px',
                border: '1px solid rgba(253,243,232,0.12)',
                backgroundColor: showNotifs ? 'rgba(255,255,255,0.1)' : 'transparent',
                cursor: 'pointer',
                color: 'rgba(253,243,232,0.65)',
                fontSize: '11.5px',
                fontWeight: 500,
                position: 'relative',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Bell size={13} />
                {unread > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#D66B27',
                    border: '1.5px solid var(--bg-sidebar, #7C1805)',
                  }} />
                )}
              </div>
              <span>Avisos</span>
            </button>

            {/* Sair */}
            <button
              onClick={handleLogout}
              title="Sair"
              data-testid="logout-button"
              style={{
                width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0',
                borderRadius: '8px',
                border: '1px solid rgba(253,243,232,0.12)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'rgba(253,243,232,0.65)',
                transition: 'background-color 0.15s',
              }}
            >
              <LogOut size={13} />
            </button>

            {/* Dropdown de notificações */}
            {showNotifs && (
              <div style={{
                position: 'absolute',
                bottom: '72px',
                left: '12px',
                right: '12px',
                backgroundColor: '#FFF',
                borderRadius: '12px',
                zIndex: 100,
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                maxHeight: '320px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #F0EBE3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#7C1805' }}>Notificações</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: '11px', color: '#D66B27', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Marcar tudo como lido
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6B5B4E', fontSize: '13px' }}>
                      Nenhuma notificação
                    </div>
                  ) : notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #F9F6F3',
                        cursor: notif.link ? 'pointer' : 'default',
                        backgroundColor: notif.read ? '#FFF' : '#FFFBF5',
                        borderLeft: notif.read ? 'none' : `3px solid ${NOTIF_COLORS[notif.type] || '#D66B27'}`,
                      }}
                    >
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#2C1A0E', marginBottom: '2px' }}>{notif.title}</p>
                      <p style={{ fontSize: '11px', color: '#6B5B4E', lineHeight: '1.4' }}>{notif.message}</p>
                      <p style={{ fontSize: '10px', color: '#6B5B4E', marginTop: '4px' }}>
                        {new Date(notif.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--brand-bg, #FDF3E8)' }}>
        <div style={{ padding: '32px 40px' }}>{children}</div>
      </main>
    </div>
  );
};
