import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FileText, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getStatusBadge = (status) => {
  const statusMap = {
    pending: { label: 'Pendente', bg: '#F3F4F6', text: '#4B5563' },
    under_review: { label: 'Em Revisão', bg: '#FEF3C7', text: '#92400E' },
    corrected: { label: 'Corrigida', bg: '#D1FAE5', text: '#065F46' },
  };
  const config = statusMap[status] || statusMap.pending;
  return (
    <Badge style={{ backgroundColor: config.bg, color: config.text }} data-testid={`status-badge-${status}`}>
      {config.label}
    </Badge>
  );
};

export const MyEssays = () => {
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEssays();
  }, []);

  const fetchEssays = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/essays/my`, { withCredentials: true });
      setEssays(data);
    } catch (error) {
      console.error('Error fetching essays:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="font-heading font-black text-4xl" style={{ color: '#002147' }} data-testid="my-essays-title">
            Minhas Redações
          </h1>
          <p className="text-lg mt-2 text-slate-600">Acompanhe suas redações e correções</p>
        </div>

        {essays.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <FileText size={48} className="mx-auto mb-4" style={{ color: '#525252' }} />
            <p className="text-lg text-slate-600 mb-4">Você ainda não enviou nenhuma redação</p>
            <a
              href="/prompts"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-white"
              style={{ backgroundColor: '#002147' }}
              data-testid="write-first-essay-button"
            >
              Escrever Primeira Redação
            </a>
          </Card>
        ) : (
          <div className="space-y-4">
            {essays.map((essay) => (
              <Card
                key={essay.id}
                className="p-6 bg-white border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (essay.status === 'corrected') {
                    navigate(`/essay/${essay.id}/correction`);
                  }
                }}
                data-testid={`essay-card-${essay.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading text-xl font-semibold" style={{ color: '#002147' }}>
                        {essay.prompt_title || 'Redação'}
                      </h3>
                      {getStatusBadge(essay.status)}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Clock size={14} />
                      Enviada em {new Date(essay.submitted_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(essay.submitted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Método: {essay.submission_method === 'editor' ? 'Editor' : essay.submission_method === 'paste' ? 'Texto colado' : 'Upload de arquivo'}</p>
                  </div>
                  {essay.status === 'corrected' && (
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: '#525252' }}>
                        NOTA DISPONÍVEL
                      </p>
                      <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                        Ver Correção
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};