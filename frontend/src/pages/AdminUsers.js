import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Users, Search, UserCheck, UserX, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ROLE_MAP = {
  student:  { label: 'Aluno',     color: '#2563EB' },
  teacher:  { label: 'Professor', color: 'var(--accent-green)' },
  corretor: { label: 'Corretor',  color: '#7C3AED' },
  admin:    { label: 'Admin',     color: 'var(--accent-red)' },
};

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [changingRole, setChangingRole] = useState(null);
  const [togglingActive, setTogglingActive] = useState(null);
  const searchTimerRef = useRef(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async (searchTerm = '', role = 'all') => {
    setLoading(true);
    try {
      // P-08: busca server-side via $regex no MongoDB
      const params = new URLSearchParams({ page_size: 500 });
      if (searchTerm) params.set('search', searchTerm);
      if (role !== 'all') params.set('role', role);
      const { data } = await axios.get(`${API_URL}/api/admin/users?${params}`, { withCredentials: true });
      setUsers(data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Debounce: espera 400ms após o usuário parar de digitar para buscar no servidor
  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchUsers(value, filterRole);
    }, 400);
  };

  const handleRoleFilterChange = (value) => {
    setFilterRole(value);
    fetchUsers(search, value);
  };

  const updateRole = async (userId, newRole) => {
    setChangingRole(userId);
    try {
      await axios.patch(`${API_URL}/api/admin/users/${userId}/role`, { role: newRole }, { withCredentials: true });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Função atualizada!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar função');
    } finally {
      setChangingRole(null);
    }
  };

  const toggleActive = async (userId, currentActive) => {
    setTogglingActive(userId);
    try {
      const { data } = await axios.patch(`${API_URL}/api/admin/users/${userId}/toggle-active`, {}, { withCredentials: true });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: data.is_active } : u));
      toast.success(data.is_active ? 'Usuário reativado!' : 'Usuário desativado!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao alterar status');
    } finally {
      setTogglingActive(null);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Deletar permanentemente "${userName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, { withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Usuário deletado.');
    } catch (e) {
      toast.error('Erro: ' + (e.response?.data?.detail || e.message));
    }
  };

  // P-08: search e role já filtrados no servidor — apenas is_active filtra localmente
  const filtered = useMemo(() => users.filter(u => {
    const matchActive = filterActive === 'all' ? true :
      filterActive === 'active' ? u.is_active !== false : u.is_active === false;
    return matchActive;
  }), [users, filterActive]);

  const counts = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    corretores: users.filter(u => u.role === 'corretor').length,
    inactive: users.filter(u => u.is_active === false).length,
  }), [users]);

  const selectStyle = {
    padding: '7px 10px', borderRadius: '6px',
    border: '1px solid var(--border-color)', fontSize: '13px',
    color: 'var(--text-primary)', backgroundColor: '#FFF', cursor: 'pointer',
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: 'var(--accent-red)' }} data-testid="admin-users-title">
            Gerenciamento de Usuários
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {counts.total} usuários · {counts.students} alunos · {counts.teachers} professores · {counts.corretores} corretores
            {counts.inactive > 0 && ` · ${counts.inactive} inativos`}
          </p>
        </div>

        {/* Filtros */}
        <Card className="p-4 bg-white border">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Buscar por nome ou email..."
                style={{
                  width: '100%', padding: '10px 10px 10px 32px', fontSize: '16px', minHeight: '44px',
                  borderRadius: '6px', border: '1px solid var(--border-color)',
                  fontSize: '13px', color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>
            <select value={filterRole} onChange={e => handleRoleFilterChange(e.target.value)} style={selectStyle}>
              <option value="all">Todas as funções</option>
              <option value="student">Alunos</option>
              <option value="teacher">Professores</option>
              <option value="corretor">Corretores</option>
              <option value="admin">Admins</option>
            </select>
            <select value={filterActive} onChange={e => setFilterActive(e.target.value)} style={selectStyle}>
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </Card>

        {/* Tabela */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--accent-orange)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum usuário encontrado</p>
          </Card>
        ) : (
          <Card className="bg-white border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '140px' }}>Nome</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '180px' }}>Email</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '110px' }}>Função</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '80px' }}>Status</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '100px' }}>Cadastro</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '90px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, i) => {
                    const isInactive = user.is_active === false;
                    return (
                      <tr
                        key={user.id}
                        data-testid={`user-row-${user.id}`}
                        style={{
                          borderBottom: '1px solid #F0EBE3',
                          backgroundColor: isInactive ? '#FAFAFA' : 'white',
                          opacity: isInactive ? 0.7 : 1,
                        }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {user.name}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                        <td className="px-4 py-3">
                          {/* Dropdown de função */}
                          <select
                            value={user.role}
                            onChange={e => updateRole(user.id, e.target.value)}
                            disabled={changingRole === user.id}
                            data-testid={`role-badge-${user.role}`}
                            style={{ color: user.role === 'corretor' ? '#7C3AED' : undefined }}
                            style={{
                              ...selectStyle,
                              backgroundColor: ROLE_MAP[user.role]?.color,
                              color: '#FFF',
                              fontWeight: 600,
                              fontSize: '12px',
                              padding: '4px 8px',
                            }}
                          >
                            <option value="student">Aluno</option>
                            <option value="teacher">Professor</option>
                            <option value="corretor">Corretor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            backgroundColor: isInactive ? 'var(--text-secondary)' : 'var(--accent-green)',
                            color: 'var(--bg-primary)', fontSize: '11px',
                          }}>
                            {isInactive ? 'Inativo' : 'Ativo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={togglingActive === user.id}
                            onClick={() => toggleActive(user.id, !isInactive)}
                            title={isInactive ? 'Reativar usuário' : 'Desativar usuário'}
                            style={{ color: isInactive ? 'var(--accent-green)' : 'var(--accent-red)' }}
                          >
                            {isInactive ? <UserCheck size={16} /> : <UserX size={16} />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteUser(user.id, user.name)}
                            title="Deletar permanentemente"
                            style={{ color: '#DC2626' }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)', borderTop: '1px solid #F0EBE3' }}>
              Mostrando {filtered.length} de {users.length} usuários
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
