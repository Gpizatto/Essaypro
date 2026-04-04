import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Clock, User } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CorrectionQueue = () => {
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/essays/queue`, { withCredentials: true });
      setEssays(data);
    } catch (error) {
      console.error('Error fetching queue:', error);
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
          <h1 className="font-heading font-black text-4xl" style={{ color: '#002147' }} data-testid="correction-queue-title">
            Fila de Correções
          </h1>
          <p className="text-lg mt-2 text-slate-600">Redações aguardando correção</p>
        </div>

        {essays.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <FileText size={48} className="mx-auto mb-4" style={{ color: '#525252' }} />
            <p className="text-lg text-slate-600">Nenhuma redação pendente</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {essays.map((essay) => (
              <Card key={essay.id} className="p-6 bg-white border shadow-sm hover:shadow-md transition-shadow" data-testid={`queue-essay-${essay.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold mb-2" style={{ color: '#002147' }}>
                      {essay.prompt_title || 'Redação'}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {essay.student_name || 'Aluno'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Enviada em {new Date(essay.submitted_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span>
                        Método: {essay.submission_method === 'editor' ? 'Editor' : essay.submission_method === 'paste' ? 'Texto' : 'Upload'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/correct-essay/${essay.id}`)}
                    style={{ backgroundColor: '#6B21A8' }}
                    data-testid={`correct-button-${essay.id}`}
                  >
                    Corrigir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};