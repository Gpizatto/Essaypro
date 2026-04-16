import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};

export const Login = () => {
  const [branding, setBranding] = useState({ platform_name: 'redação com nicolle', welcome_message: '', logo_url: '' });

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/settings/branding/public`)
      .then(r => setBranding(r.data))
      .catch(() => {});
  }, []);
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
    <div className="min-h-screen flex" style={{ backgroundColor: '#FDF3E8' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#7C1805' }}
      >
        <div>
          <h1 className="font-script text-5xl leading-tight" style={{ color: '#FDF3E8' }}>
            redação
          </h1>
          <h1 className="font-script text-5xl leading-tight" style={{ color: '#DAB257' }}>
            com nicolle
          </h1>
        </div>
        <div>
          <p className="text-xl font-heading font-medium leading-relaxed mb-4" style={{ color: 'rgba(253,243,232,0.85)' }}>
            "A escrita é a pintura da voz."
          </p>
          <p className="text-sm font-script" style={{ color: '#DAB257' }}>— Voltaire</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'rgba(253,243,232,0.4)' }}>
            Plataforma de correção de redações
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-script text-4xl" style={{ color: '#7C1805' }}>redação</h1>
            <h1 className="font-script text-4xl" style={{ color: '#D66B27' }}>com nicolle</h1>
          </div>

          <h2 className="font-heading font-bold text-2xl mb-1" style={{ color: '#7C1805' }}>
            Bem-vinda de volta
          </h2>
          <p className="text-sm mb-8" style={{ color: '#6B5B4E' }}>
            Entre com sua conta para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="mt-1 border-[#E8DDD0] focus:border-[#7C1805] focus:ring-[#7C1805]"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="mt-1 border-[#E8DDD0] focus:border-[#7C1805]"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#6B5B4E' }}>
            Não tem uma conta?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#7C1805' }} data-testid="register-link">
              Cadastre-se
            </Link>
          </p>
          <p className="text-center text-sm mt-2" style={{ color: '#6B5B4E' }}>
            <Link to="/forgot-password" className="hover:underline" style={{ color: '#7C1805' }}>
              Esqueci minha senha
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};
