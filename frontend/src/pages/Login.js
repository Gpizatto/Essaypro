import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

const formatApiError = (detail) => {
  if (detail == null) return null;
  if (typeof detail === 'string') {
    // U-06: mensagens específicas e amigáveis
    const d = detail.toLowerCase();
    if (d.includes('not found') || d.includes('não encontrado') || d.includes('user not found'))
      return 'E-mail não encontrado. Verifique o endereço digitado.';
    if (d.includes('incorrect') || d.includes('invalid') || d.includes('senha') || d.includes('wrong password') || d.includes('password'))
      return 'Senha incorreta. Verifique e tente novamente.';
    if (d.includes('inactive') || d.includes('inativo') || d.includes('not active'))
      return 'Sua conta está inativa. Entre em contato com o administrador.';
    if (d.includes('pending') || d.includes('aprovação') || d.includes('not approved'))
      return 'Sua conta ainda está aguardando aprovação do administrador.';
    return detail;
  }
  if (Array.isArray(detail))
    return detail.map(e => e?.msg || JSON.stringify(e)).filter(Boolean).join(' ');
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
  const [errorMsg, setErrorMsg] = useState('');   // U-06: erro inline
  const [successMsg, setSuccessMsg] = useState(''); // U-06: boas-vindas
  const { login } = useAuth();
  const navigate = useNavigate();

  // Limpar erro ao digitar
  const handleEmailChange = (e) => { setEmail(e.target.value); setErrorMsg(''); };
  const handlePasswordChange = (e) => { setPassword(e.target.value); setErrorMsg(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Preencha o e-mail e a senha para continuar.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const user = await login(email, password);
      // U-06: mensagem de boas-vindas personalizada antes do redirect
      const name = user?.name?.split(' ')[0] || '';
      setSuccessMsg(`Bem-vinda${name ? `, ${name}` : ''}! Redirecionando...`);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (error) {
      const msg = formatApiError(error.response?.data?.detail)
        || error.message
        || 'Não foi possível fazer login. Tente novamente.';
      setErrorMsg(msg);
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
          {branding.logo_url ? (
            <img src={branding.logo_url} alt="Logo" className="h-12 object-contain mb-2" />
          ) : (
            <>
              <h1 className="font-script text-5xl leading-tight" style={{ color: '#FDF3E8' }}>redação</h1>
              <h1 className="font-script text-5xl leading-tight" style={{ color: '#DAB257' }}>com nicolle</h1>
            </>
          )}
          {branding.welcome_message && (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(253,243,232,0.8)' }}>
              {branding.welcome_message}
            </p>
          )}
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

          {/* U-06: banner de sucesso */}
          {successMsg && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-4"
              style={{ backgroundColor: '#F0FDF4', border: '1px solid #16A34A', color: '#16A34A' }}
              role="status"
            >
              <span>✓</span> {successMsg}
            </div>
          )}

          {/* U-06: banner de erro inline */}
          {errorMsg && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm mb-4"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #DC2626', color: '#7C1805' }}
              role="alert"
            >
              <span className="mt-0.5">⚠</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={loading || !!successMsg}
                data-testid="email-input"
                className="mt-1 border-[#E8DDD0] focus:border-[#7C1805] focus:ring-[#7C1805]"
                placeholder="seu@email.com"
                aria-describedby={errorMsg ? 'login-error' : undefined}
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
                disabled={loading || !!successMsg}
                data-testid="password-input"
                className="mt-1 border-[#E8DDD0] focus:border-[#7C1805]"
                placeholder="••••••••"
              />
            </div>

            {/* U-06: botão com spinner */}
            <Button
              type="submit"
              className="w-full h-11 text-base flex items-center justify-center gap-2"
              disabled={loading || !!successMsg}
              data-testid="login-submit-button"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </>
              ) : successMsg ? (
                '✓ Logado!'
              ) : (
                'Entrar'
              )}
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
