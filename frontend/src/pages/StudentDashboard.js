import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { FileText, Clock, CheckCircle, Award, Zap, RefreshCw, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (score >= 800) return '#36555A';
  if (score >= 600) return '#3B82F6';
  if (score >= 400) return '#F59E0B';
  return '#EF4444';
};

export const StudentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const [pendingEssays, setPendingEssays] = useState([]);

  const fetchAll = async () => {
    try {
      const [statsRes, creditsRes, essaysRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/stats/student`, { withCredentials: true }),
        axios.get(`${API_URL}/api/credits/me`, { withCredentials: true }),
        axios.get(`${API_URL}/api/essays/my`, { withCredentials: true }),
        axios.get(`${API_URL}/api/settings/course`, { withCredentials: true }).catch(() => ({ data: {} })),
      ]);
      setStats(statsRes.data);
      setCredits(creditsRes.data);
      // Usar prazo configurado pelo admin (padrão 5 dias)
      const deadlineDays = settingsRes.data?.correction_deadline_days > 0
        ? settingsRes.data.correction_deadline_days
        : 5;
      const pending = (essaysRes.data || []).filter(e => {
        if (e.status !== 'pending') return false;
        const days = (Date.now() - new Date(e.submitted_at).getTime()) / (1000 * 60 * 60 * 24);
        return days >= deadlineDays;
      });
      setPendingEssays(pending);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCreditColor = () => {
    if (!credits || credits.mode === 'unlimited') return '#36555A';
    if (credits.remaining === 0) return '#7C1805';
    if (credits.remaining <= 1) return '#D97706';
    return '#36555A';
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
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
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>Acompanhe seu progresso e continue praticando</p>
        </div>

        {/* Alerta de redações aguardando há muito tempo */}
        {pendingEssays.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <AlertCircle size={18} style={{ color: '#7C1805', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#7C1805' }}>
                {pendingEssays.length === 1
                  ? 'Você tem 1 redação aguardando correção há mais de 5 dias'
                  : `Você tem ${pendingEssays.length} redações aguardando correção há mais de 5 dias`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>
                {pendingEssays.map(e => e.prompt_title || 'Redação').join(' · ')}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Redações enviadas */}
          <Card className="p-5 bg-white border shadow-sm" data-testid="stat-total-essays">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>REDAÇÕES ENVIADAS</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#7C1805' }}>
                  {stats?.total_essays || 0}
                </p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: '#7C1805' }}>
                <FileText className="text-white" size={20} />
              </div>
            </div>
          </Card>

          {/* Aguardando correção */}
          <Card className="p-5 bg-white border shadow-sm" data-testid="stat-pending">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>AGUARDANDO CORREÇÃO</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#D97706' }}>
                  {stats?.pending_corrections || 0}
                </p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: '#D97706' }}>
                <Clock className="text-white" size={20} />
              </div>
            </div>
          </Card>

          {/* Média */}
          <Card className="p-5 bg-white border shadow-sm" data-testid="stat-average-score">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>MÉDIA DE PONTOS</p>
                <p className="text-3xl font-bold mt-1" style={{ color: getScoreColor(stats?.average_score || 0) }}>
                  {Math.round(stats?.average_score || 0)}
                </p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: '#D9B2CF' }}>
                <CheckCircle style={{ color: '#4A1A3A' }} size={20} />
              </div>
            </div>
          </Card>

          {/* Melhor nota */}
          <Card className="p-5 bg-white border shadow-sm" data-testid="stat-best-score">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>MELHOR NOTA</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#36555A' }}>
                  {stats?.best_score || 0}
                </p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: '#36555A' }}>
                <Award className="text-white" size={20} />
              </div>
            </div>
          </Card>

          {/* Créditos */}
          <Card
            className="p-5 bg-white border shadow-sm"
            style={{ borderColor: credits?.remaining === 0 ? '#7C1805' : undefined }}
            data-testid="stat-credits"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>CRÉDITOS</p>
                {credits?.mode === 'unlimited' ? (
                  <p className="text-2xl font-bold mt-1" style={{ color: '#36555A' }}>∞</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold mt-1" style={{ color: getCreditColor() }}>
                      {credits?.remaining ?? '—'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>
                      de {credits?.limit} {credits?.mode === 'monthly' ? 'por mês' : 'por semana'}
                    </p>
                    {credits?.renews_at && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#6B5B4E' }}>
                        <RefreshCw size={10} />
                        Renova em {credits.renews_at}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: getCreditColor() }}>
                <Zap className="text-white" size={20} />
              </div>
            </div>
            {credits?.remaining === 0 && (
              <p className="text-xs mt-2 font-semibold" style={{ color: '#7C1805' }}>
                Limite atingido. Aguarde a renovação.
              </p>
            )}
          </Card>
        </div>

        <Card className="p-8 bg-white border shadow-sm">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-bold mb-3" style={{ color: '#7C1805' }}>
              Continue Praticando
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B5B4E' }}>
              A prática constante é essencial para alcançar uma boa pontuação. Navegue pelos temas disponíveis e continue escrevendo redações para receber feedback personalizado.
            </p>
            <div className="flex flex-wrap gap-4">
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
                className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition-colors"
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
