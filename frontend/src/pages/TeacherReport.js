import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { CheckCircle2, Clock, Calendar, TrendingUp, BarChart3, Star, Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <Card className="p-5 bg-white border shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>{label}</p>
        <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>{sub}</p>}
      </div>
      <div className="p-2 rounded-md" style={{ backgroundColor: color }}>
        <Icon className="text-white" size={20} />
      </div>
    </div>
  </Card>
);

const BarChart = ({ data, label }) => {
  if (!data || data.length === 0) return (
    <p className="text-sm text-center py-4" style={{ color: '#6B5B4E' }}>Sem dados ainda</p>
  );
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs w-10 text-right shrink-0" style={{ color: '#6B5B4E' }}>
            {item[label]}
          </span>
          <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ backgroundColor: '#F0EBE3' }}>
            <div
              className="h-full rounded-md flex items-center justify-end pr-2 transition-all"
              style={{
                width: `${Math.max((item.count / max) * 100, 4)}%`,
                backgroundColor: '#7C1805',
              }}
            >
              {item.count > 0 && (
                <span className="text-xs font-bold text-white">{item.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TeacherReport = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/teacher/my-stats`, { withCredentials: true });
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    exportToPDF('Meu Relatório de Correções — RcN', `
      <h1>Relatório Pessoal de Correções</h1>
      <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-value">${stats?.total_corrections || 0}</div><div class="stat-label">Total Corrigidas</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.today || 0}</div><div class="stat-label">Hoje</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.this_week || 0}</div><div class="stat-label">Esta Semana</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.this_month || 0}</div><div class="stat-label">Este Mês</div></div>
        <div class="stat-box"><div class="stat-value">${formatAvgTime(stats?.avg_hours)}</div><div class="stat-label">Tempo Médio</div></div>
      </div>
      ${stats?.monthly_data?.length ? `
        <h2>Produção Mensal</h2>
        <table>
          <tr><th>Mês</th><th>Correções</th></tr>
          ${stats.monthly_data.map(d => `<tr><td>${d.month}</td><td>${d.count}</td></tr>`).join('')}
        </table>` : ''}
      ${stats?.weekly_data?.length ? `
        <h2>Produção Semanal (últimas 4 semanas)</h2>
        <table>
          <tr><th>Semana</th><th>Correções</th></tr>
          ${stats.weekly_data.map(d => `<tr><td>${d.week}</td><td>${d.count}</td></tr>`).join('')}
        </table>` : ''}
    `);
  };

  const handleExportExcel = () => {
    const headers = ['Período', 'Correções'];
    const rows = [
      ['Total geral', stats?.total_corrections || 0],
      ['Hoje', stats?.today || 0],
      ['Esta semana', stats?.this_week || 0],
      ['Este mês', stats?.this_month || 0],
      ['Tempo médio por correção', formatAvgTime(stats?.avg_hours)],
      ['', ''],
      ['--- MENSAL ---', ''],
      ...(stats?.monthly_data || []).map(d => [d.month, d.count]),
      ['', ''],
      ['--- SEMANAL ---', ''],
      ...(stats?.weekly_data || []).map(d => [d.week, d.count]),
    ];
    exportToExcel('meu-relatorio-correcoes', headers, rows);
  };

  const formatAvgTime = (hours) => {
    if (!hours) return '—';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)} dias`;
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-48 bg-muted rounded" />)}
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
            Meu Relatório
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            Sua produtividade e histórico de correções
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleExportPDF}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: '#7C1805', color: '#7C1805', backgroundColor: 'white' }}>
              <Download size={13} /> PDF
            </button>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: '#36555A', color: '#36555A', backgroundColor: 'white' }}>
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Cards principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="TOTAL CORRIGIDAS"
            value={stats?.total_corrections || 0}
            icon={CheckCircle2}
            color="#36555A"
          />
          <StatCard
            label="HOJE"
            value={stats?.today || 0}
            icon={Star}
            color="#7C1805"
          />
          <StatCard
            label="ESTA SEMANA"
            value={stats?.this_week || 0}
            icon={Calendar}
            color="#D66B27"
          />
          <StatCard
            label="ESTE MÊS"
            value={stats?.this_month || 0}
            sub={`Média: ${formatAvgTime(stats?.avg_hours)} por redação`}
            icon={TrendingUp}
            color="#DAB257"
          />
        </div>

        {/* Tempo médio destaque */}
        {stats?.avg_hours > 0 && (
          <Card className="p-5 bg-white border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#FDF3E8' }}>
                <Clock size={24} style={{ color: '#D66B27' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>
                  Tempo médio de correção
                </p>
                <p className="text-2xl font-bold" style={{ color: '#7C1805' }}>
                  {formatAvgTime(stats.avg_hours)}
                </p>
                <p className="text-xs" style={{ color: '#6B5B4E' }}>
                  Calculado entre o envio pelo aluno e a publicação da correção
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5 bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} style={{ color: '#7C1805' }} />
              <h2 className="font-semibold text-sm" style={{ color: '#7C1805' }}>
                Produção por semana (últimas 4)
              </h2>
            </div>
            <BarChart data={stats?.weekly_data} label="week" />
          </Card>

          <Card className="p-5 bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} style={{ color: '#7C1805' }} />
              <h2 className="font-semibold text-sm" style={{ color: '#7C1805' }}>
                Produção por mês (últimos 6)
              </h2>
            </div>
            <BarChart data={stats?.monthly_data} label="month" />
          </Card>
        </div>

        {/* Dica motivacional */}
        {stats?.total_corrections === 0 && (
          <Card className="p-6 bg-white border text-center">
            <p className="text-3xl mb-2">✏️</p>
            <p className="font-semibold" style={{ color: '#7C1805' }}>Comece a corrigir!</p>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              Seu relatório será preenchido conforme você realiza correções.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};
