import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Home, FileText, Users, LogOut, PenTool, BookOpen, BarChart3, Settings, Bell, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // poll a cada 60s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/notifications`, { withCredentials: true });
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (e) { /* silencioso */ }
  };

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_URL}/api/notifications/read-all`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
        { path: '/my-essays', icon: FileText, label: 'Minhas Redações' },
      ];
    } else if (user.role === 'teacher') {
      return [
        { path: '/dashboard', icon: Home, label: 'Início' },
        { path: '/correction-queue', icon: PenTool, label: 'Correções' },
        { path: '/teacher/students', icon: Users, label: 'Alunos' },
        { path: '/manage-prompts', icon: BookOpen, label: 'Propostas' },
        { path: '/teacher/report', icon: BarChart3, label: 'Meu Relatório' },
      ];
    } else if (user.role === 'admin') {
      return [
        { path: '/dashboard', icon: Home, label: 'Início' },
        { path: '/manage-prompts', icon: BookOpen, label: 'Propostas' },
        { path: '/admin/users', icon: Users, label: 'Usuários' },
        { path: '/settings', icon: Settings, label: 'Configurações' },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();
  const roleLabel = user.role === 'student' ? 'Aluno' : user.role === 'teacher' ? 'Professor' : 'Admin';
  const roleColor = user.role === 'student' ? '#36555A' : user.role === 'teacher' ? '#D66B27' : '#7C1805';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FDF3E8' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col" style={{ backgroundColor: '#7C1805' }}>
        {/* Logo */}
        <div className="p-6 pb-4">
          <h1 className="font-script text-3xl leading-tight" style={{ color: '#FDF3E8' }} data-testid="app-logo">
            redação
          </h1>
          <h1 className="font-script text-3xl leading-tight" style={{ color: '#DAB257' }}>
            com nicolle
          </h1>
          <p className="text-xs mt-2 font-body" style={{ color: 'rgba(253,243,232,0.6)' }}>
            Plataforma de Correção
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'rgba(253,243,232,0.15)', margin: '0 24px' }} />

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                style={{
                  backgroundColor: isActive ? 'rgba(253,243,232,0.15)' : 'transparent',
                  color: isActive ? '#FDF3E8' : 'rgba(253,243,232,0.7)',
                  borderLeft: isActive ? '3px solid #DAB257' : '3px solid transparent',
                }}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(253,243,232,0.15)' }}>
          <div className="mb-3">
            <p className="text-sm font-semibold truncate" style={{ color: '#FDF3E8' }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgba(253,243,232,0.6)' }}>
              {user.email}
            </p>
            <span
              className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full"
              style={{ backgroundColor: roleColor, color: '#FDF3E8' }}
            >
              {roleLabel}
            </span>
          </div>
          {/* Modo escuro */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md mb-1"
            style={{ color: 'rgba(253,243,232,0.7)', backgroundColor: 'transparent' }}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          {/* Notificações */}
          <div ref={notifRef} style={{ position: 'relative', marginBottom: '8px' }}>
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md"
              style={{ color: 'rgba(253,243,232,0.7)', backgroundColor: showNotifs ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <div style={{ position: 'relative' }}>
                <Bell size={16} />
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    backgroundColor: '#D66B27', color: '#FFF',
                    borderRadius: '50%', width: '16px', height: '16px',
                    fontSize: '10px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span>Notificações</span>
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute', bottom: '40px', left: 0, right: 0,
                backgroundColor: '#FFF', borderRadius: '10px', zIndex: 100,
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                maxHeight: '320px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
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

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full flex items-center gap-2 text-sm"
            style={{ color: 'rgba(253,243,232,0.7)', hover: 'bg-white/10' }}
            data-testid="logout-button"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FDF3E8' }}>
        <div className="p-6 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
};
