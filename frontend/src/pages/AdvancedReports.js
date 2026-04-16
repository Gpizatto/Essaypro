import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Trophy, TrendingUp, BookOpen, Download, Search, Users, BarChart3 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (!score) return '#6B5B4E';
  if (score >= 800) return '#36555A';
  if (score >= 600) return '#D66B27';
  if (score >= 400) return '#DAB257';
  return '#7C1805';
};

const MiniBar = ({ scores }) => {
  if (!scores?.length) return <span className="text-xs" style={{ color: '#6B5B4E' }}>—</span>;
  const max = Math.max(...scores, 200);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {scores.map((s, i) => (
        <div key={i} style={{
          width: '8px',
          height: `${Math.max(4, (s / max) * 24)}px`,
          backgroundColor: getScoreColor(s),
          borderRadius: '2px 2px 0 0',
        }} />
      ))}
    </div>
  );
};

export const AdvancedReports = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ranking');
  const [students, setStudents] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [engagement, setEngagement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('average_score');

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/api/admin/reports/ranking`, { withCredentials: true }),
      axios.get(`${API_URL}/api/admin/reports/prompts`, { withCredentials: true }),
      axios.get(`${API_URL}/api/admin/reports/course-engagement`, { withCredentials: true }).catch(() => ({ data: [] })),
    ]).then(([s, p, e]) => {
      setStudents(s.data);
      setPrompts(p.data);
      setEngagement(e.data || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const filtered = students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      if (sortBy === 'average_score') return b.average_score - a.average_score;
      if (sortBy === 'total_essays') return b.total_essays - a.total_essays;
      if (sortBy === 'evolution') return b.evolution - a.evolution;
      if (sortBy === 'frequency') return b.frequency_per_week - a.frequency_per_week;
      return 0;
    });
  }, [students, search, sortBy]);

  const handleExportRankingPDF = () => {
    exportToPDF('Ranking de Alunos — RcN', `
      <h1>Ranking de Desempenho dos Alunos</h1>
      <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${students.length} alunos</p>
      <table>
        <tr><th>#</th><th>Aluno</th><th>Redações</th><th>Média</th><th>Melhor</th><th>Evolução</th><th>Freq./sem</th></tr>
        ${filteredStudents.map((s, i) => `<tr>
          <td>${i + 1}</td><td>${s.name}</td><td>${s.total_essays}</td>
          <td>${s.average_score || '—'}</td><td>${s.best_score || '—'}</td>
          <td>${s.evolution > 0 ? '+' + s.evolution : s.evolution || '—'}</td>
          <td>${s.frequency_per_week}</td>
        </tr>`).join('')}
      </table>
    `);
  };

  const handleExportRankingExcel = () => {
    exportToExcel('ranking-alunos',
      ['#', 'Nome', 'Redações', 'Corrigidas', 'Reescritas', 'Média', 'Melhor Nota', 'Evolução', 'Freq./Semana', 'Último Envio'],
      filteredStudents.map((s, i) => [
        i + 1, s.name, s.total_essays, s.corrected, s.rewrites,
        s.average_score, s.best_score, s.evolution,
        s.frequency_per_week,
        s.last_submission ? new Date(s.last_submission).toLocaleDateString('pt-BR') : '',
      ])
    );
  };

  const handleExportPromptsPDF = () => {
    exportToPDF('Análise de Propostas — RcN', `
      <h1>Análise das Propostas</h1>
      <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
      <table>
        <tr><th>Proposta</th><th>Envios</th><th>Corrigidas</th><th>Média</th><th>Dificuldade</th></tr>
        ${prompts.map(p => `<tr>
          <td>${p.title}</td><td>${p.total_submissions}</td><td>${p.corrected}</td>
          <td>${p.average_score || '—'}</td><td>${p.difficulty}</td>
        </tr>`).join('')}
      </table>
    `);
  };

  const handleExportPromptsExcel = () => {
    exportToExcel('analise-propostas',
      ['Proposta', 'Total Envios', 'Corrigidas', 'Média', 'Dificuldade'],
      prompts.map(p => [p.title, p.total_submissions, p.corrected, p.average_score, p.difficulty])
    );
  };

  const selectStyle = {
    padding: '6px 10px', borderRadius: '6px',
    border: '1px solid #E8DDD0', fontSize: '13px',
    color: '#2C1A0E', backgroundColor: '#FFF',
  };

  const TABS = [
    { key: 'ranking', label: 'Ranking de Alunos', icon: Trophy },
    { key: 'prompts', label: 'Análise de Propostas', icon: BookOpen },
    { key: 'engagement', label: 'Engajamento por Turma', icon: Users },
  ];

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
            Relatórios Avançados
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            Ranking, frequência, evolução por competência e análise de propostas
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: '#F0EBE3' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all"
              style={{
                backgroundColor: tab === t.key ? '#7C1805' : 'transparent',
                color: tab === t.key ? '#FDF3E8' : '#6B5B4E',
              }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── RANKING ── */}
        {tab === 'ranking' && (
          <div className="space-y-4">
            {/* Filtros + Export */}
            <Card className="p-3 bg-white border">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5B4E' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar aluno..."
                    style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E', outline: 'none' }} />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
                  <option value="average_score">Ordenar: Maior média</option>
                  <option value="total_essays">Ordenar: Mais ativas</option>
                  <option value="evolution">Ordenar: Maior evolução</option>
                  <option value="frequency">Ordenar: Maior frequência</option>
                </select>
                <button onClick={handleExportRankingPDF}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border"
                  style={{ borderColor: '#7C1805', color: '#7C1805' }}>
                  <Download size={12} /> PDF
                </button>
                <button onClick={handleExportRankingExcel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border"
                  style={{ borderColor: '#36555A', color: '#36555A' }}>
                  <Download size={12} /> Excel
                </button>
              </div>
            </Card>

            {/* Pódio top 3 */}
            {filteredStudents.length >= 3 && (
              <div className="grid grid-cols-3 gap-3">
                {[1, 0, 2].map((pos) => {
                  const s = filteredStudents[pos];
                  if (!s) return null;
                  const medals = ['🥇', '🥈', '🥉'];
                  const sizes = ['text-2xl', 'text-xl', 'text-xl'];
                  return (
                    <Card key={pos}
                      className="p-4 bg-white border shadow-sm text-center cursor-pointer hover:shadow-md transition-shadow"
                      style={{ borderTop: pos === 0 ? '3px solid #DAB257' : pos === 1 ? '3px solid #6B5B4E' : '3px solid #A05020' }}
                      onClick={() => navigate(`/teacher/student/${s.id}`)}>
                      <p className={`${sizes[pos === 0 ? 0 : pos === 1 ? 1 : 2]} mb-1`}>{medals[pos]}</p>
                      <p className="font-semibold text-sm truncate" style={{ color: '#2C1A0E' }}>{s.name}</p>
                      <p className="text-2xl font-black mt-1" style={{ color: getScoreColor(s.average_score) }}>
                        {Math.round(s.average_score) || '—'}
                      </p>
                      <p className="text-xs" style={{ color: '#6B5B4E' }}>média</p>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Tabela completa */}
            <Card className="bg-white border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#FDF3E8', borderBottom: '1px solid #E8DDD0' }}>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>#</th>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>ALUNO</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>RED.</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>MÉDIA</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>MELHOR</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>EVOLUÇÃO</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>PROGRESSO</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>FREQ./SEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                      <tr key={s.id}
                        className="cursor-pointer hover:bg-orange-50 transition-colors"
                        style={{ borderBottom: '1px solid #F0EBE3' }}
                        onClick={() => navigate(`/teacher/student/${s.id}`)}>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: '#6B5B4E' }}>{i + 1}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: '#2C1A0E' }}>{s.name}</td>
                        <td className="px-3 py-3 text-center text-xs" style={{ color: '#6B5B4E' }}>{s.total_essays}</td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: getScoreColor(s.average_score) }}>
                          {Math.round(s.average_score) || '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: getScoreColor(s.best_score) }}>
                          {s.best_score || '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {s.evolution > 0
                            ? <span className="text-xs font-bold" style={{ color: '#36555A' }}>▲ +{s.evolution}</span>
                            : s.evolution < 0
                            ? <span className="text-xs font-bold" style={{ color: '#7C1805' }}>▼ {s.evolution}</span>
                            : <span className="text-xs" style={{ color: '#6B5B4E' }}>—</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <MiniBar scores={s.scores_history} />
                        </td>
                        <td className="px-3 py-3 text-center text-xs" style={{ color: '#6B5B4E' }}>
                          {s.frequency_per_week}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 text-xs" style={{ color: '#6B5B4E', borderTop: '1px solid #F0EBE3' }}>
                {filteredStudents.length} aluno{filteredStudents.length !== 1 ? 's' : ''}
              </div>
            </Card>
          </div>
        )}

        {/* ── PROPOSTAS ── */}
        {tab === 'prompts' && (
          <div className="space-y-4">
            <Card className="p-3 bg-white border">
              <div className="flex gap-2 justify-end">
                <button onClick={handleExportPromptsPDF}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border"
                  style={{ borderColor: '#7C1805', color: '#7C1805' }}>
                  <Download size={12} /> PDF
                </button>
                <button onClick={handleExportPromptsExcel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border"
                  style={{ borderColor: '#36555A', color: '#36555A' }}>
                  <Download size={12} /> Excel
                </button>
              </div>
            </Card>

            <Card className="bg-white border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#FDF3E8', borderBottom: '1px solid #E8DDD0' }}>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>PROPOSTA</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>ENVIOS</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>CORRIGIDAS</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>MÉDIA</th>
                      <th className="text-center px-3 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>DIFICULDADE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prompts.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: '#2C1A0E' }}>{p.title}</td>
                        <td className="px-3 py-3 text-center text-xs" style={{ color: '#6B5B4E' }}>{p.total_submissions}</td>
                        <td className="px-3 py-3 text-center text-xs" style={{ color: '#6B5B4E' }}>{p.corrected}</td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: getScoreColor(p.average_score) }}>
                          {p.average_score || '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: p.difficulty === 'Alta' ? '#FEF2F2' : p.difficulty === 'Média' ? '#FFF8F0' : '#F0F5F5',
                              color: p.difficulty === 'Alta' ? '#7C1805' : p.difficulty === 'Média' ? '#D66B27' : '#36555A',
                            }}>
                            {p.difficulty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {prompts.length === 0 && (
                <div className="p-8 text-center">
                  <BookOpen size={36} className="mx-auto mb-2" style={{ color: '#D66B27' }} />
                  <p className="text-sm" style={{ color: '#6B5B4E' }}>Nenhuma proposta com dados ainda</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};
