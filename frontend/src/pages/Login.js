import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const formatApiErrorDetail = (detail) => {
  if (detail == null) return 'Algo deu errado. Tente novamente.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = formatApiErrorDetail(error.response?.data?.detail) || error.message;
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1770009971150-f50bc7d373a4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGFyY2hpdGVjdHVyZSUyMG1pbmltYWxpc3QlMjBjbGVhbnxlbnwwfHx8fDE3NzUyNTgzNDl8MA&ixlib=rb-4.1.0&q=85)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 33, 71, 0.7)' }}></div>
      <Card className="relative z-10 w-full max-w-md p-8 shadow-lg bg-white" data-testid="login-card">
        <div className="text-center mb-8">
          <h1 className="font-heading font-black text-4xl mb-2" style={{ color: '#002147' }}>
            EssayPro
          </h1>
          <p className="text-slate-600">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="email-input"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="password-input"
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="login-submit-button"
            style={{ backgroundColor: '#002147' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-600">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#6B21A8' }} data-testid="register-link">
              Cadastre-se
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 rounded-md" style={{ backgroundColor: '#F9F8F6' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#525252' }}>
            Contas de Teste:
          </p>
          <p className="text-xs text-slate-600">Aluno: student@test.com / test123</p>
          <p className="text-xs text-slate-600">Professor: prof@test.com / test123</p>
          <p className="text-xs text-slate-600">Admin: admin@essaypro.com / admin123</p>
        </div>
      </Card>
    </div>
  );
};