import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const PromptsList = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/prompts`, { withCredentials: true });
      setPrompts(data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded"></div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-black text-4xl" style={{ color: '#002147' }} data-testid="prompts-title">
            Temas Disponíveis
          </h1>
          <p className="text-lg mt-2 text-slate-600">Escolha um tema e escreva sua redação</p>
        </div>

        {prompts.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <BookOpen size={48} className="mx-auto mb-4" style={{ color: '#525252' }} />
            <p className="text-lg text-slate-600">Nenhum tema disponível no momento</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {prompts.map((prompt) => (
              <Card key={prompt.id} className="p-6 bg-white border shadow-sm hover:shadow-md transition-shadow" data-testid={`prompt-card-${prompt.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold mb-2" style={{ color: '#002147' }}>
                      {prompt.title}
                    </h3>
                    <p className="text-slate-700 mb-4 leading-relaxed">{prompt.theme}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(prompt.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/submit-essay/${prompt.id}`)}
                    style={{ backgroundColor: '#002147' }}
                    data-testid={`submit-essay-button-${prompt.id}`}
                  >
                    Escrever Redação
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