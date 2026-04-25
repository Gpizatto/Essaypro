import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { FileText, Clock, CheckCircle, Award, Zap, RefreshCw, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (score >= 800) return 'var(--accent-green)';
  if (score >= 600) return '#3B82F6';
  if (score >= 400) return '#F59E0B';
  return '#EF4444';
};

// Retorna saudação com base no horário
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

export const StudentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingEssays, setPendingEssays] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, creditsRes, essaysRes, settingsRes, coursesRes, userRes] = await Promise.all([
        axios.get(`${API_URL}/api/stats/student`, { withCredentials: true }),
        axios.get(`${API_URL}/api/credits/me`, { withCredentials: true }),
        axios.get(`${API_URL}/api/essays/my`, { withCredentials: true }),
        axios.get(`${API_URL}/api/settings/course`, { withCredentials: true }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/api/my/courses`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }).catch(() => ({ data: {} })),
      ]);
      setStats(statsRes.data);
      setCredits(creditsRes.data);
      setMyCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
      setUserName(userRes.data?.name || '');
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
    if (!credits || credits.mode === 'unlimited') return 'var(--accent-green)';
    if (credits.remaining === 0) return 'var(--accent-red)';
    if (credits.remaining <= 1) return '#D97706';
    return 'var(--accent-green)';
  };

  // Componente de card de estatística com ghost icon e progress bar
  const StatCard = ({ label, value, sub, Icon, color, progress }) => (
    <Card
      className="bg-white border shadow-sm"
      style={{
        padding: '18px 18px 14px',
        borderColor: `${color}22`,
        borderRadius: '14px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {/* Ghost icon de fundo */}
      <div style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.07, pointerEvents: 'none' }}>
        <Icon size={72} color={color} />
      </div>

      {/* Label com dot colorido */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
      </div>

      <p style={{ fontSize: '38px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em', position: 'relative' }}>
        {value}
      </p>

      {sub && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</p>}

      {/* Progress bar */}
      {progress !== undefined && (
        <div style={{ marginTop: '8px', height: '3px', backgroundColor: `${color}20`, borderRadius: '2px' }}>
          <div style={{ width: `${Math.min(100, progress)}%`, height: '100%', backgroundColor: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
        </div>
      )}
    </Card>
  );

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

  const firstName = userName.split(' ')[0];
  const greeting = getGreeting();
  const avgScore = Math.round(stats?.average_score || 0);
  const bestScore = stats?.best_score || 0;
  const creditRemaining = credits?.remaining ?? 0;
  const creditLimit = credits?.limit ?? 5;

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header com saudação personalizada */}
        <div>
          {firstName && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {greeting},{' '}
              <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{firstName}</span>{' '}
              👋
            </p>
          )}
          <h1
            className="font-heading font-bold"
            style={{ fontSize: 'clamp(22px, 5vw, 30px)', color: 'var(--accent-red)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
            data-testid="dashboard-title"
          >
            Bem-vinda de volta
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Acompanhe seu progresso e continue praticando
          </p>
        </div>

        {/* Alerta de redações aguardando */}
        {pendingEssays.length > 0 && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}
          >
            <AlertCircle size={18} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                {pendingEssays.length === 1
                  ? 'Você tem 1 redação aguardando correção há mais de 5 dias'
                  : `Você tem ${pendingEssays.length} redações aguardando correção há mais de 5 dias`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {pendingEssays.map(e => e.prompt_title || 'Redação').join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Minhas Turmas */}
        {myCourses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {myCourses.map(c => (
              <span
                key={c.id}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent-red)', border: '1px solid var(--accent-orange)' }}
              >
                🎓 {c.name}
              </span>
            ))}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Redações Enviadas"
            value={stats?.total_essays || 0}
            Icon={FileText}
            color="var(--accent-red)"
            data-testid="stat-total-essays"
          />
          <StatCard
            label="Aguardando Correção"
            value={stats?.pending_corrections || 0}
            Icon={Clock}
            color="#D97706"
            data-testid="stat-pending"
          />
          <StatCard
            label="Média de Pontos"
            value={avgScore}
            sub="de 1000 pts"
            Icon={CheckCircle}
            color={getScoreColor(avgScore)}
            progress={(avgScore / 1000) * 100}
            data-testid="stat-average-score"
          />
          <StatCard
            label="Melhor Nota"
            value={bestScore}
            sub="de 1000 pts"
            Icon={Award}
            color="var(--accent-green)"
            progress={(bestScore / 1000) * 100}
            data-testid="stat-best-score"
          />
          <Card
            className="bg-white border shadow-sm"
            style={{
              padding: '18px 18px 14px',
              borderColor: credits?.remaining === 0 ? 'var(--accent-red)22' : `${getCreditColor()}22`,
              borderRadius: '14px',
              position: 'relative',
              overflow: 'hidden',
            }}
            data-testid="stat-credits"
          >
            <div style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.07, pointerEvents: 'none' }}>
              <Zap size={72} color={getCreditColor()} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: getCreditColor(), flexShrink: 0 }} />
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Créditos</p>
            </div>
            {credits?.mode === 'unlimited' ? (
              <p style={{ fontSize: '38px', fontWeight: 800, color: 'var(--accent-green)', lineHeight: 1, letterSpacing: '-0.02em' }}>∞</p>
            ) : (
              <>
                <p style={{ fontSize: '38px', fontWeight: 800, color: getCreditColor(), lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {credits?.remaining ?? '—'}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  de {creditLimit} {credits?.mode === 'monthly' ? 'por mês' : 'por semana'}
                </p>
                {credits?.renews_at && (
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <RefreshCw size={10} />
                    Renova em {credits.renews_at}
                  </p>
                )}
                {credits?.mode !== 'unlimited' && (
                  <div style={{ marginTop: '8px', height: '3px', backgroundColor: `${getCreditColor()}20`, borderRadius: '2px' }}>
                    <div style={{
                      width: `${Math.min(100, (creditRemaining / creditLimit) * 100)}%`,
                      height: '100%',
                      backgroundColor: getCreditColor(),
                      borderRadius: '2px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                )}
              </>
            )}
            {credits?.remaining === 0 && (
              <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--accent-red)' }}>
                Limite atingido. Aguarde a renovação.
              </p>
            )}
          </Card>
        </div>

        {/* CTA Banner */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-red) 0%, #9E2010 100%)',
          borderRadius: '16px',
          padding: 'clamp(20px, 5vw, 28px) clamp(16px, 5vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden',
          flexWrap: 'wrap',
        }}>
          {/* Círculos decorativos */}
          <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '220px', height: '220px', borderRadius: '50%', backgroundColor: 'rgba(218,178,87,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: '60px', bottom: '-70px', width: '180px', height: '180px', borderRadius: '50%', backgroundColor: 'rgba(218,178,87,0.06)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <p className="font-script" style={{ fontSize: '14px', color: '#DAB257', marginBottom: '4px' }}>
              continue praticando
            </p>
            <h2 className="font-heading font-bold" style={{ fontSize: '20px', color: 'var(--bg-primary)', marginBottom: '6px' }}>
              Escreva sua próxima redação
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(253,243,232,0.7)', lineHeight: 1.6, maxWidth: '420px' }}>
              A prática constante é essencial para alcançar uma boa pontuação. Navegue pelos temas e continue evoluindo.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, position: 'relative', flexWrap: 'wrap' }}>
            <a
              href="/prompts"
              style={{
                padding: '11px 22px',
                borderRadius: '10px',
                backgroundColor: '#DAB257',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '44px',
              }}
              data-testid="view-themes-button"
            >
              Ver Temas Disponíveis
            </a>
            <a
              href="/my-essays"
              style={{
                padding: '11px 22px',
                borderRadius: '10px',
                backgroundColor: 'transparent',
                color: 'var(--bg-primary)',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid rgba(253,243,232,0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '44px',
              }}
              data-testid="my-essays-button"
            >
              Minhas Redações
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};
