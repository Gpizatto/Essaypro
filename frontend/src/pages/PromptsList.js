import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Calendar, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const PromptsList = () => {
  const [prompts, setPrompts] = useState([]);
  const [myEssays, setMyEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | pending | done
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/api/prompts`, { withCredentials: true }),
      axios.get(`${API_URL}/api/essays/my`, { withCredentials: true }).catch(() => ({ data: [] })),
    ]).then(([promptsRes, essaysRes]) => {
      setPrompts(promptsRes.data || []);
      setMyEssays(essaysRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Mapear prompt_id → essays do aluno
  const essaysByPrompt = {};
  myEssays.forEach(e => {
    if (!essaysByPrompt[e.prompt_id]) essaysByPrompt[e.prompt_id] = [];
    essaysByPrompt[e.prompt_id].push(e);
  });

  const getPromptStatus = (promptId) => {
    const essays = essaysByPrompt[promptId] || [];
    if (essays.length === 0) return 'pending';
    const latest = essays[essays.length - 1];
    if (latest.status === 'corrected') return 'corrected';
    return 'submitted';
  };

  const filteredPrompts = prompts.filter(p => {
    if (filter === 'pending') return getPromptStatus(p.id) === 'pending';
    if (filter === 'done') return getPromptStatus(p.id) !== 'pending';
    return true;
  });

  const pendingCount = prompts.filter(p => getPromptStatus(p.id) === 'pending').length;
  const doneCount = prompts.filter(p => getPromptStatus(p.id) !== 'pending').length;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-black text-4xl" style={{ color: '#7C1805' }} data-testid="prompts-title">
            Temas Disponíveis
          </h1>
          <p className="text-lg mt-2 text-slate-600">Escolha um tema e escreva sua redação</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: `Todos (${prompts.length})` },
            { key: 'pending', label: `Pendentes (${pendingCount})` },
            { key: 'done', label: `Enviados (${doneCount})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: filter === f.key ? '#7C1805' : 'white',
                color: filter === f.key ? 'white' : '#6B5B4E',
                border: `1px solid ${filter === f.key ? '#7C1805' : '#E8DDD0'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {filteredPrompts.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <BookOpen size={48} className="mx-auto mb-4" style={{ color: '#525252' }} />
            <p className="text-lg text-slate-600">Nenhum tema encontrado</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPrompts.map(prompt => {
              const status = getPromptStatus(prompt.id);
              const essays = essaysByPrompt[prompt.id] || [];
              const latest = essays[essays.length - 1];
              const isPending = status === 'pending';
              const isCorrected = status === 'corrected';
              const isSubmitted = status === 'submitted';

              return (
                <Card key={prompt.id}
                  className="p-6 bg-white border shadow-sm transition-shadow"
                  style={{
                    borderLeft: `4px solid ${isCorrected ? '#36555A' : isSubmitted ? '#D66B27' : '#7C1805'}`,
                    opacity: 1,
                  }}
                  data-testid={`prompt-card-${prompt.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-heading text-xl font-semibold" style={{ color: '#7C1805' }}>
                          {prompt.title}
                        </h3>
                        {/* Badge de status */}
                        {isCorrected && (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: '#EAF3DE', color: '#27500A' }}>
                            <CheckCircle size={12} /> Corrigida
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: '#FFF0E0', color: '#7C3A00' }}>
                            <Clock size={12} /> Aguardando correção
                          </span>
                        )}
                      </div>

                      <p className="text-slate-700 mb-3 leading-relaxed">{prompt.theme}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(prompt.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {latest && (
                          <span className="text-xs" style={{ color: '#6B5B4E' }}>
                            Enviada em {new Date(latest.submitted_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {essays.length > 1 && (
                          <span className="text-xs" style={{ color: '#D66B27' }}>
                            {essays.length} tentativas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botão de ação */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {isPending && (
                        <Button
                          onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                          style={{ backgroundColor: '#7C1805' }}
                          data-testid={`submit-essay-button-${prompt.id}`}>
                          Escrever Redação
                        </Button>
                      )}
                      {isSubmitted && (
                        <div className="text-center">
                          <p className="text-xs mb-1 font-semibold" style={{ color: '#D66B27' }}>
                            ⏳ Aguardando correção
                          </p>
                          <Button variant="outline" size="sm"
                            onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                            style={{ borderColor: '#D66B27', color: '#D66B27', fontSize: '12px' }}>
                            <RefreshCw size={12} className="mr-1" /> Reescrever
                          </Button>
                        </div>
                      )}
                      {isCorrected && (
                        <div className="flex flex-col gap-1">
                          <Button size="sm"
                            onClick={() => navigate(`/essay/${latest.id}/correction`)}
                            style={{ backgroundColor: '#36555A' }}>
                            <CheckCircle size={14} className="mr-1" /> Ver Correção
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                            style={{ borderColor: '#7C1805', color: '#7C1805', fontSize: '12px' }}>
                            <RefreshCw size={12} className="mr-1" /> Reescrever
                          </Button>
                        </div>
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
