import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { CRITERIA_MODELS } from '../utils/criteriaModels';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CreatePrompt = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('enem');
  const [formData, setFormData] = useState({
    title: '',
    theme: '',
    supporting_texts: '',
    instructions: '',
  });
  const [criteria, setCriteria] = useState(() => {
    return CRITERIA_MODELS.enem.criteria.map(c => ({
      ...c,
      level_descriptions: c.level_descriptions || [],
    }));
  });
  const [showLevels, setShowLevels] = useState({});

  const handleModelChange = (modelKey) => {
    setSelectedModel(modelKey);
    const modelCriteria = JSON.parse(JSON.stringify(CRITERIA_MODELS[modelKey].criteria));
    // Garantir que todos os critérios têm level_descriptions
    modelCriteria.forEach(c => {
      if (!c.level_descriptions) {
        c.level_descriptions = buildEmptyLevels(c.peso_maximo);
      }
    });
    setCriteria(modelCriteria);
  };

  // Gera array de níveis vazio com base no peso_maximo
  const buildEmptyLevels = (pesoMaximo) => {
    const levels = [];
    for (let v = 0; v <= pesoMaximo; v += 40) {
      levels.push({ pontuacao: v, proficiencia: '', descricao: '' });
    }
    return levels;
  };

  const handleAddCriterion = () => {
    const newId = `c${criteria.length + 1}`;
    setCriteria([...criteria, {
      id: newId,
      nome: '',
      descricao: '',
      peso_maximo: 200,
      level_descriptions: buildEmptyLevels(200),
    }]);
  };

  const handleRemoveCriterion = (index) => {
    if (criteria.length <= 1) {
      toast.error('Deve haver pelo menos um critério');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index, field, value) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    // Se mudou o peso_maximo, reconstruir níveis mantendo descrições existentes
    if (field === 'peso_maximo' && !isNaN(value) && value > 0) {
      const existing = updated[index].level_descriptions || [];
      const newLevels = [];
      for (let v = 0; v <= value; v += 40) {
        const prev = existing.find(l => l.pontuacao === v);
        newLevels.push(prev || { pontuacao: v, proficiencia: '', descricao: '' });
      }
      updated[index].level_descriptions = newLevels;
    }
    setCriteria(updated);
  };

  const handleLevelChange = (criterionIndex, levelIndex, field, value) => {
    const updated = [...criteria];
    const levels = [...(updated[criterionIndex].level_descriptions || [])];
    levels[levelIndex] = { ...levels[levelIndex], [field]: value };
    updated[criterionIndex] = { ...updated[criterionIndex], level_descriptions: levels };
    setCriteria(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar critérios
    for (const criterion of criteria) {
      if (!criterion.nome.trim() || !criterion.descricao.trim()) {
        toast.error('Preencha nome e descrição de todos os critérios');
        return;
      }
      if (criterion.peso_maximo < 40 || criterion.peso_maximo > 400 || criterion.peso_maximo % 40 !== 0) {
        toast.error('Peso máximo deve ser múltiplo de 40 entre 40 e 400');
        return;
      }
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/prompts`, {
        ...formData,
        criteria
      }, { withCredentials: true });
      toast.success('Tema criado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Erro ao criar tema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-heading font-black text-4xl" style={{ color: '#7C1805' }} data-testid="create-prompt-title">
            Criar Novo Tema
          </h1>
          <p className="text-lg mt-2 text-slate-600">Adicione um novo tema de redação para os alunos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-prompt-form">
          <Card className="p-8 bg-white border">
            <h3 className="font-semibold text-lg mb-4" style={{ color: '#7C1805' }}>Informações do Tema</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título do Tema</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex: Desafios da educação digital no Brasil"
                  className="mt-1"
                  data-testid="title-input"
                />
              </div>

              <div>
                <Label htmlFor="theme">Tema Central</Label>
                <Textarea
                  id="theme"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  required
                  rows={3}
                  placeholder="Descreva o tema central da redação..."
                  className="mt-1"
                  data-testid="theme-input"
                />
              </div>

              <div>
                <Label htmlFor="supporting-texts">Textos de Apoio</Label>
                <Textarea
                  id="supporting-texts"
                  value={formData.supporting_texts}
                  onChange={(e) => setFormData({ ...formData, supporting_texts: e.target.value })}
                  required
                  rows={6}
                  placeholder="Adicione os textos motivadores..."
                  className="mt-1"
                  data-testid="supporting-texts-input"
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instruções</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  required
                  rows={4}
                  placeholder="Com base nos textos motivadores e em seus conhecimentos, redija um texto dissertativo-argumentativo..."
                  className="mt-1"
                  data-testid="instructions-input"
                />
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-white border">
            <div className="mb-6">
              <Label className="text-base font-semibold mb-3 block">Selecione um Modelo de Critérios</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="criteria-model-select">
                {Object.entries(CRITERIA_MODELS).map(([key, model]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleModelChange(key)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedModel === key ? '2px solid #7C1805' : '1px solid #E8DDD0',
                      backgroundColor: selectedModel === key ? '#7C1805' : '#FFF',
                      color: selectedModel === key ? '#FDF3E8' : '#2C1A0E',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <p className="text-sm font-semibold">{model.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: selectedModel === key ? 'rgba(253,243,232,0.75)' : '#6B5B4E' }}>
                      {model.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg" style={{ color: '#7C1805' }}>Critérios de Avaliação</h3>
              <Button
                type="button"
                onClick={handleAddCriterion}
                variant="outline"
                size="sm"
                data-testid="add-criterion-button"
              >
                <Plus size={16} className="mr-2" />
                Adicionar Critério
              </Button>
            </div>

            <div className="space-y-6">
              {criteria.map((criterion, index) => (
                <Card key={index} className="p-4 border" style={{ backgroundColor: '#FDF3E8' }} data-testid={`criterion-${index}`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Label className="text-sm font-semibold">Critério {index + 1}</Label>
                      {criteria.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => handleRemoveCriterion(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`remove-criterion-${index}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`criterion-nome-${index}`} className="text-xs">Nome do Critério</Label>
                      <Input
                        id={`criterion-nome-${index}`}
                        value={criterion.nome}
                        onChange={(e) => handleCriterionChange(index, 'nome', e.target.value)}
                        required
                        placeholder="Ex: Competência 1 — Domínio da Norma Culta"
                        className="mt-1"
                        data-testid={`criterion-nome-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`criterion-descricao-${index}`} className="text-xs">Descrição</Label>
                      <Textarea
                        id={`criterion-descricao-${index}`}
                        value={criterion.descricao}
                        onChange={(e) => handleCriterionChange(index, 'descricao', e.target.value)}
                        required
                        rows={2}
                        placeholder="Descreva o que será avaliado neste critério..."
                        className="mt-1"
                        data-testid={`criterion-descricao-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`criterion-peso-${index}`} className="text-xs">Pontuação Máxima (múltiplo de 40)</Label>
                      <Input
                        id={`criterion-peso-${index}`}
                        type="number"
                        value={criterion.peso_maximo}
                        onChange={(e) => handleCriterionChange(index, 'peso_maximo', parseInt(e.target.value))}
                        required
                        min={40}
                        max={400}
                        step={40}
                        className="mt-1"
                        data-testid={`criterion-peso-${index}`}
                      />
                    </div>

                    {/* Descrições por nível */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowLevels(prev => ({ ...prev, [index]: !prev[index] }))}
                        className="text-xs font-semibold flex items-center gap-1 mt-1"
                        style={{ color: '#D66B27', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {showLevels[index] ? '▲' : '▼'} Descrições por nível ({criterion.level_descriptions?.length || 0} níveis)
                      </button>

                      {showLevels[index] && (
                        <div className="mt-2 space-y-3">
                          <p className="text-xs" style={{ color: '#6B5B4E' }}>
                            Preencha o nome e a descrição de cada nível de pontuação. Serão exibidos para o corretor durante a avaliação.
                          </p>
                          {(criterion.level_descriptions || []).map((level, li) => (
                            <div key={li} className="p-3 rounded-lg border" style={{ backgroundColor: '#FFF', borderColor: '#E8DDD0' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#7C1805', color: '#FFF' }}>
                                  {level.pontuacao} pts
                                </span>
                                <Input
                                  value={level.proficiencia}
                                  onChange={(e) => handleLevelChange(index, li, 'proficiencia', e.target.value)}
                                  placeholder={`Ex: Nível ${li} — Bom domínio`}
                                  className="flex-1 h-7 text-xs"
                                />
                              </div>
                              <Textarea
                                value={level.descricao}
                                onChange={(e) => handleLevelChange(index, li, 'descricao', e.target.value)}
                                placeholder="Descreva o que caracteriza este nível de desempenho..."
                                rows={2}
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: '#E0E7FF' }}>
              <p className="text-sm font-semibold" style={{ color: '#7C1805' }}>
                Pontuação Total: {criteria.reduce((sum, c) => sum + c.peso_maximo, 0)} pontos
              </p>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#7C1805' }}
              data-testid="submit-prompt-button"
            >
              {loading ? 'Criando...' : 'Criar Tema'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} data-testid="cancel-button">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
