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
      toast.success('Logout realizado com sucesso');
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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F9F8F6' }}>
      <aside className="w-64 border-r flex flex-col" style={{ backgroundColor: '#F9F8F6', borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <h1 className="font-heading font-black text-2xl" style={{ color: '#002147' }} data-testid="app-logo">
            EssayPro
          </h1>
          <p className="text-sm mt-1" style={{ color: '#525252' }}>
            Correção ENEM
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-700 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: '#002147' }}>
              {user.name}
            </p>
            <p className="text-xs" style={{ color: '#525252' }}>
              {user.email}
            </p>
            <span className="inline-block mt-2 px-2 py-1 text-xs rounded" style={{ backgroundColor: '#6B21A8', color: '#fff' }}>
              {user.role === 'student' ? 'Aluno' : user.role === 'teacher' ? 'Professor' : 'Admin'}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2"
            data-testid="logout-button"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 lg:p-12">{children}</div>
      </main>
    </div>
  );
};