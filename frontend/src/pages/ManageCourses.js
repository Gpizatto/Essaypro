import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, BookOpen, X, Check, ToggleLeft, ToggleRight, UserPlus, UserMinus } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MODALITY_LABELS = {
  online: 'Online',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
};

export const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [managingId, setManagingId] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', modality: 'online', is_active: true });
  const [saving, setSaving] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [creditConfigs, setCreditConfigs] = useState({}); // {courseId: {mode, limit}}
  const [savingCredits, setSavingCredits] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchUsers();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/courses`, { withCredentials: true });
      setCourses(data);
      // Buscar configs de crédito de cada turma
      const configs = {};
      await Promise.all(data.map(async c => {
        try {
          const r = await axios.get(`${API_URL}/api/credits/course/${c.id}`, { withCredentials: true });
          configs[c.id] = r.data;
        } catch (e) {}
      }));
      setCreditConfigs(configs);
    } catch (e) { toast.error('Erro ao carregar turmas'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/users`, { withCredentials: true });
      setAllUsers(data);
    } catch (e) {}
  };

  const fetchMembers = async (courseId) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/courses/${courseId}/members`, { withCredentials: true });
      setMembers(data);
    } catch (e) {}
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/courses/${editingId}`, form, { withCredentials: true });
        toast.success('Turma atualizada!');
      } else {
        await axios.post(`${API_URL}/api/courses`, form, { withCredentials: true });
        toast.success('Turma criada!');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', description: '', modality: 'online', is_active: true });
      fetchCourses();
    } catch (e) { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (courseId) => {
    try {
      await axios.patch(`${API_URL}/api/courses/${courseId}/toggle`, {}, { withCredentials: true });
      fetchCourses();
    } catch (e) { toast.error('Erro'); }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Excluir esta turma? Os alunos serão desvinculados mas não excluídos.')) return;
    try {
      await axios.delete(`${API_URL}/api/courses/${courseId}`, { withCredentials: true });
      toast.success('Turma excluída');
      fetchCourses();
    } catch (e) { toast.error('Erro ao excluir'); }
  };

  const addMember = async (courseId) => {
    if (!addUserId) return;
    try {
      await axios.post(`${API_URL}/api/courses/${courseId}/add-member`, { user_id: addUserId }, { withCredentials: true });
      toast.success('Membro adicionado!');
      setAddUserId('');
      fetchMembers(courseId);
      fetchCourses();
    } catch (e) { toast.error('Erro ao adicionar'); }
  };

  const removeMember = async (courseId, userId) => {
    try {
      await axios.post(`${API_URL}/api/courses/${courseId}/remove-member`, { user_id: userId }, { withCredentials: true });
      toast.success('Membro removido');
      fetchMembers(courseId);
      fetchCourses();
    } catch (e) { toast.error('Erro ao remover'); }
  };

  const saveCreditConfig = async (courseId) => {
    setSavingCredits(courseId);
    const cfg = creditConfigs[courseId] || { mode: 'default', limit: 0 };
    try {
      await axios.put(`${API_URL}/api/credits/course/${courseId}`, cfg, { withCredentials: true });
      toast.success('Créditos da turma salvos!');
    } catch (e) { toast.error('Erro ao salvar'); }
    finally { setSavingCredits(null); }
  };

  const startEdit = (course) => {
    setEditingId(course.id);
    setForm({ name: course.name, description: course.description || '', modality: course.modality || 'online', is_active: course.is_active });
    setShowForm(true);
  };

  const startManage = (course) => {
    setManagingId(course.id);
    fetchMembers(course.id);
  };

  const nonMembers = allUsers.filter(u => !members.find(m => m.id === u.id));

  const inputStyle = { marginTop: '4px' };
  const selectStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E', marginTop: '4px' };

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
              Turmas e Unidades
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              {courses.length} turma{courses.length !== 1 ? 's' : ''} cadastrada{courses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', modality: 'online', is_active: true }); }}>
            <Plus size={16} className="mr-2" /> Nova Turma
          </Button>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card className="p-5 bg-white border shadow-sm" style={{ borderColor: '#DAB257' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#7C1805' }}>
              {editingId ? 'Editar Turma' : 'Nova Turma'}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold" style={{ color: '#2C1A0E' }}>Nome *</label>
                <Input style={inputStyle} value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Turma A — ENEM 2025" />
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: '#2C1A0E' }}>Modalidade</label>
                <select value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })} style={selectStyle}>
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold" style={{ color: '#2C1A0E' }}>Descrição</label>
                <Input style={inputStyle} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição opcional da turma" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={save} disabled={saving}>
                <Check size={14} className="mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        {/* Lista de turmas */}
        {courses.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <BookOpen size={40} className="mx-auto mb-3" style={{ color: '#D66B27' }} />
            <p style={{ color: '#6B5B4E' }}>Nenhuma turma criada ainda</p>
            <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>Crie turmas para organizar alunos e professores</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <Card key={course.id} className="bg-white border shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-heading font-semibold" style={{ color: '#7C1805' }}>
                          {course.name}
                        </h3>
                        <Badge style={{
                          backgroundColor: course.is_active ? '#36555A' : '#6B5B4E',
                          color: '#FDF3E8', fontSize: '10px'
                        }}>
                          {course.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FDF3E8', color: '#D66B27' }}>
                          {MODALITY_LABELS[course.modality] || course.modality}
                        </span>
                      </div>
                      {course.description && (
                        <p className="text-xs mb-1" style={{ color: '#6B5B4E' }}>{course.description}</p>
                      )}
                      <p className="text-xs" style={{ color: '#6B5B4E' }}>
                        👨‍🏫 {course.teacher_count} professor{course.teacher_count !== 1 ? 'es' : ''} · 
                        👩‍🎓 {course.student_count} aluno{course.student_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startManage(course)} title="Gerenciar membros">
                        <Users size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(course)} title="Editar">
                        <Pencil size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(course.id)}
                        title={course.is_active ? 'Desativar' : 'Ativar'}
                        style={{ color: course.is_active ? '#D97706' : '#36555A' }}>
                        {course.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCourse(course.id)}
                        title="Excluir" style={{ color: '#7C1805' }}>
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Painel de membros */}
                {managingId === course.id && (
                  <div className="border-t p-4 space-y-3" style={{ borderColor: '#F0EBE3', backgroundColor: '#FFFBF5' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: '#7C1805' }}>
                        Membros da turma ({members.length})
                      </p>
                      <button onClick={() => setManagingId(null)} style={{ color: '#6B5B4E' }}>
                        <X size={14} />
                      </button>
                    </div>

                    {/* Adicionar membro */}
                    <div className="flex gap-2">
                      <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                        style={{ ...selectStyle, flex: 1, marginTop: 0 }}>
                        <option value="">Selecionar usuário para adicionar...</option>
                        {nonMembers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role === 'student' ? 'Aluno' : u.role === 'teacher' ? 'Professor' : 'Admin'})
                          </option>
                        ))}
                      </select>
                      <Button size="sm" disabled={!addUserId} onClick={() => addMember(course.id)}>
                        <UserPlus size={14} />
                      </Button>
                    </div>

                    {/* Lista de membros */}
                    {members.length === 0 ? (
                      <p className="text-xs text-center py-2" style={{ color: '#6B5B4E' }}>Nenhum membro ainda</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{ backgroundColor: '#FFF', border: '1px solid #F0EBE3' }}>
                            <div>
                              <span className="text-sm font-medium" style={{ color: '#2C1A0E' }}>{m.name}</span>
                              <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: m.role === 'teacher' ? '#36555A' : '#7C1805', color: '#FDF3E8' }}>
                                {m.role === 'student' ? 'Aluno' : m.role === 'teacher' ? 'Professor' : 'Admin'}
                              </span>
                            </div>
                            <button onClick={() => removeMember(course.id, m.id)}
                              className="text-xs flex items-center gap-1"
                              style={{ color: '#7C1805' }}>
                              <UserMinus size={13} />
                            </button>
                          </div>
                        ))}
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
