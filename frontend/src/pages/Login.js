import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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

      {/* Painel esquerdo */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#7C1805', position: 'relative', overflow: 'hidden' }}
      >
        {/* Círculos decorativos sutis */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }}
          viewBox="0 0 500 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <circle cx="420" cy="100" r="220" fill="#DAB257" />
          <circle cx="-60" cy="480" r="260" fill="#DAB257" />
          <circle cx="320" cy="760" r="160" fill="#FDF3E8" />
        </svg>

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <h1 className="font-script leading-tight" style={{ fontSize: '52px', color: '#FDF3E8' }}>
            redação
          </h1>
          <h1 className="font-script leading-tight" style={{ fontSize: '52px', color: '#DAB257' }}>
            com nicolle
          </h1>
        </div>

        {/* Citação */}
        <div style={{ position: 'relative' }}>
          <div style={{ width: '32px', height: '2px', backgroundColor: '#DAB257', marginBottom: '16px', borderRadius: '1px' }} />
          <p className="font-heading font-medium leading-relaxed mb-3" style={{ fontSize: '18px', color: 'rgba(253,243,232,0.85)' }}>
            "A escrita é a pintura da voz."
          </p>
          <p className="font-script" style={{ fontSize: '16px', color: '#DAB257' }}>— Voltaire</p>
        </div>

        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '11px', color: 'rgba(253,243,232,0.35)', letterSpacing: '0.04em' }}>
            Plataforma de correção de redações
          </p>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-script text-4xl" style={{ color: '#7C1805' }}>redação</h1>
            <h1 className="font-script text-4xl" style={{ color: '#D66B27' }}>com nicolle</h1>
          </div>

          {/* Barra de acento acima do título */}
          <div style={{ width: '40px', height: '3px', backgroundColor: '#D66B27', borderRadius: '2px', marginBottom: '20px' }} />

          <h2 className="font-heading font-bold" style={{ fontSize: '26px', color: '#7C1805', marginBottom: '4px', letterSpacing: '-0.02em' }}>
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
                placeholder="seu@email.com"
                style={{
                  marginTop: '6px',
                  borderRadius: '10px',
                  border: '1.5px solid #E8DDD0',
                  padding: '11px 14px',
                  fontSize: '14px',
                }}
                className="focus:border-[#7C1805] focus:ring-[#7C1805]"
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
                placeholder="••••••••"
                style={{
                  marginTop: '6px',
                  borderRadius: '10px',
                  border: '1.5px solid #E8DDD0',
                  padding: '11px 14px',
                  fontSize: '14px',
                }}
                className="focus:border-[#7C1805]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-bold"
              disabled={loading}
              data-testid="login-submit-button"
              style={{ borderRadius: '10px', fontSize: '14px' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: '#6B5B4E' }}>
            <Link to="/forgot-password" className="hover:underline font-medium" style={{ color: '#7C1805' }}>
              Esqueci minha senha
            </Link>
          </p>
          <p className="text-center text-sm mt-2" style={{ color: '#6B5B4E' }}>
            Não tem uma conta?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#7C1805' }} data-testid="register-link">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
