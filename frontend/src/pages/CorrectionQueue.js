import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Clock, User, Search, AlertCircle, CheckCircle2, Edit3, History, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getWaitTime = (submitted_at, deadlineDays = 3) => {
  const diff = Date.now() - new Date(submitted_at).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const urgentAfter = deadlineDays > 0 ? deadlineDays : 3;
  if (days > 0) return { label: `${days}d`, urgent: days >= urgentAfter };
  if (hours > 0) return { label: `${hours}h`, urgent: hours >= urgentAfter * 24 };
  return { label: 'agora', urgent: false };
};

const STATUS_TABS = [
  { key: 'pending',     label: 'Enviadas',    Icon: Clock,        color: '#6B5B4E' },
  { key: 'in_progress', label: 'Em correção', Icon: Edit3,        color: '#D66B27' },
  { key: 'corrected',   label: 'Concluídas',  Icon: CheckCircle2, color: '#36555A' },
];

const METHOD_LABEL = { editor: 'Editor', paste: 'Colado', upload: 'Upload' };

export const CorrectionQueue = () => {
  const { user } = useAuth();
  const [allEssays, setAllEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [courses, setCourses] = useState([]);
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy] = useState('oldest');
  const [search, setSearch] = useState('');
  const [filterPrompt, setFilterPrompt] = useState('all');
  const navigate = useNavigate();

  const deleteEssay = async (essayId, studentName) => {
    if (!window.confirm(`Deletar permanentemente a redação de "${studentName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/essays/${essayId}`, { withCredentials: true });
      setAllEssays(prev => prev.filter(e => e.id !== essayId));
      toast.success('Redação deletada.');
    } catch (e) {
      toast.error('Erro: ' + (e.response?.data?.detail || e.message));
    }
  };

  useEffect(() => {
    fetchAll();
    axios.get(`${API_URL}/api/settings/course`, { withCredentials: true })
      .then(r => { if (r.data.correction_deadline_days > 0) setDeadlineDays(r.data.correction_deadline_days); })
      .catch(() => {});
    axios.get(`${API_URL}/api/courses`, { withCredentials: true })
      .then(r => setCourses(r.data || []))
      .catch(() => {});
  }, []);

  const fetchAll = async () => {
    try {
      let data = [];
      try {
        const res = await axios.get(`${API_URL}/api/essays/all-teacher`, { withCredentials: true });
        data = res.data;
      } catch {
        const res = await axios.get(`${API_URL}/api/essays/queue`, { withCredentials: true });
        data = res.data;
      }
      setAllEssays(data.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)));
    } catch (err) {
      console.error('Error loading queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const byStatus = useMemo(() => ({
    pending:     allEssays.filter(e => e.status === 'pending'),
    in_progress: allEssays.filter(e => e.status === 'in_progress'),
    corrected:   allEssays.filter(e => e.status === 'corrected').reverse(),
  }), [allEssays]);

  const promptOptions = useMemo(() =>
    [...new Set(allEssays.map(e => e.prompt_title).filter(Boolean))],
  [allEssays]);

  const currentList = byStatus[activeTab] || [];

  const filtered = useMemo(() => currentList.filter(e => {
    const matchSearch = (e.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.prompt_title || '').toLowerCase().includes(search.toLowerCase());
    const matchPrompt = filterPrompt === 'all' || e.prompt_title === filterPrompt;
    return matchSearch && matchPrompt;
  }), [currentList, search, filterPrompt]);

  const urgentCount = byStatus.pending.filter(e => getWaitTime(e.submitted_at, deadlineDays).urgent).length;

  const selectStyle = {
    padding: '6px 10px', borderRadius: '8px',
    border: '1px solid #E8DDD0', fontSize: '13px',
    color: '#2C1A0E', backgroundColor: '#FFF', outline: 'none',
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1
            className="font-heading font-bold"
            style={{ fontSize: '28px', color: '#7C1805', letterSpacing: '-0.02em' }}
            data-testid="correction-queue-title"
          >
            Correções
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '13px', color: '#6B5B4E' }}>
              {byStatus.pending.length} pendente{byStatus.pending.length !== 1 ? 's' : ''}
              {byStatus.in_progress.length > 0 && ` · ${byStatus.in_progress.length} em andamento`}
            </p>
            {urgentCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11.5px', fontWeight: 600, padding: '2px 9px', borderRadius: '99px',
                backgroundColor: '#FEF2F2', color: '#7C1805', border: '1px solid #7C180533',
              }}>
                <AlertCircle size={12} />
                {urgentCount} atrasada{urgentCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '10px', backgroundColor: '#F0EBE3', width: 'fit-content' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '7px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
                backgroundColor: activeTab === tab.key ? '#7C1805' : 'transparent',
                color: activeTab === tab.key ? '#FDF3E8' : '#6B5B4E',
                transition: 'all 0.15s',
              }}
            >
              <tab.Icon size={14} />
              {tab.label}
              <span style={{
                fontSize: '11px', padding: '1px 6px', borderRadius: '99px',
                backgroundColor: activeTab === tab.key ? 'rgba(253,243,232,0.25)' : '#E8DDD0',
                color: activeTab === tab.key ? '#FDF3E8' : '#6B5B4E',
              }}>
                {byStatus[tab.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <Card
          className="bg-white border"
          style={{ padding: '12px 14px', borderRadius: '12px', borderColor: '#E8DDD0' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {/* Busca */}
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6B5B4E' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar aluno ou proposta..."
                style={{
                  width: '100%', padding: '7px 10px 7px 30px',
                  borderRadius: '8px', border: '1px solid #E8DDD0',
                  fontSize: '13px', color: '#2C1A0E', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {promptOptions.length > 1 && (
              <select value={filterPrompt} onChange={e => setFilterPrompt(e.target.value)} style={{ ...selectStyle, maxWidth: '200px' }}>
                <option value="all">Todas as propostas</option>
                {promptOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            {courses.length > 0 && (
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ ...selectStyle, maxWidth: '180px' }}>
                <option value="all">Todas as turmas</option>
                {courses.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...selectStyle, maxWidth: '180px' }}>
              <option value="oldest">Mais antigas primeiro</option>
              <option value="newest">Mais recentes primeiro</option>
              <option value="name">Por nome do aluno</option>
            </select>

            {(search || filterPrompt !== 'all' || filterCourse !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilterPrompt('all'); setFilterCourse('all'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px',
                  backgroundColor: '#FDF3E8', color: '#7C1805', border: '1px solid #D66B27', cursor: 'pointer',
                }}
              >
                ✕ Limpar
              </button>
            )}

            {filtered.length !== currentList.length && (
              <span style={{ fontSize: '12px', color: '#6B5B4E', marginLeft: 'auto' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </Card>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center bg-white" style={{ borderRadius: '14px' }}>
            <FileText size={40} className="mx-auto mb-3" style={{ color: '#D66B27' }} />
            <p style={{ color: '#6B5B4E' }}>
              {currentList.length === 0
                ? activeTab === 'pending' ? 'Nenhuma redação pendente 🎉' : 'Nenhuma redação aqui'
                : 'Nenhum resultado encontrado'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(essay => {
              const wait = getWaitTime(essay.submitted_at, deadlineDays);
              return (
                <Card
                  key={essay.id}
                  className="bg-white border"
                  style={{
                    padding: '18px 20px',
                    borderRadius: '14px',
                    borderColor: wait.urgent ? '#7C180533' : '#E8DDD0',
                    boxShadow: '0 1px 4px rgba(44,26,14,0.05)',
                    borderLeft: wait.urgent ? '3px solid #7C1805' : undefined,
                    transition: 'box-shadow 0.15s',
                  }}
                  data-testid={`queue-essay-${essay.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <h3 className="font-heading font-semibold" style={{ fontSize: '15px', color: '#2C1A0E' }}>
                          {essay.prompt_title || 'Redação'}
                        </h3>
                        {essay.is_rewrite && (
                          <span style={{
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                            backgroundColor: '#FFF0E0', color: '#D66B27', border: '1px solid #D66B27',
                          }}>
                            ✏️ Reescrita
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12.5px', color: '#6B5B4E' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={13} /> {essay.student_name || 'Aluno'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          {essay.submitted_at ? new Date(essay.submitted_at).toLocaleDateString('pt-BR') : ''}
                        </span>
                        <span>{METHOD_LABEL[essay.submission_method] || essay.submission_method || ''}</span>
                        {activeTab === 'pending' && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
                            color: wait.urgent ? '#7C1805' : '#6B5B4E',
                          }}>
                            <AlertCircle size={13} />
                            Esperando {wait.label || ''}
                            {wait.urgent && ' ⚠️'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {essay.status === 'corrected' ? (
                        <button
                          onClick={() => navigate(`/essay/${essay.id}/correction`)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                            backgroundColor: 'transparent', color: '#6B5B4E',
                            border: '1px solid #E8DDD0', fontSize: '12.5px', fontWeight: 600,
                          }}
                        >
                          <History size={14} /> Ver correção
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/correct-essay/${essay.id}`)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            backgroundColor: essay.status === 'in_progress' ? '#D66B27' : '#36555A',
                            color: '#FDF3E8', fontSize: '12.5px', fontWeight: 600,
                          }}
                          data-testid={`correct-button-${essay.id}`}
                        >
                          <Edit3 size={14} />
                          {essay.status === 'in_progress' ? 'Continuar' : 'Corrigir'}
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEssay(essay.id, essay.student_name || 'aluno')}
                          title="Deletar redação"
                          style={{ color: '#DC2626', padding: '6px 8px' }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
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
