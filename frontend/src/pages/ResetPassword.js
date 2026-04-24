import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setValidating(false); return; }
    axios.get(`${API_URL}/api/auth/validate-reset-token/${token}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('As senhas não coincidem'); return; }
    if (password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '8px',
    border: '1px solid var(--border-color)', fontSize: '16px', outline: 'none',
    color: 'var(--text-primary)', backgroundColor: '#FDFAF6',
    minHeight: '44px', boxSizing: 'border-box',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-logo text-4xl" style={{ color: 'var(--accent-red)' }}>redação com nicolle</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {validating ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Validando link...</p>
            </div>
          ) : !token || !tokenValid ? (
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="font-heading font-bold text-xl mb-2" style={{ color: 'var(--accent-red)' }}>
                Link inválido ou expirado
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Este link de redefinição é inválido ou já foi utilizado. Solicite um novo.
              </p>
              <Link to="/forgot-password"
                className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--accent-red)' }}>
                Solicitar novo link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-heading font-bold text-xl mb-2" style={{ color: 'var(--accent-red)' }}>
                Senha redefinida!
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sua senha foi alterada com sucesso. Redirecionando para o login...
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-heading font-bold text-2xl mb-1" style={{ color: 'var(--accent-red)' }}>
                Nova senha
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Digite sua nova senha abaixo.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Nova senha
                  </label>
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    required minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Confirmar senha
                  </label>
                  <input
                    type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Repita a nova senha"
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', minHeight: '44px',
                    backgroundColor: 'var(--accent-red)', color: 'white',
                    fontWeight: '600', fontSize: '15px', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
