import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, Save, BookMarked, Copy } from 'lucide-react';
import { CRITERIA_MODELS } from '../utils/criteriaModels';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CreatePrompt = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [existingPrompts, setExistingPrompts] = useState([]);
  const [showCopyGrade, setShowCopyGrade] = useState(false);
  const [copyGradeSource, setCopyGradeSource] = useState('');
  const fileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  const [selectedModel, setSelectedModel] = useState('enem');
  const [savedModels, setSavedModels] = useState([]);
  const [showSaveModelModal, setShowSaveModelModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [savingModel, setSavingModel] = useState(false);

  const [formData, setFormData] = useState({
    title: '', theme: '', course_ids: [],
    supporting_texts: '', instructions: '',
    start_date: '', end_date: '', supporting_files: [],
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [criteria, setCriteria] = useState(() =>
    CRITERIA_MODELS.enem.criteria.map(c => ({ ...c, level_descriptions: c.level_descriptions || [] }))
  );
  const [showLevels, setShowLevels] = useState({});

  useEffect(() => {
    axios.get(`${API_URL}/api/courses`, { withCredentials: true })
      .then(r => setAvailableCourses(r.data || [])).catch(() => {});
    axios.get(`${API_URL}/api/prompts/all`, { withCredentials: true })
      .then(r => setExistingPrompts(r.data || [])).catch(() => {});
    axios.get(`${API_URL}/api/users/criteria-models`, { withCredentials: true })
      .then(r => setSavedModels(r.data.criteria_models || [])).catch(() => {});
    axios.get(`${API_URL}/api/prompts/draft`, {
      withCredentials: true,
      validateStatus: s => s === 200 || s === 404,
    }).then(r => {
      if (r.status === 200 && r.data) {
        const d = r.data;
        if (d.formData) setFormData(d.formData);
        if (d.criteria) setCriteria(d.criteria);
        if (d.selectedModel) setSelectedModel(d.selectedModel);
        setDraftLoaded(true);
        toast.info('Rascunho carregado — continue de onde parou!', { duration: 4000 });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!formData.title && !formData.supporting_texts && !formData.instructions) return;
      setAutoSaveStatus('saving');
      try {
        await axios.post(`${API_URL}/api/prompts/draft`, { formData, criteria, selectedModel }, { withCredentials: true });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      } catch { setAutoSaveStatus(''); }
    }, 60000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, criteria, selectedModel]);

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      await axios.post(`${API_URL}/api/prompts/draft`, { formData, criteria, selectedModel }, { withCredentials: true });
      setDraftSaved(true);
      toast.success('Rascunho salvo! Continue depois sem perder o progresso.');
      setTimeout(() => setDraftSaved(false), 3000);
    } catch { toast.error('Erro ao salvar rascunho'); }
    finally { setSavingDraft(false); }
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [formData, criteria, selectedModel]);

  const buildEmptyLevels = (pesoMaximo) => {
    const levels = [];
    const step = pesoMaximo <= 10 ? 1 : pesoMaximo <= 50 ? 5 : 40;
    for (let v = 0; v <= pesoMaximo; v += step)
      levels.push({ pontuacao: Math.round(v * 100) / 100, proficiencia: '', descricao: '' });
    return levels;
  };

  const handleCopyGrade = () => {
    if (!copyGradeSource) return;
    const source = existingPrompts.find(p => p.id === copyGradeSource);
    if (!source?.criteria?.length) { toast.error('Proposta sem critérios'); return; }
    const loaded = JSON.parse(JSON.stringify(source.criteria));
    loaded.forEach(c => { if (!c.level_descriptions) c.level_descriptions = buildEmptyLevels(c.peso_maximo); });
    setCriteria(loaded);
    setSelectedModel('copied');
    setShowCopyGrade(false);
    setCopyGradeSource('');
    toast.success(`Grade de "${source.title}" copiada!`);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, supporting_texts: prev.supporting_texts ? prev.supporting_texts + '\n\n' + ev.target.result : ev.target.result }));
        toast.success('Arquivo importado!');
      };
      reader.readAsText(file, 'UTF-8');
    } else if (ext === 'pdf' || ['jpg','jpeg','png'].includes(ext)) {
      setUploadingFile(true);
      try {
        const fd = new FormData(); fd.append('file', file);
        const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd, credentials: 'include' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Erro ${res.status}`); }
        const data = await res.json();
        setFormData(prev => ({ ...prev, supporting_files: [...(prev.supporting_files || []), { name: file.name, url: data.url, type: ext === 'pdf' ? 'pdf' : 'image' }] }));
        toast.success(`${file.name} enviado!`);
      } catch (err) { toast.error('Erro: ' + err.message); }
      finally { setUploadingFile(false); }
    }
    e.target.value = '';
  };

  const removeFile = (i) => setFormData(prev => ({ ...prev, supporting_files: prev.supporting_files.filter((_, idx) => idx !== i) }));

  // #4 — Alterar peso_maximo preserva TODOS os critérios, apenas recalcula níveis do critério alterado
  const handleCriterionChange = (index, field, value) => {
    const updated = criteria.map((c, i) => {
      if (i !== index) return c; // preserva os demais critérios intactos
      const next = { ...c, [field]: value };
      if (field === 'peso_maximo' && !isNaN(value) && value > 0) {
        // Preserva TODOS os níveis existentes — apenas limita pontuações que ultrapassam o novo máximo
        const existing = c.level_descriptions || [];
        const newLevels = existing.map(l => ({
          ...l,
          pontuacao: parseFloat(l.pontuacao) > value ? value : l.pontuacao,
        }));
        next.level_descriptions = newLevels;
      }
      return next;
    });
    setCriteria(updated);
  };

  const handleModelChange = (modelKey) => {
    setSelectedModel(modelKey);
    const mc = JSON.parse(JSON.stringify(CRITERIA_MODELS[modelKey].criteria));
    mc.forEach(c => { if (!c.level_descriptions) c.level_descriptions = buildEmptyLevels(c.peso_maximo); });
    setCriteria(mc);
  };

  const handleAddCriterion = () =>
    setCriteria(prev => [...prev, { id: `c${prev.length + 1}_${Date.now()}`, nome: '', descricao: '', peso_maximo: 200, level_descriptions: buildEmptyLevels(200) }]);

  const handleRemoveCriterion = (index) => {
    if (criteria.length <= 1) { toast.error('Deve haver pelo menos um critério'); return; }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleAddLevel = (ci) => {
    const updated = [...criteria];
    const levels = [...(updated[ci].level_descriptions || [])];
    const lastPts = levels.length > 0 ? levels[levels.length - 1].pontuacao : 0;
    levels.push({ pontuacao: Math.min(lastPts + 40, updated[ci].peso_maximo), proficiencia: '', descricao: '' });
    updated[ci] = { ...updated[ci], level_descriptions: levels };
    setCriteria(updated);
  };

  // #5 — Ao remover nível, recalcula sugestões de pontuação dos restantes
  const handleRemoveLevel = (ci, li) => {
    const updated = [...criteria];
    const levels = [...(updated[ci].level_descriptions || [])];
    if (levels.length <= 1) { toast.error('Deve haver pelo menos um nível'); return; }
    levels.splice(li, 1);
    const max = updated[ci].peso_maximo;
    const count = levels.length;
    const recalculated = levels.map((l, i) => {
      // Só redistribui pontuação em níveis sem descrição (gerados automaticamente)
      if (l.proficiencia || l.descricao) return l;
      const suggested = count === 1 ? max : Math.round((max / (count - 1)) * i * 100) / 100;
      return { ...l, pontuacao: suggested };
    });
    updated[ci] = { ...updated[ci], level_descriptions: recalculated };
    setCriteria(updated);
  };

  const handleLevelChange = (ci, li, field, value) => {
    const updated = [...criteria];
    const levels = [...(updated[ci].level_descriptions || [])];
    levels[li] = { ...levels[li], [field]: value };
    updated[ci] = { ...updated[ci], level_descriptions: levels };
    setCriteria(updated);
  };

  const handleSaveCustomModel = async () => {
    if (!newModelName.trim()) { toast.error('Digite um nome para o modelo'); return; }
    setSavingModel(true);
    try {
      const res = await axios.post(`${API_URL}/api/users/criteria-models`, { name: newModelName.trim(), criteria }, { withCredentials: true });
      setSavedModels(prev => [...prev, res.data.model]);
      setNewModelName(''); setShowSaveModelModal(false);
      toast.success(`Modelo "${newModelName.trim()}" salvo!`);
    } catch { toast.error('Erro ao salvar modelo'); }
    finally { setSavingModel(false); }
  };

  const handleDeleteSavedModel = async (modelId, modelName) => {
    if (!window.confirm(`Remover o modelo "${modelName}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/users/criteria-models/${modelId}`, { withCredentials: true });
      setSavedModels(prev => prev.filter(m => m.id !== modelId));
      toast.success('Modelo removido');
    } catch { toast.error('Erro ao remover modelo'); }
  };

  const handleLoadSavedModel = (model) => {
    setSelectedModel(`saved_${model.id}`);
    const loaded = JSON.parse(JSON.stringify(model.criteria));
    loaded.forEach(c => { if (!c.level_descriptions) c.level_descriptions = buildEmptyLevels(c.peso_maximo); });
    setCriteria(loaded);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/prompts`, { ...formData, criteria }, { withCredentials: true });
      await axios.delete(`${API_URL}/api/prompts/draft`, { withCredentials: true }).catch(() => {});
      toast.success('Proposta criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Erro ao criar proposta');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="space-y-6 w-full max-w-4xl">
        {/* HEADER */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-black" style={{ color: 'var(--accent-red)', fontSize: 'clamp(24px, 6vw, 36px)' }} data-testid="create-prompt-title">
              Criar Nova Proposta
            </h1>
            <p className="text-lg mt-2 text-slate-600">Adicione uma nova proposta de redação para os alunos</p>
          </div>
          {/* #3 — Botão Salvar Rascunho no topo */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {autoSaveStatus === 'saving' && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>auto-salvando...</span>}
            {autoSaveStatus === 'saved' && <span className="text-xs" style={{ color: 'var(--accent-green)' }}>✓ auto-salvo</span>}
            {draftLoaded && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent-orange)', border: '1px solid #DAB257' }}>
                📄 Rascunho carregado
              </span>
            )}
            <button type="button" onClick={saveDraft} disabled={savingDraft}
              className="flex items-center gap-1 px-4 rounded-md text-sm font-medium border transition-colors"
              style={{ borderColor: draftSaved ? 'var(--accent-green)' : 'var(--border-color)', color: draftSaved ? 'var(--accent-green)' : 'var(--text-secondary)', backgroundColor: 'white' }}
              title="Salvar rascunho (Ctrl+S)">
              <Save size={14} />
              {savingDraft ? 'Salvando...' : draftSaved ? 'Salvo ✓' : 'Salvar rascunho (Ctrl+S)'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-prompt-form">

          {/* INFORMAÇÕES DA PROPOSTA */}
          <Card className="p-5 sm:p-8 bg-white border">
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--accent-red)' }}>Informações da Proposta</h3>
            <div className="space-y-4">

              {/* #6 — Título sem required */}
              <div>
                <Label htmlFor="title">Proposta <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(opcional)</span></Label>
                <Input id="title" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Desafios da educação digital no Brasil"
                  className="mt-1" data-testid="title-input" />
              </div>

              {/* Turmas */}
              {availableCourses.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Restringir a turmas <span className="font-normal">(opcional)</span></Label>
                  <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-secondary)' }}>Deixe em branco para todos os alunos verem.</p>
                  <div className="flex flex-wrap gap-2">
                    {availableCourses.filter(c => c.is_active).map(c => (
                      <label key={c.id} className="flex items-center gap-1.5 cursor-pointer text-xs px-3 py-1.5 rounded-full border transition-all"
                        style={{
                          backgroundColor: (formData.course_ids || []).includes(c.id) ? 'var(--accent-red)' : 'transparent',
                          color: (formData.course_ids || []).includes(c.id) ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          borderColor: (formData.course_ids || []).includes(c.id) ? 'var(--accent-red)' : 'var(--border-color)',
                        }}>
                        <input type="checkbox" style={{ display: 'none' }}
                          checked={(formData.course_ids || []).includes(c.id)}
                          onChange={e => {
                            const ids = formData.course_ids || [];
                            setFormData({ ...formData, course_ids: e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id) });
                          }} />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Período */}
              <div>
                <Label className="text-sm font-semibold">Período de disponibilidade <span className="font-normal">(opcional)</span></Label>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <div className="flex-1">
                    <Label htmlFor="start_date" className="text-xs">Data de início</Label>
                    <Input id="start_date" type="date" value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="mt-1" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end_date" className="text-xs">Data de encerramento</Label>
                    <Input id="end_date" type="date" value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="mt-1" />
                  </div>
                </div>
              </div>

              {/* #6 — Textos de Apoio sem required */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="supporting-texts">
                    Textos de Apoio <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(opcional)</span>
                  </Label>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
                    style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-orange)', backgroundColor: 'transparent', opacity: uploadingFile ? 0.6 : 1 }}>
                    <Upload size={12} /> {uploadingFile ? 'Enviando...' : 'Importar arquivo'}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleImportFile} />
                </div>
                <Textarea id="supporting-texts" value={formData.supporting_texts}
                  onChange={(e) => setFormData({ ...formData, supporting_texts: e.target.value })}
                  rows={6} placeholder="Adicione os textos motivadores..." className="mt-1" data-testid="supporting-texts-input" />
              </div>

              {/* Arquivos anexados */}
              {(formData.supporting_files || []).length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Arquivos anexados</Label>
                  <div className="mt-2 space-y-2">
                    {formData.supporting_files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}>
                            {f.type === 'pdf' ? 'PDF' : 'IMG'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={f.url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: 'var(--accent-green)' }}>Visualizar</a>
                          <button type="button" onClick={() => removeFile(i)} className="text-xs" style={{ color: 'var(--accent-red)' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* #6 — Instruções sem required */}
              <div>
                <Label htmlFor="instructions">Instruções <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(opcional)</span></Label>
                <Textarea id="instructions" value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={4} placeholder="Com base nos textos motivadores..." className="mt-1" data-testid="instructions-input" />
              </div>
            </div>
          </Card>

          {/* CRITÉRIOS */}
          <Card className="p-5 sm:p-8 bg-white border">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <Label className="text-base font-semibold">Selecione um Modelo de Critérios</Label>
                {/* #2 — Copiar grade */}
                <button type="button" onClick={() => { setShowCopyGrade(v => !v); setCopyGradeSource(''); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border font-semibold transition-all"
                  style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', backgroundColor: showCopyGrade ? 'var(--bg-primary)' : 'white' }}>
                  <Copy size={12} /> Copiar grade de outra proposta
                </button>
              </div>

              {/* #2 — Painel copiar grade */}
              {showCopyGrade && (
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid #DAB257' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-red)' }}>Copiar critérios de qual proposta?</p>
                  <select value={copyGradeSource} onChange={e => setCopyGradeSource(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                    <option value="">Selecione a proposta de origem...</option>
                    {existingPrompts.filter(p => p.criteria?.length).map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.criteria.length} critério{p.criteria.length !== 1 ? 's' : ''})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={!copyGradeSource} onClick={handleCopyGrade} style={{ backgroundColor: 'var(--accent-red)' }}>
                      <Copy size={14} className="mr-1" /> Copiar grade
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowCopyGrade(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Modelos fixos */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="criteria-model-select">
                {Object.entries(CRITERIA_MODELS).map(([key, model]) => (
                  <button key={key} type="button" onClick={() => handleModelChange(key)}
                    style={{
                      padding: '12px', borderRadius: '8px',
                      border: selectedModel === key ? '2px solid var(--accent-red)' : '1px solid var(--border-color)',
                      backgroundColor: selectedModel === key ? 'var(--accent-red)' : '#FFF',
                      color: selectedModel === key ? 'var(--bg-primary)' : 'var(--text-primary)',
                      textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <p className="text-sm font-semibold">{model.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: selectedModel === key ? 'rgba(253,243,232,0.75)' : 'var(--text-secondary)' }}>{model.description}</p>
                  </button>
                ))}
              </div>

              {/* Modelos salvos (#1) */}
              {savedModels.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <BookMarked size={12} /> Meus Modelos Salvos
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {savedModels.map(model => (
                      <div key={model.id} className="relative group">
                        <button type="button" onClick={() => handleLoadSavedModel(model)}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                            border: selectedModel === `saved_${model.id}` ? '2px solid var(--accent-green)' : '1px solid #D0E8E4',
                            backgroundColor: selectedModel === `saved_${model.id}` ? 'var(--accent-green)' : '#F0F7F6',
                            color: selectedModel === `saved_${model.id}` ? 'var(--bg-primary)' : 'var(--text-primary)',
                            textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                          <p className="text-sm font-semibold">{model.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: selectedModel === `saved_${model.id}` ? 'rgba(253,243,232,0.7)' : 'var(--text-secondary)' }}>
                            {model.criteria?.length || 0} critério(s)
                          </p>
                        </button>
                        <button type="button" onClick={() => handleDeleteSavedModel(model.id, model.name)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: 'var(--accent-red)' }} title="Remover modelo">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cabeçalho critérios */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--accent-red)' }}>Critérios de Avaliação</h3>
              <div className="flex gap-2">
                <Button type="button" onClick={() => { setNewModelName(''); setShowSaveModelModal(true); }}
                  variant="outline" size="sm" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>
                  <Save size={14} className="mr-1" /> Salvar como modelo
                </Button>
                <Button type="button" onClick={handleAddCriterion} variant="outline" size="sm" data-testid="add-criterion-button">
                  <Plus size={16} className="mr-2" /> Adicionar Critério
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {criteria.map((criterion, index) => (
                <Card key={criterion.id || index} className="p-4 border" style={{ backgroundColor: 'var(--bg-primary)' }} data-testid={`criterion-${index}`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Label className="text-sm font-semibold">Critério {index + 1}</Label>
                      {criteria.length > 1 && (
                        <Button type="button" onClick={() => handleRemoveCriterion(index)}
                          variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`remove-criterion-${index}`}>
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>

                    {/* #6 — sem required */}
                    <div>
                      <Label className="text-xs">Nome do Critério</Label>
                      <Input value={criterion.nome}
                        onChange={(e) => handleCriterionChange(index, 'nome', e.target.value)}
                        placeholder="Ex: Competência 1 — Domínio da Norma Culta"
                        className="mt-1" data-testid={`criterion-nome-${index}`} />
                    </div>
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Textarea value={criterion.descricao}
                        onChange={(e) => handleCriterionChange(index, 'descricao', e.target.value)}
                        rows={2} placeholder="Descreva o que será avaliado neste critério..."
                        className="mt-1" data-testid={`criterion-descricao-${index}`} />
                    </div>
                    <div>
                      <Label className="text-xs">Pontuação Máxima</Label>
                      <Input type="number" value={criterion.peso_maximo}
                        onChange={(e) => handleCriterionChange(index, 'peso_maximo', parseFloat(e.target.value) || 0)}
                        min={0.5} step={0.5} className="mt-1" data-testid={`criterion-peso-${index}`} />
                    </div>

                    {/* Níveis */}
                    <div>
                      <button type="button"
                        onClick={() => setShowLevels(prev => ({ ...prev, [index]: !prev[index] }))}
                        className="text-xs font-semibold flex items-center gap-1 mt-1"
                        style={{ color: 'var(--accent-orange)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {showLevels[index] ? '▲' : '▼'} Descrições por nível ({criterion.level_descriptions?.length || 0} níveis)
                      </button>
                      {showLevels[index] && (
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Defina os níveis de pontuação e suas descrições.</p>
                            <button type="button" onClick={() => handleAddLevel(index)}
                              className="text-xs px-2 py-1 rounded border font-semibold"
                              style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)', background: 'none', cursor: 'pointer' }}>+ Nível</button>
                          </div>
                          {(criterion.level_descriptions || []).map((level, li) => (
                            <div key={li} className="p-3 rounded-lg border" style={{ backgroundColor: '#FFF', borderColor: 'var(--border-color)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <input type="number" min="0" value={level.pontuacao}
                                  onChange={(e) => handleLevelChange(index, li, 'pontuacao', Number(e.target.value))}
                                  style={{ width: '64px', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }} />
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>pts</span>
                                <Input value={level.proficiencia}
                                  onChange={(e) => handleLevelChange(index, li, 'proficiencia', e.target.value)}
                                  placeholder={`Ex: Nível ${li} — Bom domínio`} className="flex-1 h-7 text-xs" />
                                <button type="button" onClick={() => handleRemoveLevel(index, li)}
                                  style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 2px' }}
                                  title="Remover nível">×</button>
                              </div>
                              <Textarea value={level.descricao}
                                onChange={(e) => handleLevelChange(index, li, 'descricao', e.target.value)}
                                placeholder="Descreva o que caracteriza este nível de desempenho..."
                                rows={2} className="text-xs" />
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
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                Pontuação Total: {criteria.reduce((sum, c) => sum + (c.peso_maximo || 0), 0)} pontos
              </p>
            </div>
          </Card>

          {/* BOTÕES FINAIS */}
          <div className="flex gap-4 flex-wrap">
            <Button type="submit" disabled={loading} style={{ backgroundColor: 'var(--accent-red)' }} data-testid="submit-prompt-button">
              {loading ? 'Criando...' : 'Criar Proposta'}
            </Button>
            <button type="button" onClick={saveDraft} disabled={savingDraft}
              className="flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium border"
              style={{ borderColor: draftSaved ? 'var(--accent-green)' : 'var(--border-color)', color: draftSaved ? 'var(--accent-green)' : 'var(--text-secondary)', backgroundColor: 'white' }}>
              <Save size={14} /> {savingDraft ? 'Salvando...' : draftSaved ? 'Salvo ✓' : 'Salvar rascunho'}
            </button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} data-testid="cancel-button">
              Cancelar
            </Button>
          </div>
        </form>
      </div>

      {/* MODAL: Salvar como modelo */}
      {showSaveModelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--accent-red)' }}>
                <BookMarked size={18} className="inline mr-2" />Salvar como Modelo
              </h3>
              <button onClick={() => setShowSaveModelModal(false)}
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Os {criteria.length} critério(s) configurados serão salvos como modelo reutilizável.
            </p>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-primary)' }}>Nome do modelo</label>
            <input autoFocus value={newModelName} onChange={e => setNewModelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveCustomModel()}
              placeholder="Ex: Grade Redação Vestibular 2025"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }} />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModelModal(false)}
                className="flex-1 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={handleSaveCustomModel} disabled={savingModel || !newModelName.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--accent-green)', opacity: (!newModelName.trim() || savingModel) ? 0.5 : 1 }}>
                {savingModel ? 'Salvando...' : '✓ Salvar modelo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
