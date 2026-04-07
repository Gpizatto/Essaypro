import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { FileText, Clock, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TeacherDashboard = () => {
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/essays/queue`, { withCredentials: true });
      setStats({ pending: data.length, total: data.length });
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
            {[1, 2, 3].map((i) => (
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
          <h1 className="font-heading font-bold text-3xl md:text-4xl" style={{ color: '#7C1805' }} data-testid="teacher-dashboard-title">
            Painel do Professor
          </h1>
          <p className="text-lg mt-2 text-slate-600">Gerencie correções e temas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-pending-corrections">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  REDAÇÕES PENDENTES
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#F59E0B' }}>
                  {stats.pending}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#F59E0B' }}>
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  TOTAL DE REDAÇÕES
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#7C1805' }}>
                  {stats.total}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#7C1805' }}>
                <FileText className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  CORREÇÕES REALIZADAS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#36555A' }}>
                  0
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#36555A' }}>
                <CheckCircle className="text-white" size={24} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8 bg-white border shadow-sm">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>
              Ações Rápidas
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Visualize as redações aguardando correção ou crie novos temas para os alunos praticarem.
            </p>
            <div className="flex gap-4">
              <a
                href="/correction-queue"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="view-queue-button"
              >
                Ver Fila de Correções
              </a>
              <a
                href="/create-prompt"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors hover:bg-slate-50"
                style={{ borderColor: '#7C1805', color: '#7C1805' }}
                data-testid="create-prompt-button"
              >
                Criar Novo Tema
              </a>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
