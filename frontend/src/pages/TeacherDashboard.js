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

    const [queueRes, statsRes] = await Promise.allSettled([
      axios.get(`${API_URL}/api/essays/queue`, { withCredentials: true }),
      axios.get(`${API_URL}/api/teacher/my-stats`, { withCredentials: true }),
    ]);

    let hasError = false;

    if (queueRes.status === 'fulfilled') {
      setPending(queueRes.value.data.length);
    } else {
      setPending(0);
      hasError = true;
    }

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data);
    } else {
      setStats({ total_corrections: 0, today: 0, this_week: 0, this_month: 0 });
      hasError = true;
    }

    if (hasError) setError('Não foi possível carregar alguns dados. Verifique sua conexão.');
    setLoading(false);
  };

  const StatCard = ({ label, value, Icon, color, isLoading }) => (
    <Card
      className="bg-white border"
      style={{
        padding: '18px 18px 14px',
        borderRadius: '14px',
        borderColor: `${color}22`,
        boxShadow: '0 1px 4px rgba(44,26,14,0.05)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {/* Ghost icon */}
      <div style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.07, pointerEvents: 'none' }}>
        <Icon size={72} color={color} />
      </div>
      {/* Dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#6B5B4E', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
      </div>
      {isLoading
        ? <div style={{ height: '38px', width: '64px', backgroundColor: '#F0EBE3', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        : <p style={{ fontSize: '38px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value ?? 0}</p>
      }
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="font-heading font-bold"
              style={{ fontSize: '30px', color: '#7C1805', letterSpacing: '-0.02em', lineHeight: 1.1 }}
              data-testid="teacher-dashboard-title"
            >
              Painel do Professor
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>Gerencie correções e propostas</p>
          </div>
          <button
            onClick={fetchStats}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid #E8DDD0', backgroundColor: '#fff',
              fontSize: '13px', fontWeight: 600, color: '#6B5B4E', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{ backgroundColor: '#FEF2F2', color: '#7C1805', border: '1px solid #FCA5A5' }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Aguardando Correção" value={pending} Icon={Clock} color="#F59E0B" isLoading={loading} />
          <StatCard label="Correções Realizadas" value={stats?.total_corrections} Icon={CheckCircle} color="#36555A" isLoading={loading} />
          <StatCard label="Este Mês" value={stats?.this_month} Icon={Calendar} color="#7C1805" isLoading={loading} />
          <StatCard label="Hoje" value={stats?.today} Icon={TrendingUp} color="#D66B27" isLoading={loading} />
          <StatCard label="Esta Semana" value={stats?.this_week} Icon={FileText} color="#6B5B4E" isLoading={loading} />
        </div>

        {/* CTA Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #7C1805 0%, #9E2010 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(218,178,87,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: '60px', bottom: '-70px', width: '160px', height: '160px', borderRadius: '50%', backgroundColor: 'rgba(218,178,87,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <p className="font-script" style={{ fontSize: '13px', color: '#DAB257', marginBottom: '4px' }}>ações rápidas</p>
            <h2 className="font-heading font-bold" style={{ fontSize: '20px', color: '#FDF3E8', marginBottom: '4px' }}>
              O que deseja fazer?
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(253,243,232,0.7)' }}>
              {pending > 0 ? `${pending} redação${pending !== 1 ? 'ões' : ''} aguardando sua correção.` : 'Tudo em dia! Que tal criar uma nova proposta?'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, position: 'relative', flexWrap: 'wrap' }}>
            <a
              href="/correction-queue"
              style={{
                padding: '11px 22px', borderRadius: '10px',
                backgroundColor: '#DAB257', color: '#2C1A0E',
                fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
              }}
              data-testid="view-queue-button"
            >
              Fila de Correções {pending > 0 && `(${pending})`}
            </a>
            <a
              href="/create-prompt"
              style={{
                padding: '11px 22px', borderRadius: '10px',
                backgroundColor: 'transparent', color: '#FDF3E8',
                fontSize: '13px', fontWeight: 600,
                border: '1px solid rgba(253,243,232,0.3)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
              }}
              data-testid="create-prompt-button"
            >
              Criar Proposta
            </a>
            <a
              href="/teacher/report"
              style={{
                padding: '11px 22px', borderRadius: '10px',
                backgroundColor: 'transparent', color: '#FDF3E8',
                fontSize: '13px', fontWeight: 600,
                border: '1px solid rgba(253,243,232,0.3)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
              }}
            >
              Meu Relatório
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};
