import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const formatApiErrorDetail = (detail) => {
  if (detail == null) return 'Algo deu errado. Tente novamente.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password, role, phone);
      toast.success('Cadastro realizado! Aguarde a aprovação do administrador.');
      navigate('/login');
    } catch (error) {
      const errorMsg = formatApiErrorDetail(error.response?.data?.detail) || error.message;
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    marginTop: '6px',
    borderRadius: '10px',
    border: '1.5px solid #E8DDD0',
    padding: '11px 14px',
    fontSize: '14px',
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FDF3E8' }}>

      {/* Painel esquerdo — idêntico ao Login */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12"
        style={{ backgroundColor: '#7C1805', position: 'relative', overflow: 'hidden' }}
      >
        {/* Círculos decorativos */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }}
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <circle cx="340" cy="80" r="180" fill="#DAB257" />
          <circle cx="-40" cy="460" r="220" fill="#DAB257" />
          <circle cx="260" cy="740" r="140" fill="#FDF3E8" />
        </svg>

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <h1 className="font-script leading-tight" style={{ fontSize: '48px', color: '#FDF3E8' }}>
            redação
          </h1>
          <h1 className="font-script leading-tight" style={{ fontSize: '48px', color: '#DAB257' }}>
            com nicolle
          </h1>
        </div>

        {/* Mensagem de boas-vindas */}
        <div style={{ position: 'relative' }}>
          <div style={{ width: '32px', height: '2px', backgroundColor: '#DAB257', marginBottom: '16px', borderRadius: '1px' }} />
          <p className="font-heading font-medium leading-relaxed mb-2" style={{ fontSize: '18px', color: 'rgba(253,243,232,0.85)' }}>
            Comece sua jornada
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(253,243,232,0.6)', lineHeight: 1.6 }}>
            Crie sua conta e receba correções personalizadas para evoluir na redação do ENEM.
          </p>
        </div>

        <p style={{ position: 'relative', fontSize: '11px', color: 'rgba(253,243,232,0.35)', letterSpacing: '0.04em' }}>
          Plataforma de correção de redações
        </p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-script text-4xl" style={{ color: '#7C1805' }}>redação</h1>
            <h1 className="font-script text-4xl" style={{ color: '#D66B27' }}>com nicolle</h1>
          </div>

          {/* Barra de acento */}
          <div style={{ width: '40px', height: '3px', backgroundColor: '#D66B27', borderRadius: '2px', marginBottom: '20px' }} />

          <h2
            className="font-heading font-bold"
            style={{ fontSize: '26px', color: '#7C1805', marginBottom: '4px', letterSpacing: '-0.02em' }}
          >
            Criar conta
          </h2>
          <p className="text-sm mb-8" style={{ color: '#6B5B4E' }}>
            Preencha os dados abaixo para se cadastrar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">

            <div>
              <Label htmlFor="name" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="name-input"
                placeholder="Seu nome completo"
                style={inputStyle}
                className="focus:border-[#7C1805] focus:ring-[#7C1805]"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                placeholder="seu@email.com"
                style={inputStyle}
                className="focus:border-[#7C1805] focus:ring-[#7C1805]"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>
                WhatsApp <span style={{ fontWeight: 400, color: '#6B5B4E' }}>(opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                style={inputStyle}
              />
              <p style={{ fontSize: '11.5px', color: '#6B5B4E', marginTop: '4px' }}>
                Para receber aviso quando sua correção ficar pronta
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
                className="focus:border-[#7C1805]"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>
                Tipo de Conta
              </Label>
              <div style={{ marginTop: '6px' }}>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger
                    data-testid="role-select"
                    style={{ borderRadius: '10px', border: '1.5px solid #E8DDD0', height: '44px', fontSize: '14px' }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="teacher">Professor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-bold"
              disabled={loading}
              data-testid="register-submit-button"
              style={{ borderRadius: '10px', height: '44px', fontSize: '14px', backgroundColor: '#7C1805', marginTop: '8px' }}
            >
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#6B5B4E' }}>
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="font-semibold hover:underline"
              style={{ color: '#7C1805' }}
              data-testid="login-link"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
