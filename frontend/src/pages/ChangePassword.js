import React, { useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ChangePassword = () => {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.current_password) return 'Informe sua senha atual';
    if (!form.new_password) return 'Informe a nova senha';
    if (form.new_password.length < 6) return 'A nova senha deve ter pelo menos 6 caracteres';
    if (form.new_password !== form.confirm_password) return 'As senhas não coincidem';
    if (form.current_password === form.new_password) return 'A nova senha deve ser diferente da atual';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) { toast.error(error); return; }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/auth/change-password`,
        { current_password: form.current_password, new_password: form.new_password },
        { withCredentials: true }
      );
      setSuccess(true);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.new_password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Fraca', color: '#EF4444', width: '25%' };
    if (score === 2) return { label: 'Razoável', color: '#F59E0B', width: '50%' };
    if (score === 3) return { label: 'Boa', color: '#3B82F6', width: '75%' };
    return { label: 'Forte', color: 'var(--accent-green)', width: '100%' };
  })();

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="font-heading font-bold" style={{ color: 'var(--accent-red)', fontSize: 'clamp(22px, 5vw, 28px)' }}>
            Alterar Senha
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Escolha uma senha segura e não a compartilhe com ninguém.
          </p>
        </div>

        <Card className="p-6 bg-white border shadow-sm">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 size={48} className="mx-auto" style={{ color: 'var(--accent-green)' }} />
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Senha alterada!</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sua senha foi atualizada com sucesso.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSuccess(false)}>
                Alterar novamente
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound size={18} style={{ color: 'var(--accent-red)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--accent-red)' }}>
                  Trocar senha
                </span>
              </div>

              {/* Senha atual */}
              <div className="space-y-1.5">
                <Label htmlFor="current_password">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    name="current_password"
                    type={showCurrent ? 'text' : 'password'}
                    value={form.current_password}
                    onChange={handleChange}
                    placeholder="Digite sua senha atual"
                    autoComplete="current-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div className="space-y-1.5">
                <Label htmlFor="new_password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    name="new_password"
                    type={showNew ? 'text' : 'password'}
                    value={form.new_password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Barra de força */}
                {strength && (
                  <div className="mt-1.5">
                    <div style={{ height: '4px', backgroundColor: '#E5E7EB', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: strength.width, backgroundColor: strength.color, borderRadius: '99px', transition: 'width 0.3s, background-color 0.3s' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: strength.color, fontWeight: 600, marginTop: '3px' }}>
                      Força: {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar nova senha */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={handleChange}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirm_password && form.new_password !== form.confirm_password && (
                  <p style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px' }}>As senhas não coincidem</p>
                )}
                {form.confirm_password && form.new_password === form.confirm_password && form.new_password && (
                  <p style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '3px' }}>✓ Senhas coincidem</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Alterando...' : 'Alterar senha'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </Layout>
  );
};
