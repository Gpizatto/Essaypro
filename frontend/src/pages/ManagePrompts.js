import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, Copy, Search, X, Check, BookOpen, Trash2 } from 'lucide-react';
import { CRITERIA_MODELS } from '../utils/criteriaModels';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const ManagePrompts = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCopyCriteria, setShowCopyCriteria] = useState(null); // promptId de destino
  const [copySource, setCopySource] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);

  useEffect(() => {
    fetchPrompts();
    axios.get(`${API_URL}/api/courses`, { withCredentials: true })
      .then(r => setAvailableCourses(r.data || []))
      .catch(() => {});
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/prompts/all`, { withCredentials: true });
      setPrompts(data);
    } catch (err) {
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (prompt) => {
    setEditingPrompt(prompt.id);
    setEditForm({
      title: prompt.title,
      theme: prompt.theme,
      supporting_texts: prompt.supporting_texts,
      instructions: prompt.instructions,
      course_ids: prompt.course_ids || [],
      start_date: prompt.start_date || '',
      end_date: prompt.end_date || '',
      supporting_files: prompt.supporting_files || [],
      criteria: JSON.parse(JSON.stringify(prompt.criteria || [])),
    });
  };

  const updateCriterion = (idx, field, value) => {
    const c = [...(editForm.criteria || [])];
    c[idx] = { ...c[idx], [field]: value };
    setEditForm({ ...editForm, criteria: c });
  };

  const updateLevel = (ci, li, field, value) => {
    const c = [...(editForm.criteria || [])];
    const levels = [...(c[ci].level_descriptions || [])];
    levels[li] = { ...levels[li], [field]: value };
    c[ci] = { ...c[ci], level_descriptions: levels };
    setEditForm({ ...editForm, criteria: c });
  };

  const addCriterion = () => {
    const c = [...(editForm.criteria || [])];
    c.push({ id: `c${Date.now()}`, nome: '', descricao: '', max: 100,
      level_descriptions: [
        { pontuacao: 0, descricao: '' },
        { pontuacao: 50, descricao: '' },
        { pontuacao: 100, descricao: '' },
      ]
    });
    setEditForm({ ...editForm, criteria: c });
  };

  const removeCriterion = (idx) => {
    const c = [...(editForm.criteria || [])];
    c.splice(idx, 1);
    setEditForm({ ...editForm, criteria: c });
  };

  const addLevelToEdit = (ci) => {
    const c = [...(editForm.criteria || [])];
    const levels = [...(c[ci].level_descriptions || [])];
    const lastPts = levels.length > 0 ? levels[levels.length - 1].pontuacao : 0;
    levels.push({ pontuacao: lastPts + 40, proficiencia: '', descricao: '' });
    c[ci] = { ...c[ci], level_descriptions: levels };
    setEditForm({ ...editForm, criteria: c });
  };

  const removeLevelFromEdit = (ci, li) => {
    const c = [...(editForm.criteria || [])];
    const levels = [...(c[ci].level_descriptions || [])];
    if (levels.length <= 1) return;
    levels.splice(li, 1);
    c[ci] = { ...c[ci], level_descriptions: levels };
    setEditForm({ ...editForm, criteria: c });
  };

  const saveEdit = async (promptId) => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/prompts/${promptId}`, editForm, { withCredentials: true });
      toast.success('Proposta atualizada!');
      setEditingPrompt(null);
      fetchPrompts();
    } catch (err) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (promptId) => {
    try {
      const { data } = await axios.patch(`${API_URL}/api/prompts/${promptId}/archive`, {}, { withCredentials: true });
      toast.success(data.is_active ? 'Proposta reativada!' : 'Proposta arquivada!');
      setConfirmArchive(null);
      fetchPrompts();
    } catch (err) {
      toast.error('Erro ao arquivar');
    }
  };

  const deletePrompt = async (promptId) => {
    try {
      // Tentar admin endpoint (força delete), fallback para endpoint normal
      try {
        await axios.delete(`${API_URL}/api/admin/prompts/${promptId}`, { withCredentials: true });
      } catch {
        await axios.delete(`${API_URL}/api/prompts/${promptId}`, { withCredentials: true });
      }
      toast.success('Proposta apagada!');
      setConfirmDelete(null);
      fetchPrompts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao apagar');
      setConfirmDelete(null);
    }
  };

  const duplicate = async (promptId) => {
    try {
      await axios.post(`${API_URL}/api/prompts/${promptId}/duplicate`, {}, { withCredentials: true });
      toast.success('Proposta duplicada! Ela foi criada como rascunho inativo.');
      fetchPrompts();
    } catch (err) {
      toast.error('Erro ao duplicar');
    }
  };

  const copyCriteria = async () => {
    if (!copySource || !showCopyCriteria) return;
    const source = prompts.find(p => p.id === copySource);
    if (!source?.criteria?.length) {
      toast.error('Proposta de origem sem critérios'); return;
    }
    try {
      await axios.put(`${API_URL}/api/prompts/${showCopyCriteria}`, {
        ...prompts.find(p => p.id === showCopyCriteria),
        criteria: source.criteria,
      }, { withCredentials: true });
      toast.success('Grade copiada com sucesso!');
      setShowCopyCriteria(null);
      setCopySource('');
      fetchPrompts();
    } catch (e) { toast.error('Erro ao copiar grade'); }
  };

  const filtered = prompts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.theme.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === 'all' ? true :
      filterActive === 'active' ? p.is_active : !p.is_active;
    return matchSearch && matchActive;
  });

  const inputStyle = { marginTop: '4px' };
  const labelStyle = { color: '#2C1A0E', fontSize: '13px', fontWeight: 600 };

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
              Gestão de Propostas
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              {prompts.filter(p => p.is_active).length} ativas · {prompts.filter(p => !p.is_active).length} arquivadas
            </p>
          </div>
          <Button onClick={() => navigate('/create-prompt')}>
            <Plus size={16} className="mr-2" />
            Nova Proposta
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-4 bg-white border">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5B4E' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por título ou tema..."
                style={{
                  width: '100%', padding: '7px 10px 7px 32px',
                  borderRadius: '6px', border: '1px solid #E8DDD0',
                  fontSize: '13px', color: '#2C1A0E', outline: 'none'
                }}
              />
            </div>
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E' }}
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="archived">Arquivadas</option>
            </select>
            {(search || filterActive !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterActive('all'); }}
                className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                style={{ backgroundColor: '#FDF3E8', color: '#7C1805', border: '1px solid #D66B27' }}>
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </Card>

        {/* Lista de propostas */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <BookOpen size={40} className="mx-auto mb-3" style={{ color: '#D66B27' }} />
            <p style={{ color: '#6B5B4E' }}>Nenhuma proposta encontrada</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(prompt => (
              <Card key={prompt.id} className="bg-white border shadow-sm overflow-hidden">
                {/* Modo visualização */}
                {editingPrompt !== prompt.id ? (
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-semibold text-base" style={{ color: '#7C1805' }}>
                            {prompt.title}
                          </h3>
                          <Badge style={{
                            backgroundColor: prompt.is_active ? '#36555A' : '#6B5B4E',
                            color: '#FDF3E8', fontSize: '10px'
                          }}>
                            {prompt.is_active ? 'Ativa' : 'Arquivada'}
                          </Badge>
                          {(prompt.course_ids || []).length > 0 && (prompt.course_ids || []).map(cid => {
                            const course = availableCourses.find(c => c.id === cid);
                            return course ? (
                              <span key={cid} className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: '#EDF4F5', color: '#36555A', border: '1px solid #36555A' }}>
                                🎓 {course.name}
                              </span>
                            ) : null;
                          })}
                          {(prompt.course_ids || []).length === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#FDF3E8', color: '#D66B27', border: '1px solid #D66B27' }}>
                              Todos os alunos
                            </span>
                          )}
                        </div>
                        <p className="text-sm truncate" style={{ color: '#6B5B4E' }}>{prompt.theme}</p>
                        {(prompt.supporting_files || []).length > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: '#36555A' }}>
                            📎 {prompt.supporting_files.length} arquivo{prompt.supporting_files.length !== 1 ? 's' : ''} anexado{prompt.supporting_files.length !== 1 ? 's' : ''}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>
                          {prompt.criteria?.length || 0} critérios · criada em {new Date(prompt.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(prompt)} title="Editar">
                          <Pencil size={15} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicate(prompt.id)} title="Duplicar">
                          <Copy size={15} />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setConfirmArchive(prompt.id)}
                          title={prompt.is_active ? 'Arquivar' : 'Reativar'}
                          style={{ color: prompt.is_active ? '#D97706' : '#36555A' }}
                        >
                          <Archive size={15} />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setConfirmDelete(prompt.id)}
                          title="Apagar permanentemente"
                          style={{ color: '#7C1805' }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>

                    {/* Confirmação de apagar */}
                    {confirmDelete === prompt.id && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#FCA5A5' }}>
                        <p className="text-sm font-semibold mb-2" style={{ color: '#7C1805' }}>
                          ⚠️ Apagar permanentemente? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm"
                            style={{ backgroundColor: '#7C1805' }}
                            onClick={() => deletePrompt(prompt.id)}>
                            Apagar permanentemente
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Confirmação de arquivar */}
                    {confirmArchive === prompt.id && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-3" style={{ borderColor: '#E8DDD0' }}>
                        <p className="text-sm flex-1" style={{ color: '#2C1A0E' }}>
                          {prompt.is_active ? 'Arquivar esta proposta?' : 'Reativar esta proposta?'}
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setConfirmArchive(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => toggleArchive(prompt.id)}>
                          Confirmar
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Modo edição inline */
                  <div className="p-5 space-y-4" style={{ backgroundColor: '#FFFBF5' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: '#7C1805' }}>Editando proposta</p>
                      <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(null)}>
                        <X size={15} />
                      </Button>
                    </div>
                    <div>
                      <label style={labelStyle}>Título</label>
                      <Input style={inputStyle} value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tema</label>
                      <Input style={inputStyle} value={editForm.theme}
                        onChange={e => setEditForm({ ...editForm, theme: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Textos de Apoio</label>
                      <Textarea style={inputStyle} rows={4} value={editForm.supporting_texts}
                        onChange={e => setEditForm({ ...editForm, supporting_texts: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Instruções</label>
                      <Textarea style={inputStyle} rows={3} value={editForm.instructions}
                        onChange={e => setEditForm({ ...editForm, instructions: e.target.value })} />
                    </div>
                    {/* Período de disponibilidade */}
                    <div>
                      <label style={labelStyle}>Período de disponibilidade</label>
                      <div className="flex gap-2 mt-1">
                        <div className="flex-1">
                          <label style={{ fontSize: '11px', color: '#6B5B4E' }}>Início</label>
                          <input type="date" value={editForm.start_date || ''}
                            onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px', color: '#2C1A0E' }} />
                        </div>
                        <div className="flex-1">
                          <label style={{ fontSize: '11px', color: '#6B5B4E' }}>Fim</label>
                          <input type="date" value={editForm.end_date || ''}
                            onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px', color: '#2C1A0E' }} />
                        </div>
                      </div>
                    </div>

                    {/* Turmas */}
                    {availableCourses.length > 0 && (
                      <div>
                        <label style={labelStyle}>Restringir a turmas (vazio = todos)</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {availableCourses.filter(c => c.is_active).map(c => (
                            <label key={c.id} className="flex items-center gap-1.5 cursor-pointer text-xs px-2 py-1 rounded-full border"
                              style={{
                                backgroundColor: (editForm.course_ids || []).includes(c.id) ? '#7C1805' : 'transparent',
                                color: (editForm.course_ids || []).includes(c.id) ? '#FDF3E8' : '#6B5B4E',
                                borderColor: (editForm.course_ids || []).includes(c.id) ? '#7C1805' : '#E8DDD0',
                              }}>
                              <input type="checkbox" style={{ display: 'none' }}
                                checked={(editForm.course_ids || []).includes(c.id)}
                                onChange={e => {
                                  const ids = editForm.course_ids || [];
                                  setEditForm({ ...editForm,
                                    course_ids: e.target.checked
                                      ? [...ids, c.id]
                                      : ids.filter(id => id !== c.id)
                                  });
                                }}
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grade de Correção */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label style={labelStyle}>Grade de Correção</label>
                        <button onClick={addCriterion}
                          style={{ fontSize: '11px', color: '#7C1805', background: 'none', border: '1px solid #7C1805', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}>
                          + Critério
                        </button>
                      </div>
                      {(editForm.criteria || []).map((crit, ci) => (
                        <div key={ci} className="mb-4 p-3 rounded-lg" style={{ border: '1px solid #E8DDD0', backgroundColor: '#FFFBF5' }}>
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1">
                              <input
                                placeholder="Nome do critério"
                                value={crit.nome}
                                onChange={e => updateCriterion(ci, 'nome', e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px', marginBottom: '4px' }}
                              />
                              <input
                                placeholder="Descrição"
                                value={crit.descricao}
                                onChange={e => updateCriterion(ci, 'descricao', e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px', marginBottom: '4px' }}
                              />
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: '11px', color: '#6B5B4E' }}>Pontuação máx:</span>
                                <input type="number" min="1"
                                  value={crit.max}
                                  onChange={e => updateCriterion(ci, 'max', Number(e.target.value))}
                                  style={{ width: '70px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px' }}
                                />
                              </div>
                            </div>
                            <button onClick={() => removeCriterion(ci)}
                              style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                              title="Remover critério">×</button>
                          </div>
                          {/* Níveis */}
                          <div className="space-y-1 mt-2">
                            <div className="flex items-center justify-between">
                              <p style={{ fontSize: '11px', color: '#6B5B4E', fontWeight: '600' }}>Níveis:</p>
                              <button onClick={() => addLevelToEdit(ci)}
                                style={{ fontSize: '11px', color: '#36555A', background: 'none', border: '1px solid #36555A', borderRadius: '4px', padding: '1px 6px', cursor: 'pointer' }}>
                                + Nível
                              </button>
                            </div>
                            {(crit.level_descriptions || []).map((lv, li) => (
                              <div key={li} className="flex gap-2 items-center">
                                <input type="number" min="0"
                                  value={lv.pontuacao}
                                  onChange={e => updateLevel(ci, li, 'pontuacao', Number(e.target.value))}
                                  style={{ width: '60px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '11px' }}
                                  placeholder="Pts"
                                />
                                <input
                                  value={lv.proficiencia || ''}
                                  onChange={e => updateLevel(ci, li, 'proficiencia', e.target.value)}
                                  style={{ width: '90px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '11px' }}
                                  placeholder="Nome nível"
                                />
                                <input
                                  value={lv.descricao || ''}
                                  onChange={e => updateLevel(ci, li, 'descricao', e.target.value)}
                                  style={{ flex: 1, padding: '3px 6px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '11px' }}
                                  placeholder="Descrição do nível"
                                />
                                <button onClick={() => removeLevelFromEdit(ci, li)}
                                  style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" disabled={saving} onClick={() => saveEdit(prompt.id)}>
                        <Check size={14} className="mr-1" />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => { setShowCopyCriteria(prompt.id); setCopySource(''); }}
                        title="Copiar grade de outra proposta">
                        📋 Copiar grade
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPrompt(null)}>
                        Cancelar
                      </Button>
                    </div>

                    {/* Modal copiar grade */}
                    {showCopyCriteria === prompt.id && (
                      <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#FDF3E8', border: '1px solid #DAB257' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: '#7C1805' }}>
                          Copiar critérios de qual proposta?
                        </p>
                        <select
                          value={copySource}
                          onChange={e => setCopySource(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E', marginBottom: '8px' }}
                        >
                          <option value="">Selecione a proposta de origem...</option>
                          {prompts.filter(p => p.id !== prompt.id && p.criteria?.length).map(p => (
                            <option key={p.id} value={p.id}>{p.title} ({p.criteria.length} critérios)</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={!copySource} onClick={copyCriteria}>
                            Copiar grade
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowCopyCriteria(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
