import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
  const [criteria, setCriteria] = useState(CRITERIA_MODELS.enem.criteria);

  const handleModelChange = (modelKey) => {
    setSelectedModel(modelKey);
    setCriteria(JSON.parse(JSON.stringify(CRITERIA_MODELS[modelKey].criteria)));
  };

  const handleAddCriterion = () => {
    const newId = `c${criteria.length + 1}`;
    setCriteria([...criteria, {
      id: newId,
      nome: '',
      descricao: '',
      peso_maximo: 200
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
          <h1 className="font-heading font-black text-4xl" style={{ color: '#002147' }} data-testid="create-prompt-title">
            Criar Novo Tema
          </h1>
          <p className="text-lg mt-2 text-slate-600">Adicione um novo tema de redação para os alunos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-prompt-form">
          <Card className="p-8 bg-white border">
            <h3 className="font-semibold text-lg mb-4" style={{ color: '#002147' }}>Informações do Tema</h3>
            
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
              <Label htmlFor="criteria-model" className="text-base font-semibold mb-3 block">Selecione um Modelo de Critérios</Label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="w-full" data-testid="criteria-model-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITERIA_MODELS).map(([key, model]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <p className="font-semibold">{model.name}</p>
                        <p className="text-xs text-slate-500">{model.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg" style={{ color: '#002147' }}>Critérios de Avaliação</h3>
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
                <Card key={index} className="p-4 border" style={{ backgroundColor: '#F9F8F6' }} data-testid={`criterion-${index}`}>
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
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: '#E0E7FF' }}>
              <p className="text-sm font-semibold" style={{ color: '#002147' }}>
                Pontuação Total: {criteria.reduce((sum, c) => sum + c.peso_maximo, 0)} pontos
              </p>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#002147' }}
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
