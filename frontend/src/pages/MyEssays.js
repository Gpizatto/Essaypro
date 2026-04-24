import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Clock, Eye, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_MAP = {
  pending:     { label: 'Enviada',      bg: 'var(--text-secondary)', col: 'var(--bg-primary)' },
  in_progress: { label: 'Em correção',  bg: 'var(--accent-orange)', col: 'var(--bg-primary)' },
  corrected:   { label: 'Corrigida',    bg: 'var(--accent-green)', col: 'var(--bg-primary)' },
  returned:    { label: 'Devolvida',    bg: '#DAB257', col: 'var(--text-primary)' },
};

const FILTER_PILLS = [
  { key: 'all',         label: 'Todos' },
  { key: 'pending',     label: '📤 Enviada' },
  { key: 'in_progress', label: '✏️ Em correção' },
  { key: 'corrected',   label: '✅ Corrigida' },
  { key: 'returned',    label: '↩️ Devolvida' },
];

export const MyEssays = () => {
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterPrompt, setFilterPrompt] = useState('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { fetchEssays(); }, []);

  const fetchEssays = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/essays/my`, { withCredentials: true });
      data.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      setEssays(data);
    } catch (error) {
      console.error('Error fetching essays:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEssay = async (essayId, promptTitle) => {
    if (!window.confirm(`Deletar permanentemente a redação "${promptTitle}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/essays/${essayId}`, { withCredentials: true });
      setEssays(prev => prev.filter(e => e.id !== essayId));
      toast.success('Redação deletada com sucesso!');
    } catch (error) {
      toast.error('Erro ao deletar redação: ' + (error.response?.data?.detail || error.message));
    }
  };

  const promptOptions = useMemo(() => {
    return [...new Set(essays.map(e => e.prompt_title).filter(Boolean))];
  }, [essays]);

  const monthOptions = useMemo(() => {
    const months = [...new Set(essays.map(e => {
      const d = new Date(e.submitted_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))];
    return months.sort((a, b) => b.localeCompare(a));
  }, [essays]);

  const formatMonth = (ym) => {
    const [year, month] = ym.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const filteredEssays = useMemo(() => {
    return essays.filter(essay => {
      if (filterStatus !== 'all' && essay.status !== filterStatus) return false;
      if (filterPrompt !== 'all' && essay.prompt_title !== filterPrompt) return false;
      if (filterMonth !== 'all') {
        const d = new Date(essay.submitted_at);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== filterMonth) return false;
      }
      return true;
    });
  }, [essays, filterStatus, filterMonth, filterPrompt]);

  const hasActiveFilters = filterStatus !== 'all' || filterMonth !== 'all' || filterPrompt !== 'all';
  const clearFilters = () => { setFilterStatus('all'); setFilterMonth('all'); setFilterPrompt('all'); };

  const pillBase = {
    padding: '8px 14px', borderRadius: '99px', border: 'none',
    cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
    transition: 'all 0.15s ease', minHeight: '40px', whiteSpace: 'nowrap',
  };

  const selectStyle = {
    padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px',
    cursor: 'pointer', outline: 'none',
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded"></div>)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1
            className="font-heading font-bold"
            style={{ fontSize: '28px', color: 'var(--accent-red)', letterSpacing: '-0.02em' }}
            data-testid="my-essays-title"
          >
            Minhas Redações
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {essays.length} redaç{essays.length === 1 ? 'ão' : 'ões'} enviada{essays.length !== 1 ? 's' : ''}
          </p>
        </div>

        {essays.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Filtro de status: pills */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', minWidth: 'fit-content' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '4px', whiteSpace: 'nowrap' }}>Status:</span>
              {FILTER_PILLS.map(p => {
                const isActive = filterStatus === p.key;
                const cfg = STATUS_MAP[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => setFilterStatus(p.key)}
                    data-testid={p.key !== 'all' ? `filter-status-${p.key}` : 'filter-status-all'}
                    style={{
                      ...pillBase,
                      backgroundColor: isActive ? (cfg?.bg || 'var(--accent-red)') : 'var(--bg-card)',
                      color: isActive
                        ? (p.key === 'returned' ? 'var(--text-primary)' : 'var(--bg-primary)')
                        : 'var(--text-secondary)',
                      boxShadow: isActive ? 'none' : '0 1px 3px rgba(44,26,14,0.08)',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div></div>

            {/* Filtros secundários: mês e proposta (selects, mas estilizados) */}
            {(monthOptions.length > 1 || promptOptions.length > 1) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '4px' }}>Filtrar:</span>

                {monthOptions.length > 1 && (
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    style={selectStyle}
                    data-testid="filter-month"
                  >
                    <option value="all">Todos os meses</option>
                    {monthOptions.map(m => (
                      <option key={m} value={m}>{formatMonth(m)}</option>
                    ))}
                  </select>
                )}

                {promptOptions.length > 1 && (
                  <select
                    value={filterPrompt}
                    onChange={e => setFilterPrompt(e.target.value)}
                    style={{ ...selectStyle, maxWidth: '220px' }}
                    data-testid="filter-prompt"
                  >
                    <option value="all">Todas as propostas</option>
                    {promptOptions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px',
                      backgroundColor: 'var(--bg-primary)', color: 'var(--accent-red)', border: '1px solid var(--accent-orange)',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Limpar filtros
                  </button>
                )}

                {hasActiveFilters && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    {filteredEssays.length} resultado{filteredEssays.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lista vazia */}
        {essays.length === 0 ? (
          <Card className="p-12 text-center bg-white" style={{ borderRadius: '14px' }}>
            <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--accent-orange)' }} />
            <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>Você ainda não enviou nenhuma redação</p>
            <a
              href="/prompts"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '11px 24px', borderRadius: '10px',
                backgroundColor: 'var(--accent-red)', color: 'var(--bg-primary)',
                fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              }}
              data-testid="write-first-essay-button"
            >
              Escrever Primeira Redação
            </a>
          </Card>
        ) : filteredEssays.length === 0 ? (
          <Card className="p-10 text-center bg-white" style={{ borderRadius: '14px' }}>
            <p className="text-lg mb-3" style={{ color: 'var(--text-secondary)' }}>Nenhuma redação encontrada com esses filtros</p>
            <button onClick={clearFilters} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Limpar filtros
            </button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEssays.map((essay) => {
              const sm = STATUS_MAP[essay.status] || STATUS_MAP.pending;
              return (
                <Card
                  key={essay.id}
                  className="bg-white border"
                  style={{
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: '0 1px 4px rgba(44,26,14,0.05)',
                    borderColor: 'var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'box-shadow 0.15s ease',
                  }}
                  data-testid={`essay-card-${essay.id}`}
                >
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: essay.status === 'corrected' ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (essay.status === 'corrected') navigate(`/essay/${essay.id}/correction`);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <h3
                        className="font-heading font-semibold"
                        style={{ fontSize: '14.5px', color: 'var(--text-primary)' }}
                      >
                        {essay.prompt_title || 'Redação'}
                      </h3>
                      {/* Badge de status */}
                      <span style={{
                        fontSize: '11px', fontWeight: 600,
                        padding: '2px 8px', borderRadius: '99px',
                        backgroundColor: sm.bg, color: sm.col,
                      }}>
                        {sm.label}
                      </span>
                      {/* Score badge se corrigida */}
                      {essay.score !== undefined && essay.score !== null && (
                        <span style={{
                          fontSize: '11.5px', fontWeight: 700,
                          padding: '2px 9px', borderRadius: '99px',
                          backgroundColor: '#EAF3DE', color: '#27500A',
                        }}>
                          {essay.score} pts
                        </span>
                      )}
                      {essay.is_rewrite && (
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          padding: '2px 8px', borderRadius: '99px',
                          backgroundColor: '#FFF0E0', color: 'var(--accent-orange)',
                          border: '1px solid var(--accent-orange)',
                        }}>
                          ✏️ Reescrita
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(essay.submitted_at).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(essay.submitted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>
                        via {essay.submission_method === 'editor' ? 'Editor' : essay.submission_method === 'paste' ? 'Texto colado' : 'Upload'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {essay.status === 'corrected' && (
                      <button
                        onClick={() => navigate(`/essay/${essay.id}/correction`)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          backgroundColor: 'var(--accent-green)', color: 'var(--bg-primary)',
                          fontSize: '12px', fontWeight: 600,
                        }}
                      >
                        <Eye size={13} /> Ver Correção
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEssay(essay.id, essay.prompt_title || 'Redação');
                        }}
                        title="Deletar redação"
                        style={{ color: '#DC2626', padding: '4px 8px' }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
