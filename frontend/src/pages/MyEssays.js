import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FileText, Clock, Filter, X, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_MAP = {
  pending:     { label: 'Enviada',      bg: '#6B5B4E', icon: '📤' },
  in_progress: { label: 'Em correção',  bg: '#D66B27', icon: '✏️' },
  corrected:   { label: 'Corrigida',    bg: '#36555A', icon: '✅' },
  returned:    { label: 'Devolvida',    bg: '#DAB257', icon: '↩️' },
};

const getStatusBadge = (status) => {
  const config = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <Badge style={{ backgroundColor: config.bg, color: '#FDF3E8', fontSize: '11px' }} data-testid={`status-badge-${status}`}>
      {config.icon} {config.label}
    </Badge>
  );
};

export const MyEssays = () => {
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterPrompt, setFilterPrompt] = useState('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchEssays();
  }, []);

  const fetchEssays = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/essays/my`, { withCredentials: true });
      // Ordenar do mais recente para o mais antigo
      data.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      setEssays(data);
    } catch (error) {
      console.error('Error fetching essays:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEssay = async (essayId, promptTitle) => {
    if (!window.confirm(`Deletar permanentemente a redação "${promptTitle}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/admin/essays/${essayId}`, { withCredentials: true });
      setEssays(prev => prev.filter(e => e.id !== essayId));
      toast.success('Redação deletada com sucesso!');
    } catch (error) {
      console.error('Error deleting essay:', error);
      toast.error('Erro ao deletar redação: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Opções únicas para os filtros
  const promptOptions = useMemo(() => {
    const titles = [...new Set(essays.map(e => e.prompt_title).filter(Boolean))];
    return titles;
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

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterMonth('all');
    setFilterPrompt('all');
  };

  const selectStyle = {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #E8DDD0',
    backgroundColor: '#FFFFFF',
    color: '#2C1A0E',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none',
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }} data-testid="my-essays-title">
            Minhas Redações
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            {essays.length} redaç{essays.length === 1 ? 'ão' : 'ões'} enviada{essays.length !== 1 ? 's' : ''}
          </p>
        </div>

        {essays.length > 0 && (
          <Card className="p-4 bg-white border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2" style={{ color: '#7C1805' }}>
                <Filter size={15} />
                <span className="text-sm font-semibold">Filtrar por:</span>
              </div>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={selectStyle}
                data-testid="filter-status"
              >
                                <option value="all">Todos os status</option>
                <option value="pending">📤 Enviada</option>
                <option value="in_progress">✏️ Em correção</option>
                <option value="corrected">✅ Corrigida</option>
                <option value="returned">↩️ Devolvida</option>
                </select>

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
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: '#FDF3E8', color: '#7C1805', border: '1px solid #D66B27' }}
                >
                  <X size={12} /> Limpar filtros
                </button>
              )}

              {hasActiveFilters && (
                <span className="text-xs ml-auto" style={{ color: '#6B5B4E' }}>
                  {filteredEssays.length} resultado{filteredEssays.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </Card>
        )}

        {essays.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <FileText size={48} className="mx-auto mb-4" style={{ color: '#D66B27' }} />
            <p className="text-lg mb-4" style={{ color: '#6B5B4E' }}>Você ainda não enviou nenhuma redação</p>
            <a
              href="/prompts"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white"
              style={{ backgroundColor: '#7C1805' }}
              data-testid="write-first-essay-button"
            >
              Escrever Primeira Redação
            </a>
          </Card>
        ) : filteredEssays.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <p className="text-lg mb-3" style={{ color: '#6B5B4E' }}>Nenhuma redação encontrada com esses filtros</p>
            <button onClick={clearFilters} className="text-sm font-semibold" style={{ color: '#7C1805' }}>
              Limpar filtros
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEssays.map((essay) => (
              <Card
                key={essay.id}
                className="p-6 bg-white border shadow-sm hover:shadow-md transition-shadow"
                data-testid={`essay-card-${essay.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      if (essay.status === 'corrected') {
                        navigate(`/essay/${essay.id}/correction`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-heading text-lg font-semibold" style={{ color: '#7C1805' }}>
                        {essay.prompt_title || 'Redação'}
                      </h3>
                      {getStatusBadge(essay.status)}
                      {essay.is_rewrite && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#FFF0E0', color: '#D66B27', border: '1px solid #D66B27' }}>
                          ✏️ Reescrita
                        </span>
                      )}
                    </div>
                    <p className="text-sm flex items-center gap-2" style={{ color: '#6B5B4E' }}>
                      <Clock size={14} />
                      Enviada em {new Date(essay.submitted_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(essay.submitted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>
                      Método: {essay.submission_method === 'editor' ? 'Editor' : essay.submission_method === 'paste' ? 'Texto colado' : 'Upload de arquivo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {essay.status === 'corrected' && (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: '#36555A', color: '#FDF3E8' }}
                        onClick={() => navigate(`/essay/${essay.id}/correction`)}
                      >
                        Ver Correção →
                      </span>
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
