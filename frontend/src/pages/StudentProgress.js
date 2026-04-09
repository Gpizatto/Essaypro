import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, FileText, CheckCircle2, Clock, RotateCcw, TrendingUp, BookOpen, BookX } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (!score) return '#6B5B4E';
  if (score >= 800) return '#36555A';
  if (score >= 600) return '#D66B27';
  if (score >= 400) return '#DAB257';
  return '#7C1805';
};

const StatusBadge = ({ status }) => {
  const map = {
    pending:     { label: '📤 Enviada',      bg: '#6B5B4E' },
    in_progress: { label: '✏️ Em correção',  bg: '#D66B27' },
    corrected:   { label: '✅ Corrigida',    bg: '#36555A' },
    returned:    { label: '↩️ Devolvida',    bg: '#DAB257' },
  };
  const c = map[status] || map.pending;
  return <Badge style={{ backgroundColor: c.bg, color: '#FDF3E8', fontSize: '11px' }}>{c.label}</Badge>;
};

export const StudentProgress = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [studentId]);

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
        <p style={{ color: '#6B5B4E' }}>Aluno não encontrado</p>
      </Card>
    </Layout>
  );

  const { student, essays, prompts_done, prompts_not_done, stats } = data;
  const scores = essays.filter(e => e.score != null).map(e => e.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
              {student.name}
            </h1>
            <p className="text-sm" style={{ color: '#6B5B4E' }}>{student.email}</p>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'REDAÇÕES', value: stats.total, icon: FileText, color: '#7C1805' },
            { label: 'PENDENTES', value: stats.pending, icon: Clock, color: '#D97706' },
            { label: 'CORRIGIDAS', value: stats.corrected, icon: CheckCircle2, color: '#36555A' },
            { label: 'REESCRITAS', value: stats.rewrites, icon: RotateCcw, color: '#D9B2CF' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4 bg-white border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>{label}</p>
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
              <TrendingUp size={16} style={{ color: '#7C1805' }} />
              <p className="font-semibold text-sm" style={{ color: '#7C1805' }}>Evolução de Notas</p>
            </div>
            {scores.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B5B4E' }}>Sem notas ainda</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6B5B4E' }}>Média</span>
                  <span className="font-bold" style={{ color: getScoreColor(avgScore) }}>{avgScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6B5B4E' }}>Melhor nota</span>
                  <span className="font-bold" style={{ color: getScoreColor(bestScore) }}>{bestScore}</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: '#6B5B4E' }}>Últimas notas:</p>
                  <div className="flex gap-2 flex-wrap">
                    {essays.filter(e => e.score != null).slice(0, 5).map((e, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full font-bold"
                        style={{ backgroundColor: '#FDF3E8', color: getScoreColor(e.score) }}>
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
              <BookOpen size={16} style={{ color: '#7C1805' }} />
              <p className="font-semibold text-sm" style={{ color: '#7C1805' }}>Propostas</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: '#36555A' }}>
                ✓ Feitas ({prompts_done.length})
              </p>
              {prompts_done.slice(0, 3).map(p => (
                <p key={p.id} className="text-xs pl-3 truncate" style={{ color: '#6B5B4E' }}>• {p.title}</p>
              ))}
              {prompts_done.length > 3 && (
                <p className="text-xs pl-3" style={{ color: '#6B5B4E' }}>+{prompts_done.length - 3} mais</p>
              )}
              {prompts_not_done.length > 0 && (
                <>
                  <p className="text-xs font-semibold mt-2" style={{ color: '#7C1805' }}>
                    ✗ Não feitas ({prompts_not_done.length})
                  </p>
                  {prompts_not_done.slice(0, 2).map(p => (
                    <p key={p.id} className="text-xs pl-3 truncate" style={{ color: '#6B5B4E' }}>• {p.title}</p>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Histórico de redações */}
        <Card className="bg-white border shadow-sm">
          <div className="p-4 border-b" style={{ borderColor: '#F0EBE3' }}>
            <p className="font-semibold" style={{ color: '#7C1805' }}>Histórico de Redações</p>
          </div>
          {essays.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: '#6B5B4E' }}>Nenhuma redação enviada</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F0EBE3' }}>
              {essays.map(essay => (
                <div key={essay.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" style={{ color: '#2C1A0E' }}>
                        {essay.prompt_title}
                      </p>
                      <StatusBadge status={essay.status} />
                      {essay.is_rewrite && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FFF0E0', color: '#D66B27', border: '1px solid #D66B27' }}>
                          ✏️ Reescrita
                        </span>
                      )}
                      {essay.mark_important && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FDF3E8', color: '#D66B27', border: '1px solid #D66B27' }}>
                          ★ Revisão em aula
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>
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
