import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, FileText, CheckCircle2, Clock, RotateCcw, TrendingUp, BookOpen, BookX, Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (!score) return 'var(--text-secondary)';
  if (score >= 800) return 'var(--accent-green)';
  if (score >= 600) return 'var(--accent-orange)';
  if (score >= 400) return '#DAB257';
  return 'var(--accent-red)';
};

const StatusBadge = ({ status }) => {
  const map = {
    pending:     { label: '📤 Enviada',      bg: 'var(--text-secondary)' },
    in_progress: { label: '✏️ Em correção',  bg: 'var(--accent-orange)' },
    corrected:   { label: '✅ Corrigida',    bg: 'var(--accent-green)' },
    returned:    { label: '↩️ Devolvida',    bg: '#DAB257' },
  };
  const c = map[status] || map.pending;
  return <Badge style={{ backgroundColor: c.bg, color: 'var(--bg-primary)', fontSize: '11px' }}>{c.label}</Badge>;
};

export const StudentProgress = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [studentId]);

  // Q-06: hooks antes dos early returns (regra dos hooks do React)
  const essays = data?.essays ?? [];
  const scores = useMemo(
    () => essays.filter(e => e.score != null).map(e => e.score),
    [essays]
  );
  const avgScore = useMemo(
    () => scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    [scores]
  );
  const bestScore = useMemo(() => scores.length ? Math.max(...scores) : 0, [scores]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/teacher/student/${studentId}`, { withCredentials: true });
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!data) return;
    const { student, essays, stats } = data;
    const scores = essays.filter(e => e.score != null).map(e => e.score);
    const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    exportToPDF(`Evolução — ${student.name}`, `
      <h1>Evolução do Aluno</h1>
      <p class="subtitle">${student.name} · ${student.email}</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-value">${stats.total}</div><div class="stat-label">Total de Redações</div></div>
        <div class="stat-box"><div class="stat-value">${stats.corrected}</div><div class="stat-label">Corrigidas</div></div>
        <div class="stat-box"><div class="stat-value">${avg || '—'}</div><div class="stat-label">Média de Pontos</div></div>
        <div class="stat-box"><div class="stat-value">${stats.rewrites}</div><div class="stat-label">Reescritas</div></div>
        <div class="stat-box"><div class="stat-value">${stats.pending}</div><div class="stat-label">Pendentes</div></div>
      </div>
      <h2>Histórico de Redações</h2>
      <table>
        <tr><th>Proposta</th><th>Status</th><th>Enviada em</th><th>Nota</th></tr>
        ${essays.map(e => `<tr>
          <td>${e.prompt_title}</td>
          <td>${e.status === 'corrected' ? 'Corrigida' : e.status === 'pending' ? 'Pendente' : e.status}</td>
          <td>${new Date(e.submitted_at).toLocaleDateString('pt-BR')}</td>
          <td>${e.score ?? '—'}</td>
        </tr>`).join('')}
      </table>
    `);
  };

  const handleExportExcel = () => {
    if (!data) return;
    const { student, essays } = data;
    exportToExcel(`evolucao-${student.name.replace(/\s+/g,'-').toLowerCase()}`,
      ['Proposta', 'Status', 'Reescrita', 'Data Envio', 'Data Correção', 'Nota'],
      essays.map(e => [
        e.prompt_title,
        e.status === 'corrected' ? 'Corrigida' : 'Pendente',
        e.is_rewrite ? 'Sim' : 'Não',
        new Date(e.submitted_at).toLocaleDateString('pt-BR'),
        e.corrected_at ? new Date(e.corrected_at).toLocaleDateString('pt-BR') : '',
        e.score ?? '',
      ])
    );
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
        </div>
        <div className="h-64 bg-muted rounded" />
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <Card className="p-10 text-center bg-white">
        <p style={{ color: 'var(--text-secondary)' }}>Aluno não encontrado</p>
      </Card>
    </Layout>
  );

  const { student, prompts_done, prompts_not_done, stats } = data || {};  // essays já definido acima para useMemo

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="font-heading font-bold text-3xl" style={{ color: 'var(--accent-red)' }}>
              {student.name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{student.email}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={handleExportPDF}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', backgroundColor: 'white' }}>
              <Download size={13} /> PDF
            </button>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)', backgroundColor: 'white' }}>
              <Download size={13} /> Excel
            </button>
          </div>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'REDAÇÕES', value: stats.total, icon: FileText, color: 'var(--accent-red)' },
            { label: 'PENDENTES', value: stats.pending, icon: Clock, color: '#D97706' },
            { label: 'CORRIGIDAS', value: stats.corrected, icon: CheckCircle2, color: 'var(--accent-green)' },
            { label: 'REESCRITAS', value: stats.rewrites, icon: RotateCcw, color: '#D9B2CF' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4 bg-white border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: color }}>
                  <Icon className="text-white" size={16} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Linha de notas */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: 'var(--accent-red)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--accent-red)' }}>Evolução de Notas</p>
            </div>
            {scores.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sem notas ainda</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Média</span>
                  <span className="font-bold" style={{ color: getScoreColor(avgScore) }}>{avgScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Melhor nota</span>
                  <span className="font-bold" style={{ color: getScoreColor(bestScore) }}>{bestScore}</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Últimas notas:</p>
                  <div className="flex gap-2 flex-wrap">
                    {essays.filter(e => e.score != null).slice(0, 5).map((e, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full font-bold"
                        style={{ backgroundColor: 'var(--bg-primary)', color: getScoreColor(e.score) }}>
                        {e.score}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: 'var(--accent-red)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--accent-red)' }}>Propostas</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--accent-green)' }}>
                ✓ Feitas ({prompts_done.length})
              </p>
              {prompts_done.slice(0, 3).map(p => (
                <p key={p.id} className="text-xs pl-3 truncate" style={{ color: 'var(--text-secondary)' }}>• {p.title}</p>
              ))}
              {prompts_done.length > 3 && (
                <p className="text-xs pl-3" style={{ color: 'var(--text-secondary)' }}>+{prompts_done.length - 3} mais</p>
              )}
              {prompts_not_done.length > 0 && (
                <>
                  <p className="text-xs font-semibold mt-2" style={{ color: 'var(--accent-red)' }}>
                    ✗ Não feitas ({prompts_not_done.length})
                  </p>
                  {prompts_not_done.slice(0, 2).map(p => (
                    <p key={p.id} className="text-xs pl-3 truncate" style={{ color: 'var(--text-secondary)' }}>• {p.title}</p>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Histórico de redações */}
        <Card className="bg-white border shadow-sm">
          <div className="p-4 border-b" style={{ borderColor: '#F0EBE3' }}>
            <p className="font-semibold" style={{ color: 'var(--accent-red)' }}>Histórico de Redações</p>
          </div>
          {essays.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhuma redação enviada</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F0EBE3' }}>
              {essays.map(essay => (
                <div key={essay.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {essay.prompt_title}
                      </p>
                      <StatusBadge status={essay.status} />
                      {essay.is_rewrite && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FFF0E0', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)' }}>
                          ✏️ Reescrita
                        </span>
                      )}
                      {essay.mark_important && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)' }}>
                          ★ Revisão em aula
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Enviada em {new Date(essay.submitted_at).toLocaleDateString('pt-BR')}
                      {essay.corrected_at && ` · Corrigida em ${new Date(essay.corrected_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {essay.score != null && (
                      <span className="font-bold text-base" style={{ color: getScoreColor(essay.score) }}>
                        {essay.score}
                      </span>
                    )}
                    {essay.status === 'pending' && (
                      <Button size="sm" onClick={() => navigate(`/correct-essay/${essay.id}`)}>
                        Corrigir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};
