import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { CheckCircle2, Clock, Calendar, Star, TrendingUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <Card className="p-6 bg-white border shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B5B4E' }}>{label}</p>
        <p className="text-4xl font-bold mt-2" style={{ color }}>{value}</p>
        {sub && <p className="text-xs mt-2" style={{ color: '#6B5B4E' }}>{sub}</p>}
      </div>
      <div className="p-3 rounded-xl" style={{ backgroundColor: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
    </div>
  </Card>
);

export const TeacherReport = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/teacher/my-stats`, { withCredentials: true })
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (hours) => {
    if (!hours) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} h`;
    return `${(hours / 24).toFixed(1)} dias`;
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-muted rounded" />)}
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
            Meu Relatório
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            Resumo das suas correções
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Corrigidas"
            value={stats?.total_corrections ?? 0}
            icon={CheckCircle2}
            color="#36555A"
          />
          <StatCard
            label="Tempo Médio"
            value={formatTime(stats?.avg_hours)}
            sub="por correção"
            icon={Clock}
            color="#D66B27"
          />
          <StatCard
            label="Hoje"
            value={stats?.today ?? 0}
            icon={Star}
            color="#7C1805"
          />
          <StatCard
            label="Esta Semana"
            value={stats?.this_week ?? 0}
            icon={Calendar}
            color="#DAB257"
          />
          <StatCard
            label="Este Mês"
            value={stats?.this_month ?? 0}
            icon={TrendingUp}
            color="#4A7C59"
          />
        </div>

        {stats?.total_corrections === 0 && (
          <Card className="p-8 bg-white border text-center">
            <p className="text-3xl mb-2">✏️</p>
            <p className="font-semibold" style={{ color: '#7C1805' }}>Nenhuma correção ainda</p>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              Seu relatório será preenchido conforme você realiza correções.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};
