import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { FileText, Clock, CheckCircle, Award } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (score >= 800) return '#36555A';
  if (score >= 600) return '#3B82F6';
  if (score >= 400) return '#F59E0B';
  return '#EF4444';
};

export const StudentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/stats/student`, { withCredentials: true });
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
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl" style={{ color: '#7C1805' }} data-testid="dashboard-title">
            Bem-vinda ao RcN
          </h1>
          <p className="text-lg mt-2 text-slate-600">Acompanhe seu progresso e continue praticando</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-total-essays">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  REDAÇÕES ENVIADAS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#7C1805' }}>
                  {stats?.total_essays || 0}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#7C1805' }}>
                <FileText className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-pending">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  AGUARDANDO CORREÇÃO
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#F59E0B' }}>
                  {stats?.pending_corrections || 0}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#F59E0B' }}>
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-average-score">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  MÉDIA DE PONTOS
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: getScoreColor(stats?.average_score || 0) }}>
                  {Math.round(stats?.average_score || 0)}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#3B82F6' }}>
                <CheckCircle className="text-white" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border shadow-sm" data-testid="stat-best-score">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                  MELHOR NOTA
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#36555A' }}>
                  {stats?.best_score || 0}
                </p>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: '#36555A' }}>
                <Award className="text-white" size={24} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8 bg-white border shadow-sm">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>
              Continue Praticando
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              A prática constante é essencial para alcançar uma boa pontuação no ENEM. 
              Navegue pelos temas disponíveis e continue escrevendo redações para receber feedback personalizado dos nossos professores.
            </p>
            <div className="flex gap-4">
              <a
                href="/prompts"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="view-themes-button"
              >
                Ver Temas Disponíveis
              </a>
              <a
                href="/my-essays"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors hover:bg-slate-50"
                style={{ borderColor: '#7C1805', color: '#7C1805' }}
                data-testid="my-essays-button"
              >
                Minhas Redações
              </a>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
