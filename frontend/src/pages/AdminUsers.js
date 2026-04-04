import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getRoleBadge = (role) => {
  const roleMap = {
    student: { label: 'Aluno', color: '#3B82F6' },
    teacher: { label: 'Professor', color: '#6B21A8' },
    admin: { label: 'Admin', color: '#EF4444' },
  };
  const config = roleMap[role] || roleMap.student;
  return (
    <Badge style={{ backgroundColor: config.color, color: '#fff' }} data-testid={`role-badge-${role}`}>
      {config.label}
    </Badge>
  );
};

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/users`, { withCredentials: true });
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-black text-4xl" style={{ color: '#002147' }} data-testid="admin-users-title">
            Gerenciamento de Usuários
          </h1>
          <p className="text-lg mt-2 text-slate-600">Total de {users.length} usuários cadastrados</p>
        </div>

        {users.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <Users size={48} className="mx-auto mb-4" style={{ color: '#525252' }} />
            <p className="text-lg text-slate-600">Nenhum usuário encontrado</p>
          </Card>
        ) : (
          <Card className="bg-white border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </Layout>
  );
};