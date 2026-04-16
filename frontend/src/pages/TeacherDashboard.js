import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { FileText, Clock, CheckCircle, TrendingUp, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TeacherDashboard = () => {
  const [stats, setStats] = useState({ pending: 0, corrected: 0, total: 0, today: 0, this_week: 0, this_month: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [queueRes, myStatsRes] = await Promise.all([
        axios.get(`${API_URL}/api/essays/queue`, { withCredentials: true }),
        axios.get(`${API_URL}/api/teacher/my-stats`, { withCredentials: true }),
      ]);
      setStats({
        pending: queueRes.data.length,
        corrected: myStatsRes.data.total_corrections || 0,
        today: myStatsRes.data.today || 0,
        this_week: myStatsRes.data.this_week || 0,
        this_month: myStatsRes.data.this_month || 0,
        total: queueRes.data.length + (myStatsRes.data.total_corrections || 0),
      });
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl" style={{ color: '#7C1805' }} data-testid="teacher-dashboard-title">
            Painel do Professor
          </h1>
          <p className="text-lg mt-2 text-slate-600">Gerencie correções e temas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-pending-corrections">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>AGUARDANDO CORREÇÃO</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#F59E0B' }}>{stats.pending}</p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#F59E0B' }}>
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>CORREÇÕES REALIZADAS</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#36555A' }}>{stats.corrected}</p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#36555A' }}>
                <CheckCircle className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>ESTE MÊS</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#7C1805' }}>{stats.this_month}</p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#7C1805' }}>
                <Calendar className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>HOJE</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#D66B27' }}>{stats.today}</p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#D66B27' }}>
                <TrendingUp className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>ESTA SEMANA</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#6B5B4E' }}>{stats.this_week}</p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#6B5B4E' }}>
                <FileText className="text-white" size={24} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8 bg-white border shadow-sm">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>
              Ações Rápidas
            </h2>
            <div className="flex gap-4 flex-wrap">
              <a href="/correction-queue"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="view-queue-button">
                Ver Fila de Correções
              </a>
              <a href="/create-prompt"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors hover:bg-slate-50"
                style={{ borderColor: '#7C1805', color: '#7C1805' }}
                data-testid="create-prompt-button">
                Criar Nova Proposta
              </a>
              <a href="/teacher/report"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors hover:bg-slate-50"
                style={{ borderColor: '#36555A', color: '#36555A' }}>
                Meu Relatório Completo
              </a>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
