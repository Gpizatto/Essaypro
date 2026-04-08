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
import { Plus, Pencil, Archive, Copy, Search, X, Check, BookOpen } from 'lucide-react';
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

  useEffect(() => { fetchPrompts(); }, []);

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
    });
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

  const duplicate = async (promptId) => {
    try {
      await axios.post(`${API_URL}/api/prompts/${promptId}/duplicate`, {}, { withCredentials: true });
      toast.success('Proposta duplicada! Ela foi criada como rascunho inativo.');
      fetchPrompts();
    } catch (err) {
      toast.error('Erro ao duplicar');
    }
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
                        </div>
                        <p className="text-sm truncate" style={{ color: '#6B5B4E' }}>{prompt.theme}</p>
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
                      </div>
                    </div>

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
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={() => saveEdit(prompt.id)}>
                        <Check size={14} className="mr-1" />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPrompt(null)}>
                        Cancelar
                      </Button>
                    </div>
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
