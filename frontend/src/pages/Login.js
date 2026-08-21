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

/* ───────────────────────── Stickers ilustrados (SVG) ─────────────────────────
   Recriações em SVG dos elementos da identidade visual, cada um sobre um
   "papelzinho" branco levemente rotacionado, como colagem num quadro.       */

const Sticker = ({ style, rotate = 0, children, hideOnMobile = true }) => (
  <div
    aria-hidden="true"
    className={hideOnMobile ? 'hidden md:block' : ''}
    style={{
      position: 'absolute',
      backgroundColor: '#FFFFFF',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: '0 6px 18px rgba(60,40,20,0.14), 0 2px 4px rgba(60,40,20,0.08)',
      transform: `rotate(${rotate}deg)`,
      pointerEvents: 'none',
      ...style,
    }}
  >
    {children}
  </div>
);

const PencilArt = () => (
  <svg width="52" height="72" viewBox="0 0 52 72" fill="none">
    <rect x="20" y="8" width="12" height="42" rx="2" transform="rotate(8 26 29)" fill="#C2410C" />
    <rect x="20" y="4" width="12" height="8" rx="2" transform="rotate(8 26 8)" fill="#F59E0B" />
    <path d="M24 52 L33 50 L30 63 Z" fill="#F3D9B1" />
    <path d="M27.5 57 L31 56 L30 63 Z" fill="#7C1805" />
    <path d="M14 18 C10 24 10 32 14 38" stroke="#7C1805" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M40 16 C44 22 44 30 40 36" stroke="#7C1805" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const QuotesArt = () => (
  <svg width="64" height="46" viewBox="0 0 64 46" fill="none">
    <path d="M8 6 C2 12 2 22 8 28 L18 28 C14 22 14 14 20 8 Z" fill="#DAB257" />
    <path d="M36 6 C30 12 30 22 36 28 L46 28 C42 22 42 14 48 8 Z" fill="#DAB257" />
    <path d="M10 34 C20 42 44 42 54 34" stroke="#7C1805" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const OpenBookHandArt = () => (
  <svg width="86" height="76" viewBox="0 0 86 76" fill="none">
    {/* mão levantada */}
    <path d="M46 30 L46 12 M42 14 L42 26 M50 14 L50 26 M54 18 L54 28" stroke="#7C1805" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="48" cy="30" rx="8" ry="6" fill="#7C1805" />
    {/* livro aberto */}
    <path d="M8 44 C22 34 38 36 43 42 L43 68 C38 62 22 60 8 68 Z" fill="#C9B6E4" stroke="#7C1805" strokeWidth="2" />
    <path d="M78 44 C64 34 48 36 43 42 L43 68 C48 62 64 60 78 68 Z" fill="#E5DCF2" stroke="#7C1805" strokeWidth="2" />
    <path d="M16 48 C24 44 32 45 38 48 M16 54 C24 50 32 51 38 54 M48 48 C56 44 64 45 70 48 M48 54 C56 50 64 51 70 54" stroke="#7C1805" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

const BookArt = () => (
  <svg width="72" height="60" viewBox="0 0 72 60" fill="none">
    <path d="M6 16 C18 8 32 10 36 15 L36 50 C32 45 18 43 6 50 Z" fill="#F59E0B" stroke="#7C1805" strokeWidth="2" />
    <path d="M66 16 C54 8 40 10 36 15 L36 50 C40 45 54 43 66 50 Z" fill="#FBBF24" stroke="#7C1805" strokeWidth="2" />
    <path d="M12 20 C19 17 27 18 32 20 M12 27 C19 24 27 25 32 27 M12 34 C19 31 27 32 32 34 M40 20 C47 17 55 18 60 20 M40 27 C47 24 55 25 60 27" stroke="#7C1805" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

const HandArt = () => (
  <svg width="64" height="58" viewBox="0 0 64 58" fill="none">
    <path d="M8 34 C8 26 14 22 20 24 L20 14 C20 10 26 10 26 14 L26 22 L28 8 C29 4 35 5 34 9 L33 22 L37 12 C38.5 8.5 44 10 43 14 L40 26 L46 20 C49 17 53 21 50 24 L40 38 C36 46 26 50 18 46 C12 43 8 39 8 34 Z" fill="#FDF3E8" stroke="#7C1805" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
);

const ChairArt = () => (
  <svg width="52" height="66" viewBox="0 0 52 66" fill="none">
    <path d="M14 6 L14 34 M14 12 C24 8 34 8 40 12 L40 34" stroke="#3B6FA0" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M10 34 L44 34 M14 34 L12 60 M40 34 L44 60 M18 34 L20 60 M36 34 L34 60" stroke="#3B6FA0" strokeWidth="3" strokeLinecap="round" />
    <rect x="12" y="30" width="30" height="6" rx="2" fill="#8FB4D9" stroke="#3B6FA0" strokeWidth="2" />
  </svg>
);

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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#EFE9DD', position: 'relative', overflow: 'hidden' }}
    >
      {/* Moldura de manchas — blobs suaves nas bordas do quadro */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <ellipse cx="80" cy="60" rx="180" ry="120" fill="#E4DBC8" opacity="0.6" />
        <ellipse cx="1140" cy="90" rx="200" ry="130" fill="#E7DECD" opacity="0.55" />
        <ellipse cx="60" cy="740" rx="190" ry="140" fill="#E7DECD" opacity="0.5" />
        <ellipse cx="1150" cy="730" rx="210" ry="150" fill="#E4DBC8" opacity="0.6" />
        <ellipse cx="600" cy="-40" rx="320" ry="90" fill="#EAE2D2" opacity="0.5" />
        <ellipse cx="600" cy="840" rx="340" ry="100" fill="#EAE2D2" opacity="0.5" />
      </svg>

      {/* Stickers colados no quadro */}
      <Sticker rotate={-8} style={{ top: '10%', left: '12%' }}><PencilArt /></Sticker>
      <Sticker rotate={5} style={{ top: '26%', left: '20%' }}><QuotesArt /></Sticker>
      <Sticker rotate={7} style={{ top: '9%', right: '13%' }}><OpenBookHandArt /></Sticker>
      <Sticker rotate={-5} style={{ bottom: '18%', right: '11%' }}><BookArt /></Sticker>
      <Sticker rotate={-10} style={{ bottom: '12%', left: '16%' }}><HandArt /></Sticker>
      <Sticker rotate={6} style={{ bottom: '30%', right: '22%' }}><ChairArt /></Sticker>

      {/* Coluna central */}
      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 2 }}>

        {/* Título manuscrito */}
        <div className="text-center mb-5">
          <h1 className="font-script leading-tight" style={{ fontSize: 'clamp(34px, 6vw, 44px)', color: '#3E2A1E' }}>
            {branding.platform_name?.includes('nicolle') ? (
              <>
                redação<br />com nicolle
              </>
            ) : (
              branding.platform_name
            )}
          </h1>
        </div>

        {/* Card branco */}
        <div style={{ position: 'relative' }}>
          {/* Etiqueta amarela com a citação */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-16px',
              right: '-10px',
              backgroundColor: '#DAB257',
              color: '#3E2A1E',
              padding: '6px 14px',
              borderRadius: '3px',
              transform: 'rotate(4deg)',
              boxShadow: '0 3px 10px rgba(60,40,20,0.22)',
              zIndex: 3,
            }}
          >
            <span className="font-script" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
              construindo pensamentos
            </span>
          </div>

          <div
            className="p-7 sm:p-9"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              boxShadow: '0 18px 44px rgba(60,40,20,0.16), 0 4px 10px rgba(60,40,20,0.08)',
            }}
          >
            <h2 className="font-heading font-bold" style={{ fontSize: '24px', color: '#3E2A1E', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Bem-vindo de volta!
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '26px' }}>
              {branding.welcome_message || 'Entre com sua conta para continuar corrigindo redações incríveis'} <span aria-hidden="true">✎</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Email</Label>
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
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: '#FBF7F0',
                    padding: '11px 14px',
                    fontSize: '14px',
                    minHeight: '44px',
                  }}
                  className="focus:border-[var(--accent-red)] focus:ring-[var(--accent-red)]"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Senha</Label>
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
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: '#FBF7F0',
                    padding: '11px 14px',
                    fontSize: '14px',
                    minHeight: '44px',
                  }}
                  className="focus:border-[var(--accent-red)]"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold"
                disabled={loading}
                data-testid="login-submit-button"
                style={{
                  borderRadius: '10px',
                  fontSize: '15px',
                  minHeight: '46px',
                  backgroundColor: 'var(--accent-red)',
                  color: '#FFFFFF',
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm">
              <Link to="/forgot-password" className="hover:underline font-medium" style={{ color: '#6B5B4E' }}>
                Esqueci minha senha
              </Link>
            </p>
            <p className="text-center text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Não tem uma conta?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: 'var(--accent-red)' }} data-testid="register-link">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
