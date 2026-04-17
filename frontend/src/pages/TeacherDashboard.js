import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { FileText, Clock, CheckCircle, TrendingUp, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    // Busca independente — uma falha não cancela a outra
    const [queueRes, statsRes] = await Promise.allSettled([
      axios.get(`${API_URL}/api/essays/queue`, { withCredentials: true }),
      axios.get(`${API_URL}/api/teacher/my-stats`, { withCredentials: true }),
    ]);

    let hasError = false;

    if (queueRes.status === 'fulfilled') {
      setPending(queueRes.value.data.length);
    } else {
      console.error('Queue error:', queueRes.reason);
      setPending(0);
      hasError = true;
    }

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data);
    } else {
      console.error('Stats error:', statsRes.reason);
      setStats({ total_corrections: 0, today: 0, this_week: 0, this_month: 0 });
      hasError = true;
    }

    if (hasError) {
      setError('Não foi possível carregar alguns dados. Verifique sua conexão.');
    }

    setLoading(false);
  };

  const StatCard = ({ label, value, icon: Icon, color, loading }) => (
    <Card className="p-6 bg-white border shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#525252' }}>{label}</p>
          {loading
            ? <div className="h-8 w-16 bg-muted rounded animate-pulse mt-2" />
            : <p className="text-3xl font-bold mt-2" style={{ color }}>{value ?? 0}</p>
          }
        </div>
        <div className="p-3 rounded-md" style={{ backgroundColor: color }}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-3xl md:text-4xl" style={{ color: '#7C1805' }}
              data-testid="teacher-dashboard-title">
              Painel do Professor
            </h1>
            <p className="text-lg mt-2 text-slate-600">Gerencie correções e temas</p>
          </div>
          <button onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border"
            style={{ borderColor: '#E8DDD0', color: '#6B5B4E' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#FEF2F2', color: '#7C1805', border: '1px solid #FCA5A5' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="AGUARDANDO CORREÇÃO" value={pending} icon={Clock} color="#F59E0B" loading={loading} />
          <StatCard label="CORREÇÕES REALIZADAS" value={stats?.total_corrections} icon={CheckCircle} color="#36555A" loading={loading} />
          <StatCard label="ESTE MÊS" value={stats?.this_month} icon={Calendar} color="#7C1805" loading={loading} />
          <StatCard label="HOJE" value={stats?.today} icon={TrendingUp} color="#D66B27" loading={loading} />
          <StatCard label="ESTA SEMANA" value={stats?.this_week} icon={FileText} color="#6B5B4E" loading={loading} />
        </div>

        <Card className="p-8 bg-white border shadow-sm">
          <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>Ações Rápidas</h2>
          <div className="flex gap-4 flex-wrap">
            <a href="/correction-queue"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#7C1805' }} data-testid="view-queue-button">
              Ver Fila de Correções {pending > 0 && `(${pending})`}
            </a>
            <a href="/create-prompt"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors hover:bg-slate-50"
              style={{ borderColor: '#7C1805', color: '#7C1805' }} data-testid="create-prompt-button">
              Criar Nova Proposta
            </a>
            <a href="/teacher/report"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors hover:bg-slate-50"
              style={{ borderColor: '#36555A', color: '#36555A' }}>
              Meu Relatório Completo
            </a>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
