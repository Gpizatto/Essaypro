import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Users, FileText, CheckCircle, Award, Zap, Save, Clock, RotateCcw, BookOpen, TrendingUp, Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <Card className="p-5 bg-white border shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>{label}</p>
        <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>{sub}</p>}
      </div>
      <div className="p-2 rounded-md" style={{ backgroundColor: color }}>
        <Icon className="text-white" size={20} />
      </div>
    </div>
  </Card>
);

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingSelections, setPendingSelections] = useState({}); // {userId: {role, course_id}}
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
      alert('Configuração salva!');
    } catch (error) {
      alert('Erro ao salvar');
    } finally {
      setSavingCredits(false);
    }
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: '6px',
    border: '1px solid #E8DDD0', fontSize: '14px',
    color: '#2C1A0E', backgroundColor: '#FFF',
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-muted rounded" />)}
          </div>
        </div>
      </Layout>
    );
  }

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
      const detail = e.response?.data?.detail || 'Erro desconhecido';
      toast.error('Erro ao aprovar: ' + detail);
      console.error('approveUser error:', e.response?.data);
    }
  };

  const forceApproveByEmail = async (email) => {
    const emailInput = window.prompt('Email do usuário para aprovar:', email || '');
    if (!emailInput) return;
    try {
      const res = await axios.post(`${API_URL}/api/admin/force-approve`,
        { email: emailInput.toLowerCase().trim() },
        { withCredentials: true });
      const { user } = res.data || {};
      if (user?.is_approved) {
        toast.success(`✅ ${user.email} aprovado! Pode fazer login agora.`);
        fetchData();
      } else {
        toast.error('Aprovação falhou — usuário não encontrado?');
      }
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }} data-testid="admin-dashboard-title">
            Painel Administrativo
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>Visão geral da plataforma</p>
          {courses.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: '#6B5B4E' }}>Turma:</span>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px', color: '#2C1A0E' }}>
                <option value="all">Todas</option>
                {courses.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={handleRunBackup} disabled={runningBackup}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: '#6B5B4E', color: '#6B5B4E', backgroundColor: 'white' }}>
              {runningBackup ? '⏳ Salvando...' : '💾 Backup agora'}
            </button>
            {backups.length > 0 && (
              <span className="text-xs" style={{ color: '#6B5B4E', alignSelf: 'center' }}>
                Último: {new Date(backups[0].created_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={handleExportPDF}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: '#7C1805', color: '#7C1805', backgroundColor: 'white' }}>
              <Download size={13} /> PDF
            </button>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ borderColor: '#36555A', color: '#36555A', backgroundColor: 'white' }}>
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="USUÁRIOS" value={stats?.total_users || 0} icon={Users} color="#7C1805"
            sub={`${stats?.total_students || 0} alunos · ${stats?.total_teachers || 0} prof.`} />
          <StatCard label="REDAÇÕES" value={stats?.total_essays || 0} icon={FileText} color="#D66B27" />
          <StatCard label="PENDENTES" value={stats?.total_pending || 0} icon={Clock} color="#DAB257"
            sub={`${pendingRate}% do total`} />
          <StatCard label="CORRIGIDAS" value={stats?.total_corrections || 0} icon={CheckCircle} color="#36555A" />
          <StatCard label="REESCRITAS" value={stats?.total_rewrites || 0} icon={RotateCcw} color="#D9B2CF"
            sub="taxa de reenvio" />
          <StatCard label="MÉDIA GERAL" value={Math.round(stats?.average_score || 0)} icon={Award} color="#A03217" />
        </div>

        {/* APROVAÇÃO DE USUÁRIOS PENDENTES */}
        {pendingUsers.length > 0 && (
          <Card className="p-5 bg-white border shadow-sm" style={{ borderColor: '#DAB257' }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#D66B27' }} />
                <h2 className="font-semibold text-sm" style={{ color: '#7C1805' }}>
                  Aguardando aprovação ({pendingUsers.length})
                </h2>
              </div>
              <button
                onClick={() => forceApproveByEmail('')}
                className="text-xs px-2 py-1 rounded border font-semibold"
                style={{ borderColor: '#7C1805', color: '#7C1805' }}
                title="Aprovar por email (caso o botão normal falhe)"
              >
                ✉️ Aprovar por email
              </button>
            </div>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div key={u.id} className="p-3 rounded-lg"
                  style={{ backgroundColor: '#FDF3E8', border: '1px solid #E8DDD0' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>{u.name}</p>
                      <p className="text-xs mb-2" style={{ color: '#6B5B4E' }}>{u.email}</p>
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={pendingSelections[u.id]?.role || 'student'}
                          onChange={e => setPendingSelections(prev => ({ ...prev, [u.id]: { ...prev[u.id], role: e.target.value }}))}
                          style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', color: '#2C1A0E', backgroundColor: 'white' }}>
                          <option value="student">Aluno</option>
                          <option value="teacher">Professor</option>
                          <option value="admin">Admin</option>
                        </select>
                        {courses.length > 0 && (
                          <select
                            value={pendingSelections[u.id]?.course_id || ''}
                            onChange={e => setPendingSelections(prev => ({ ...prev, [u.id]: { ...prev[u.id], course_id: e.target.value }}))}
                            style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', color: '#2C1A0E', backgroundColor: 'white' }}>
                            <option value="">Sem turma</option>
                            {courses.filter(c => c.is_active).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => approveUser(u.id)}
                        className="px-3 py-1 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: '#36555A' }}>
                        ✓ Aprovar
                      </button>
                      <button onClick={() => rejectUser(u.id)}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ backgroundColor: '#FEF2F2', color: '#7C1805', border: '1px solid #FCA5A5' }}>
                        ✕ Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* FREQUÊNCIA DE ENVIO */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>ENVIOS (7 DIAS)</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#7C1805' }}>
                  {stats?.essays_last_7_days ?? 0}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>redações enviadas</p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: '#D9B2CF' }}>
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>ENVIOS (30 DIAS)</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#7C1805' }}>
                  {stats?.essays_last_30_days ?? 0}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>
                  ~{stats?.essays_last_30_days ? Math.round(stats.essays_last_30_days / 4) : 0}/semana
                </p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: '#DAB257' }}>
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
          </Card>
        </div>

        {/* APROVAÇÃO DE USUÁRIOS PENDENTES */}
        {pendingUsers.length > 0 && (
          <Card className="p-5 bg-white border shadow-sm" style={{ borderColor: '#DAB257' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#D66B27' }} />
              <h2 className="font-semibold text-sm" style={{ color: '#7C1805' }}>
                Aguardando aprovação ({pendingUsers.length})
              </h2>
            </div>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div key={u.id} className="p-3 rounded-lg"
                  style={{ backgroundColor: '#FDF3E8', border: '1px solid #E8DDD0' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>{u.name}</p>
                      <p className="text-xs mb-2" style={{ color: '#6B5B4E' }}>{u.email}</p>
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={pendingSelections[u.id]?.role || 'student'}
                          onChange={e => setPendingSelections(prev => ({ ...prev, [u.id]: { ...prev[u.id], role: e.target.value }}))}
                          style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', color: '#2C1A0E', backgroundColor: 'white' }}>
                          <option value="student">Aluno</option>
                          <option value="teacher">Professor</option>
                          <option value="admin">Admin</option>
                        </select>
                        {courses.length > 0 && (
                          <select
                            value={pendingSelections[u.id]?.course_id || ''}
                            onChange={e => setPendingSelections(prev => ({ ...prev, [u.id]: { ...prev[u.id], course_id: e.target.value }}))}
                            style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', color: '#2C1A0E', backgroundColor: 'white' }}>
                            <option value="">Sem turma</option>
                            {courses.filter(c => c.is_active).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => approveUser(u.id)}
                        className="px-3 py-1 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: '#36555A' }}>
                        ✓ Aprovar
                      </button>
                      <button onClick={() => rejectUser(u.id)}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ backgroundColor: '#FEF2F2', color: '#7C1805', border: '1px solid #FCA5A5' }}>
                        ✕ Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* FREQUÊNCIA DE ENVIO */}
        {(stats?.essays_last_7_days !== undefined || stats?.essays_last_30_days !== undefined) && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 bg-white border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>ENVIOS — ÚLTIMOS 7 DIAS</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#D66B27' }}>
                    {stats?.essays_last_7_days || 0}
                  </p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: '#D66B27' }}>
                  <TrendingUp className="text-white" size={20} />
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>ENVIOS — ÚLTIMOS 30 DIAS</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#D66B27' }}>
                    {stats?.essays_last_30_days || 0}
                  </p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: '#DAB257' }}>
                  <TrendingUp className="text-white" size={20} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* SEGUNDA LINHA — Top propostas + Top alunos */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Propostas mais enviadas */}
          <Card className="p-5 bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} style={{ color: '#7C1805' }} />
              <h2 className="font-heading font-semibold text-base" style={{ color: '#7C1805' }}>
                Propostas mais enviadas
              </h2>
            </div>
            {stats?.top_prompts?.length > 0 ? (
              <div className="space-y-3">
                {stats.top_prompts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold w-5 text-center" style={{ color: '#D66B27' }}>{i + 1}</span>
                      <span className="text-sm truncate" style={{ color: '#2C1A0E' }}>{p.title}</span>
                    </div>
                    <span className="text-sm font-bold ml-2 shrink-0" style={{ color: '#7C1805' }}>{p.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#6B5B4E' }}>Nenhum dado ainda</p>
            )}
          </Card>

          {/* Alunos mais ativos */}
          <Card className="p-5 bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} style={{ color: '#7C1805' }} />
              <h2 className="font-heading font-semibold text-base" style={{ color: '#7C1805' }}>
                Alunos mais ativos
              </h2>
            </div>
            {stats?.top_students?.length > 0 ? (
              <div className="space-y-3">
                {stats.top_students.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold w-5 text-center" style={{ color: '#D66B27' }}>{i + 1}</span>
                      <span className="text-sm truncate" style={{ color: '#2C1A0E' }}>{s.name}</span>
                    </div>
                    <span className="text-sm font-bold ml-2 shrink-0" style={{ color: '#7C1805' }}>
                      {s.count} red.
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#6B5B4E' }}>Nenhum dado ainda</p>
            )}
          </Card>
        </div>

        {/* CONFIGURAÇÃO DE CRÉDITOS */}
        <Card className="p-5 bg-white border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} style={{ color: '#7C1805' }} />
            <h2 className="font-heading font-semibold text-base" style={{ color: '#7C1805' }}>
              Créditos de Envio
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: '#6B5B4E' }}>
            Configure quantas redações cada aluno pode enviar por período.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#2C1A0E' }}>Modo</label>
              <select
                value={creditConfig.mode}
                onChange={e => setCreditConfig({ ...creditConfig, mode: e.target.value })}
                style={selectStyle}
              >
                <option value="unlimited">Ilimitado</option>
                <option value="monthly">Limite por mês</option>
                <option value="weekly">Limite por semana</option>
              </select>
            </div>
            {creditConfig.mode !== 'unlimited' && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: '#2C1A0E' }}>
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
            <Button onClick={saveCreditConfig} disabled={savingCredits} size="sm">
              <Save size={14} className="mr-1" />
              {savingCredits ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>

        {/* AÇÕES RÁPIDAS */}
        <Card className="p-5 bg-white border shadow-sm">
          <h2 className="font-heading font-semibold text-base mb-4" style={{ color: '#7C1805' }}>
            Ações rápidas
          </h2>
          <div className="flex flex-wrap gap-3">
            <a href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm text-white"
              style={{ backgroundColor: '#7C1805' }} data-testid="manage-users-button">
              <Users size={15} /> Gerenciar Usuários
            </a>
            <a href="/create-prompt"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm border"
              style={{ borderColor: '#7C1805', color: '#7C1805' }}>
              <BookOpen size={15} /> Criar Proposta
            </a>
            <a href="/correction-queue"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm border"
              style={{ borderColor: '#36555A', color: '#36555A' }}>
              <FileText size={15} /> Fila de Correções
            </a>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
