import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Users, FileText, CheckCircle, Award, Zap, Save } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creditConfig, setCreditConfig] = useState({ mode: 'unlimited', limit: 4 });
  const [savingCredits, setSavingCredits] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCreditConfig();
  }, []);

  const fetchCreditConfig = async () => {
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/credits/config`, { withCredentials: true });
      setCreditConfig(data);
    } catch (error) {
      console.error('Error fetching credit config:', error);
    }
  };

  const saveCreditConfig = async () => {
    setSavingCredits(true);
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/credits/config`, creditConfig, { withCredentials: true });
      alert('Configuração salva com sucesso!');
    } catch (error) {
      alert('Erro ao salvar configuração');
    } finally {
      setSavingCredits(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/stats`, { withCredentials: true });
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl" style={{ color: '#7C1805' }} data-testid="admin-dashboard-title">
            Painel Administrativo
          </h1>
          <p className="text-lg mt-2 text-slate-600">Visão geral da plataforma</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-total-users">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  TOTAL DE USUÁRIOS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#7C1805' }}>
                  {stats?.total_users || 0}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#7C1805' }}>
                <Users className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-total-essays">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  REDAÇÕES ENVIADAS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#36555A' }}>
                  {stats?.total_essays || 0}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#36555A' }}>
                <FileText className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-total-corrections">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  CORREÇÕES FEITAS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#36555A' }}>
                  {stats?.total_corrections || 0}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#36555A' }}>
                <CheckCircle className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-average-score">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  MÉDIA DE PONTOS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#3B82F6' }}>
                  {Math.round(stats?.average_score || 0)}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#3B82F6' }}>
                <Award className="text-white" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* CONFIGURAÇÃO DE CRÉDITOS */}
        <Card className="p-6 bg-white border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} style={{ color: '#7C1805' }} />
            <h2 className="font-heading font-bold text-xl" style={{ color: '#7C1805' }}>
              Créditos de Envio
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: '#6B5B4E' }}>
            Configure quantas redações cada aluno pode enviar por período.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#2C1A0E' }}>Modo</label>
              <select
                value={creditConfig.mode}
                onChange={e => setCreditConfig({ ...creditConfig, mode: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '14px', color: '#2C1A0E', backgroundColor: '#FFF' }}
              >
                <option value="unlimited">Ilimitado</option>
                <option value="monthly">Limite por mês</option>
                <option value="weekly">Limite por semana</option>
              </select>
            </div>
            {creditConfig.mode !== 'unlimited' && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: '#2C1A0E' }}>
                  Quantidade {creditConfig.mode === 'monthly' ? 'por mês' : 'por semana'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={creditConfig.limit}
                  onChange={e => setCreditConfig({ ...creditConfig, limit: parseInt(e.target.value) || 1 })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '14px', width: '80px', color: '#2C1A0E' }}
                />
              </div>
            )}
            <Button onClick={saveCreditConfig} disabled={savingCredits} size="sm">
              <Save size={14} className="mr-1" />
              {savingCredits ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>

        <Card className="p-8 bg-white border shadow-sm">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>
              Gerenciamento
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Acesse o gerenciamento de usuários e estatísticas detalhadas da plataforma.
            </p>
            <div className="flex gap-4">
              <a
                href="/admin/users"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="manage-users-button"
              >
                Gerenciar Usuários
              </a>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
