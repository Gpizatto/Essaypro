import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileText, Clock, User, Search, AlertCircle, CheckCircle2, Edit3, History } from 'lucide-react';

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

const STATUS_MAP = {
  pending:     { label: 'Enviada',      bg: '#6B5B4E', icon: '📤' },
  in_progress: { label: 'Em correção',  bg: '#D66B27', icon: '✏️' },
  corrected:   { label: 'Corrigida',    bg: '#36555A', icon: '✅' },
  returned:    { label: 'Devolvida',    bg: '#DAB257', icon: '↩️' },
};

const STATUS_TABS = [
  { key: 'pending',     label: 'Enviadas',     icon: Clock,         color: '#6B5B4E' },
  { key: 'in_progress', label: 'Em correção',  icon: Edit3,         color: '#D66B27' },
  { key: 'corrected',   label: 'Concluídas',   icon: CheckCircle2,  color: '#36555A' },
];

const METHOD_LABEL = { editor: 'Editor', paste: 'Colado', upload: 'Upload' };

export const CorrectionQueue = () => {
  const [allEssays, setAllEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [courses, setCourses] = useState([]);
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy] = useState('oldest');
  const [selectedEssays, setSelectedEssays] = useState(new Set());
  const [showBatchComment, setShowBatchComment] = useState(false);
  const [batchCommentText, setBatchCommentText] = useState('');
  const [sendingBatch, setSendingBatch] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPrompt, setFilterPrompt] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
    axios.get(`${API_URL}/api/settings/course`, { withCredentials: true })
      .then(r => { if (r.data.correction_deadline_days > 0) setDeadlineDays(r.data.correction_deadline_days); })
      .catch(() => {});
    axios.get(`${API_URL}/api/courses`, { withCredentials: true })
      .then(r => setCourses(r.data || []))
      .catch(() => {});
  }, []);

  const sendBatchComment = async () => {
    if (!batchCommentText.trim() || selectedEssays.size === 0) return;
    setSendingBatch(true);
    try {
      await axios.post(`${API_URL}/api/corrections/batch-comment`, {
        essay_ids: Array.from(selectedEssays),
        comment: batchCommentText,
      }, { withCredentials: true });
      toast.success(`Comentário enviado para ${selectedEssays.size} redações!`);
      setSelectedEssays(new Set());
      setBatchCommentText('');
      setShowBatchComment(false);
    } catch (e) { toast.error('Erro ao enviar comentário em lote'); }
    finally { setSendingBatch(false); }
  };

  const fetchAll = async () => {
    try {
      // Tentar endpoint completo, fallback para queue básica
      let data = [];
      try {
        const res = await axios.get(`${API_URL}/api/essays/all-teacher`, { withCredentials: true });
        data = res.data;
      } catch (err) {
        // Fallback: carregar só pendentes
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
    padding: '6px 10px', borderRadius: '6px',
    border: '1px solid #E8DDD0', fontSize: '13px',
    color: '#2C1A0E', backgroundColor: '#FFF',
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }} data-testid="correction-queue-title">
            Correções
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm" style={{ color: '#6B5B4E' }}>
              {byStatus.pending.length} pendente{byStatus.pending.length !== 1 ? 's' : ''}
              {byStatus.in_progress.length > 0 && ` · ${byStatus.in_progress.length} em andamento`}
            </p>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#FEF2F2', color: '#7C1805', border: '1px solid #7C1805' }}>
                <AlertCircle size={12} />
                {urgentCount} atrasada{urgentCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: '#F0EBE3' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeTab === tab.key ? '#7C1805' : 'transparent',
                color: activeTab === tab.key ? '#FDF3E8' : '#6B5B4E',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: activeTab === tab.key ? 'rgba(253,243,232,0.25)' : '#E8DDD0',
                  color: activeTab === tab.key ? '#FDF3E8' : '#6B5B4E',
                }}>
                {byStatus[tab.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <Card className="p-3 bg-white border">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5B4E' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar aluno ou proposta..."
                style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E', outline: 'none' }} />
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
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...selectStyle, maxWidth: '160px' }}>
              <option value="oldest">Mais antigas primeiro</option>
              <option value="newest">Mais recentes primeiro</option>
              <option value="name">Por nome do aluno</option>
            </select>
            {(search || filterPrompt !== 'all' || filterCourse !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterPrompt('all'); setFilterCourse('all'); }}
                className="text-xs px-2 py-1 rounded flex items-center gap-1"
                style={{ backgroundColor: '#FDF3E8', color: '#7C1805', border: '1px solid #D66B27' }}>
                ✕ Limpar
              </button>
            )}
            {filtered.length !== currentList.length && (
              <span className="text-xs ml-auto" style={{ color: '#6B5B4E' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </Card>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center bg-white">
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
              const wait = getWaitTime(essay.submitted_at);
              return (
                <Card key={essay.id}
                  className="p-5 bg-white border shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`queue-essay-${essay.id}`}
                  style={{ borderLeft: wait.urgent ? '4px solid #7C1805' : undefined }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-heading font-semibold" style={{ color: '#7C1805' }}>
                          {essay.prompt_title || 'Redação'}
                        </h3>
                        {essay.is_rewrite && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#FFF0E0', color: '#D66B27', border: '1px solid #D66B27' }}>
                            ✏️ Reescrita
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#6B5B4E' }}>
                        <span className="flex items-center gap-1">
                          <User size={13} />
                          {essay.student_name || 'Aluno'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {new Date(essay.submitted_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span>{METHOD_LABEL[essay.submission_method] || essay.submission_method}</span>
                        {activeTab === 'pending' && (
                          <span className="flex items-center gap-1 font-semibold"
                            style={{ color: wait.urgent ? '#7C1805' : '#6B5B4E' }}>
                            <AlertCircle size={13} />
                            Esperando {wait.label}
                            {wait.urgent && ' ⚠️'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {essay.status === 'corrected' ? (
                        <Button variant="outline" size="sm"
                          onClick={() => navigate(`/correct-essay/${essay.id}`)}>
                          <History size={14} className="mr-1" /> Ver
                        </Button>
                      ) : (
                        <Button size="sm"
                          onClick={() => navigate(`/correct-essay/${essay.id}`)}
                          style={{ backgroundColor: essay.status === 'in_progress' ? '#D66B27' : '#36555A' }}
                          data-testid={`correct-button-${essay.id}`}>
                          <Edit3 size={14} className="mr-1" />
                          {essay.status === 'in_progress' ? 'Continuar' : 'Corrigir'}
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
