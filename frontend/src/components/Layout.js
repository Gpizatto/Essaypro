import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Home, FileText, Users, LogOut, PenTool, BookOpen, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        { path: '/create-prompt', icon: BookOpen, label: 'Criar Tema' },
      ];
    } else if (user.role === 'admin') {
      return [
        { path: '/dashboard', icon: Home, label: 'Início' },
        { path: '/admin/users', icon: Users, label: 'Usuários' },
        { path: '/admin/stats', icon: BarChart3, label: 'Estatísticas' },
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
