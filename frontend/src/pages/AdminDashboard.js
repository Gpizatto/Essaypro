import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Users, FileText, CheckCircle, Award, Zap, Save, Clock, RotateCcw, BookOpen, TrendingUp, Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Card de estatística com ghost icon e dot colorido
const StatCard = ({ label, value, Icon, color, sub }) => (
  <Card
    className="bg-white border"
    style={{
      padding: '18px 18px 14px',
      borderRadius: '14px',
      borderColor: `${color}22`,
      boxShadow: '0 1px 4px rgba(44,26,14,0.05)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
    }}
  >
    <div style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.07, pointerEvents: 'none' }}>
      <Icon size={72} color={color} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
    </div>
    <p style={{ fontSize: '34px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
    {sub && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</p>}
  </Card>
);

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingSelections, setPendingSelections] = useState({});
  const [backups, setBackups] = useState([]);
  const [runningBackup, setRunningBackup] = useState(false);
  const [courses, setCourses] = useState([]);
  const [filterCourse, setFilterCourse] = useState('all');
  const [creditConfig, setCreditConfig] = useState({ mode: 'unlimited', limit: 4 });
  const [savingCredits, setSavingCredits] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCreditConfig();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/stats`, { withCredentials: true });
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditConfig = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/credits/config`, { withCredentials: true });
      setCreditConfig(data);
    } catch (error) {
      console.error('Error fetching credit config:', error);
    }
  };

  const saveCreditConfig = async () => {
    setSavingCredits(true);
    try {
      await axios.put(`${API_URL}/api/credits/config`, creditConfig, { withCredentials: true });
      toast.success('Configuração salva!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSavingCredits(false);
    }
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)', fontSize: '13px',
    color: 'var(--text-primary)', backgroundColor: '#FFF', outline: 'none',
  };

  const approveUser = async (userId) => {
    const sel = pendingSelections[userId] || {};
    try {
      const res = await axios.post(`${API_URL}/api/admin/approve-user/${userId}`,
        { role: sel.role || 'student', course_id: sel.course_id || null },
        { withCredentials: true });
      const { user, modified } = res.data || {};
      if (modified === 0) {
        toast.warning('Usuário já estava aprovado ou não foi encontrado.');
      } else if (user && user.is_approved && user.is_active) {
        toast.success(`✅ ${user.name || 'Usuário'} aprovado como ${user.role}!`);
      } else {
        toast.error('Aprovação pode ter falhado — verifique o banco.');
      }
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setPendingSelections(prev => { const n = {...prev}; delete n[userId]; return n; });
    } catch (e) {
      toast.error('Erro ao aprovar: ' + (e.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const editUserEmail = async (userId, currentEmail) => {
    const newEmail = window.prompt(`Corrigir email de "${currentEmail}" para:`, currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    try {
      await axios.patch(`${API_URL}/api/admin/users/${userId}/email`,
        { email: newEmail.toLowerCase().trim() },
        { withCredentials: true });
      toast.success(`Email atualizado para ${newEmail}`);
    } catch (e) {
      toast.error('Erro: ' + (e.response?.data?.detail || e.message));
    }
  };

  const rejectUser = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await axios.post(`${API_URL}/api/admin/reject-user/${userId}`, {}, { withCredentials: true });
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Cadastro rejeitado');
    } catch (e) { toast.error('Erro ao rejeitar'); }
  };

  const handleRunBackup = async () => {
    setRunningBackup(true);
    try {
      await axios.post(`${API_URL}/api/admin/backup/run`, {}, { withCredentials: true });
      toast.success('Backup realizado com sucesso!');
      const r = await axios.get(`${API_URL}/api/admin/backup/list`, { withCredentials: true });
      setBackups(r.data || []);
    } catch (e) { toast.error('Erro ao fazer backup'); }
    finally { setRunningBackup(false); }
  };

  const handleExportPDF = () => {
    exportToPDF('Relatório do Curso — RcN', `
      <h1>Relatório Geral do Curso</h1>
      <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-value">${stats?.total_users || 0}</div><div class="stat-label">Usuários</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.total_essays || 0}</div><div class="stat-label">Redações</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.total_corrections || 0}</div><div class="stat-label">Corrigidas</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.total_pending || 0}</div><div class="stat-label">Pendentes</div></div>
        <div class="stat-box"><div class="stat-value">${stats?.total_rewrites || 0}</div><div class="stat-label">Reescritas</div></div>
        <div class="stat-box"><div class="stat-value">${Math.round(stats?.average_score || 0)}</div><div class="stat-label">Média Geral</div></div>
      </div>
      ${stats?.top_prompts?.length ? `
        <h2>Propostas Mais Enviadas</h2>
        <table>
          <tr><th>#</th><th>Proposta</th><th>Envios</th></tr>
          ${stats.top_prompts.map((p, i) => `<tr><td>${i+1}</td><td>${p.title}</td><td>${p.count}</td></tr>`).join('')}
        </table>` : ''}
      ${stats?.top_students?.length ? `
        <h2>Alunos Mais Ativos</h2>
        <table>
          <tr><th>#</th><th>Aluno</th><th>Redações</th></tr>
          ${stats.top_students.map((s, i) => `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.count}</td></tr>`).join('')}
        </table>` : ''}
    `);
  };

  const handleExportExcel = () => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Total de Usuários', stats?.total_users || 0],
      ['Total de Alunos', stats?.total_students || 0],
      ['Total de Professores', stats?.total_teachers || 0],
      ['Redações Enviadas', stats?.total_essays || 0],
      ['Redações Pendentes', stats?.total_pending || 0],
      ['Correções Realizadas', stats?.total_corrections || 0],
      ['Reescritas', stats?.total_rewrites || 0],
      ['Média Geral de Pontos', Math.round(stats?.average_score || 0)],
    ];
    exportToExcel('relatorio-curso-rcn', headers, rows);
  };

  const pendingRate = stats?.total_essays > 0
    ? Math.round((stats.total_pending / stats.total_essays) * 100)
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-muted rounded" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1
            className="font-heading font-bold"
            style={{ fontSize: 'clamp(22px, 5vw, 28px)', color: 'var(--accent-red)', letterSpacing: '-0.02em' }}
            data-testid="admin-dashboard-title"
          >
            Painel Administrativo
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Visão geral da plataforma</p>

          {/* Filtro de turma + ferramentas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {courses.length > 0 && (
              <>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Turma:</span>
                <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ ...selectStyle, fontSize: '14px', padding: '8px 10px', minHeight: '40px' }}>
                  <option value="all">Todas</option>
                  {courses.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={handleRunBackup}
              disabled={runningBackup}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '10px 12px', borderRadius: '8px', minHeight: '40px',
                border: '1px solid var(--border-color)', backgroundColor: '#fff',
                fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              {runningBackup ? '⏳ Salvando...' : '💾 Backup'}
            </button>
            {backups.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Último: {new Date(backups[0].created_at).toLocaleDateString('pt-BR')}
              </span>
            )}
            <button
              onClick={handleExportPDF}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '10px 12px', borderRadius: '8px', minHeight: '40px',
                border: '1px solid var(--accent-red)', backgroundColor: '#fff',
                fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)', cursor: 'pointer',
              }}
            >
              <Download size={12} /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '10px 12px', borderRadius: '8px', minHeight: '40px',
                border: '1px solid var(--accent-green)', backgroundColor: '#fff',
                fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)', cursor: 'pointer',
              }}
            >
              <Download size={12} /> Excel
            </button>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Usuários" value={stats?.total_users || 0} Icon={Users} color="var(--accent-red)"
            sub={`${stats?.total_students || 0} alunos · ${stats?.total_teachers || 0} prof.`} />
          <StatCard label="Redações" value={stats?.total_essays || 0} Icon={FileText} color="var(--accent-orange)" />
          <StatCard label="Pendentes" value={stats?.total_pending || 0} Icon={Clock} color="#DAB257"
            sub={`${pendingRate}% do total`} />
          <StatCard label="Corrigidas" value={stats?.total_corrections || 0} Icon={CheckCircle} color="var(--accent-green)" />
          <StatCard label="Reescritas" value={stats?.total_rewrites || 0} Icon={RotateCcw} color="var(--text-secondary)" />
          <StatCard label="Média Geral" value={Math.round(stats?.average_score || 0)} Icon={Award} color="#A03217" />
        </div>

        {/* Frequência de envio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="bg-white border"
            style={{ padding: '18px', borderRadius: '14px', borderColor: '#D9B2CF44', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.07, pointerEvents: 'none' }}>
              <TrendingUp size={72} color="#D9B2CF" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#A0509A' }} />
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Envios (7 dias)</p>
            </div>
            <p style={{ fontSize: '34px', fontWeight: 800, color: 'var(--accent-red)', lineHeight: 1, letterSpacing: '-0.02em' }}>{stats?.essays_last_7_days ?? 0}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>redações enviadas</p>
          </Card>
          <Card
            className="bg-white border"
            style={{ padding: '18px', borderRadius: '14px', borderColor: '#DAB25744', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', right: '-8px', top: '-8px', opacity: 0.07, pointerEvents: 'none' }}>
              <TrendingUp size={72} color="#DAB257" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#DAB257' }} />
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Envios (30 dias)</p>
            </div>
            <p style={{ fontSize: '34px', fontWeight: 800, color: 'var(--accent-red)', lineHeight: 1, letterSpacing: '-0.02em' }}>{stats?.essays_last_30_days ?? 0}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              ~{stats?.essays_last_30_days ? Math.round(stats.essays_last_30_days / 4) : 0}/semana
            </p>
          </Card>
        </div>

        {/* Aprovação de usuários pendentes */}
        {pendingUsers.length > 0 && (
          <Card
            className="bg-white border"
            style={{ padding: '20px', borderRadius: '14px', borderColor: '#DAB257' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-red)' }}>
                Aguardando aprovação ({pendingUsers.length})
              </h2>
            </div>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div
                  key={u.id}
                  style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {u.email}
                        <button
                          onClick={() => editUserEmail(u.id, u.email)}
                          style={{ marginLeft: '8px', color: 'var(--accent-orange)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}
                        >
                          ✏️ corrigir
                        </button>
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <select
                          value={pendingSelections[u.id]?.role || 'student'}
                          onChange={e => setPendingSelections(prev => ({ ...prev, [u.id]: { ...prev[u.id], role: e.target.value }}))}
                          style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'white' }}
                        >
                          <option value="student">Aluno</option>
                          <option value="teacher">Professor</option>
                          <option value="admin">Admin</option>
                        </select>
                        {courses.length > 0 && (
                          <select
                            value={pendingSelections[u.id]?.course_id || ''}
                            onChange={e => setPendingSelections(prev => ({ ...prev, [u.id]: { ...prev[u.id], course_id: e.target.value }}))}
                            style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'white' }}
                          >
                            <option value="">Sem turma</option>
                            {courses.filter(c => c.is_active).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => approveUser(u.id)}
                        style={{ padding: '10px 12px', borderRadius: '8px', minHeight: '40px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-green)', color: '#fff', fontSize: '12px', fontWeight: 600 }}
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        onClick={() => rejectUser(u.id)}
                        style={{ padding: '10px 12px', borderRadius: '8px', minHeight: '40px', cursor: 'pointer', backgroundColor: '#FEF2F2', color: 'var(--accent-red)', border: '1px solid #FCA5A5', fontSize: '12px', fontWeight: 600 }}
                      >
                        ✕ Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top propostas + Top alunos */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-white border" style={{ padding: '20px', borderRadius: '14px', borderColor: 'var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BookOpen size={16} style={{ color: 'var(--accent-red)' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-red)' }}>Propostas mais enviadas</h2>
            </div>
            {stats?.top_prompts?.length > 0 ? (
              <div className="space-y-3">
                {stats.top_prompts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, width: '20px', textAlign: 'center', color: 'var(--accent-orange)' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-red)', marginLeft: '8px', flexShrink: 0 }}>{p.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nenhum dado ainda</p>
            )}
          </Card>

          <Card className="bg-white border" style={{ padding: '20px', borderRadius: '14px', borderColor: 'var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={16} style={{ color: 'var(--accent-red)' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-red)' }}>Alunos mais ativos</h2>
            </div>
            {stats?.top_students?.length > 0 ? (
              <div className="space-y-3">
                {stats.top_students.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, width: '20px', textAlign: 'center', color: 'var(--accent-orange)' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-red)', marginLeft: '8px', flexShrink: 0 }}>{s.count} red.</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nenhum dado ainda</p>
            )}
          </Card>
        </div>

        {/* Configuração de créditos */}
        <Card className="bg-white border" style={{ padding: '20px', borderRadius: '14px', borderColor: 'var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={16} style={{ color: 'var(--accent-red)' }} />
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-red)' }}>Créditos de Envio</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Configure quantas redações cada aluno pode enviar por período.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>Modo</label>
              <select value={creditConfig.mode} onChange={e => setCreditConfig({ ...creditConfig, mode: e.target.value })} style={selectStyle}>
                <option value="unlimited">Ilimitado</option>
                <option value="monthly">Limite por mês</option>
                <option value="weekly">Limite por semana</option>
              </select>
            </div>
            {creditConfig.mode !== 'unlimited' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Qtd. {creditConfig.mode === 'monthly' ? 'por mês' : 'por semana'}
                </label>
                <input
                  type="number" min="1" max="50"
                  value={creditConfig.limit}
                  onChange={e => setCreditConfig({ ...creditConfig, limit: parseInt(e.target.value) || 1 })}
                  style={{ ...selectStyle, width: '80px' }}
                />
              </div>
            )}
            <Button onClick={saveCreditConfig} disabled={savingCredits} size="sm" style={{ borderRadius: '8px' }}>
              <Save size={14} style={{ marginRight: '4px' }} />
              {savingCredits ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>

        {/* Ações rápidas */}
        <Card className="bg-white border" style={{ padding: '20px', borderRadius: '14px', borderColor: 'var(--border-color)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '14px' }}>Ações rápidas</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <a href="/admin/users"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', backgroundColor: 'var(--accent-red)', color: 'var(--bg-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
              data-testid="manage-users-button">
              <Users size={14} /> Gerenciar Usuários
            </a>
            <a href="/create-prompt"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              <BookOpen size={14} /> Criar Proposta
            </a>
            <a href="/correction-queue"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              <FileText size={14} /> Fila de Correções
            </a>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
