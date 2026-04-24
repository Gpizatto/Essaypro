import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Calendar, CheckCircle, Clock, RefreshCw, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const PromptsList = () => {
  const [prompts, setPrompts] = useState([]);
  const [myEssays, setMyEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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
          <h1
            className="font-heading font-black"
            style={{ fontSize: '28px', color: '#7C1805', letterSpacing: '-0.02em' }}
            data-testid="prompts-title"
          >
            Temas Disponíveis
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            Escolha um tema e escreva sua redação
          </p>
        </div>

        {/* Filtros como pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `Todos (${prompts.length})` },
            { key: 'pending', label: `Pendentes (${pendingCount})` },
            { key: 'done', label: `Enviados (${doneCount})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: filter === f.key ? '#7C1805' : '#FFFFFF',
                color: filter === f.key ? '#FFFFFF' : '#6B5B4E',
                boxShadow: filter === f.key ? 'none' : '0 1px 3px rgba(44,26,14,0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredPrompts.length === 0 ? (
          <Card className="p-12 text-center bg-white" style={{ borderRadius: '14px' }}>
            <BookOpen size={48} className="mx-auto mb-4" style={{ color: '#D66B27' }} />
            <p className="text-lg" style={{ color: '#6B5B4E' }}>Nenhum tema encontrado</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPrompts.map(prompt => {
              const status = getPromptStatus(prompt.id);
              const essays = essaysByPrompt[prompt.id] || [];
              const latest = essays[essays.length - 1];
              const isPending = status === 'pending';
              const isCorrected = status === 'corrected';
              const isSubmitted = status === 'submitted';

              return (
                <Card
                  key={prompt.id}
                  className="bg-white border"
                  style={{
                    borderRadius: '14px',
                    padding: '20px 20px',
                    boxShadow: '0 1px 4px rgba(44,26,14,0.05)',
                    borderColor: '#E8DDD0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                  data-testid={`prompt-card-${prompt.id}`}
                >
                  {/* Cabeçalho */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <h3
                          className="font-heading font-bold"
                          style={{ fontSize: '15px', color: '#2C1A0E' }}
                        >
                          {prompt.title}
                        </h3>
                        {isCorrected && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '99px',
                            backgroundColor: '#EAF3DE', color: '#27500A',
                          }}>
                            <CheckCircle size={11} /> Corrigida
                          </span>
                        )}
                        {isSubmitted && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '99px',
                            backgroundColor: '#FFF0E0', color: '#7C3A00',
                          }}>
                            <Clock size={11} /> Aguardando correção
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#6B5B4E', lineHeight: 1.6 }}>
                        {prompt.theme}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé: metadata + botão */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: '#6B5B4E', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        {new Date(prompt.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {latest && (
                        <span>
                          Enviada em {new Date(latest.submitted_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {essays.length > 1 && (
                        <span style={{ color: '#D66B27', fontWeight: 600 }}>
                          {essays.length} tentativas
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {isPending && (
                        <button
                          onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            backgroundColor: '#7C1805', color: '#FDF3E8',
                            fontSize: '12px', fontWeight: 600,
                            transition: 'opacity 0.15s',
                          }}
                          data-testid={`submit-essay-button-${prompt.id}`}
                        >
                          <PenLine size={13} /> Escrever Redação
                        </button>
                      )}
                      {isSubmitted && (
                        <button
                          onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                            backgroundColor: 'transparent', color: '#D66B27',
                            fontSize: '12px', fontWeight: 600,
                            border: '1px solid #D66B27',
                          }}
                        >
                          <RefreshCw size={12} /> Reescrever
                        </button>
                      )}
                      {isCorrected && (
                        <>
                          <button
                            onClick={() => navigate(`/essay/${latest.id}/correction`)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                              backgroundColor: '#36555A', color: '#FDF3E8',
                              fontSize: '12px', fontWeight: 600,
                            }}
                          >
                            <CheckCircle size={13} /> Ver Correção
                          </button>
                          <button
                            onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                              backgroundColor: 'transparent', color: '#7C1805',
                              fontSize: '12px', fontWeight: 600,
                              border: '1px solid #7C1805',
                            }}
                          >
                            <RefreshCw size={12} /> Reescrever
                          </button>
                        </>
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
