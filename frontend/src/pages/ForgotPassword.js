import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FDF3E8' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-logo text-4xl" style={{ color: '#7C1805' }}>redação com nicolle</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="font-heading font-bold text-xl mb-2" style={{ color: '#7C1805' }}>Email enviado!</h2>
              <p className="text-sm mb-6" style={{ color: '#6B5B4E' }}>
                Se este email estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
                Verifique também sua caixa de spam.
              </p>
              <Link to="/login"
                className="text-sm font-semibold hover:underline"
                style={{ color: '#7C1805' }}>
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading font-bold text-2xl mb-1" style={{ color: '#7C1805' }}>
                Esqueceu sua senha?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#6B5B4E' }}>
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#2C1A0E' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #E8DDD0', fontSize: '14px', outline: 'none',
                      color: '#2C1A0E', backgroundColor: '#FDFAF6'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '8px',
                    backgroundColor: '#7C1805', color: 'white',
                    fontWeight: '600', fontSize: '15px', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>

              <p className="text-center text-sm mt-5" style={{ color: '#6B5B4E' }}>
                Lembrou a senha?{' '}
                <Link to="/login" className="font-semibold hover:underline" style={{ color: '#7C1805' }}>
                  Fazer login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
