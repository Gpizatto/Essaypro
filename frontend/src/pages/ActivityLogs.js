import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Activity, Search, Download, Filter } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ACTION_CONFIG = {
  published_correction:  { label: 'Publicou correção',     color: 'var(--accent-green)', icon: '✅' },
  changed_user_role:     { label: 'Alterou função',         color: 'var(--accent-orange)', icon: '👤' },
  changed_score:         { label: 'Alterou nota',           color: 'var(--accent-red)', icon: '📝' },
  deleted_essay:         { label: 'Removeu redação',        color: 'var(--accent-red)', icon: '🗑️' },
  saved_draft:           { label: 'Salvou rascunho',        color: '#DAB257', icon: '💾' },
  archived_prompt:       { label: 'Arquivou proposta',      color: 'var(--text-secondary)', icon: '📦' },
  downloaded_file:       { label: 'Baixou arquivo',         color: 'var(--text-secondary)', icon: '⬇️' },
};

const getActionConfig = (action) =>
  ACTION_CONFIG[action] || { label: action, color: 'var(--text-secondary)', icon: '•' };

export const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const searchTimerRef = useRef(null);

  const fetchLogs = async (searchTerm = '', action = 'all', page = 1) => {
    setLoading(true);
    try {
      // P-08: busca e filtro server-side
      const params = new URLSearchParams({ limit: 100, page });
      if (searchTerm) params.set('search', searchTerm);
      if (action !== 'all') params.set('action', action);
      const { data } = await axios.get(`${API_URL}/api/admin/activity-logs?${params}`, { withCredentials: true });
      // Suporte ao novo formato { logs, total } e legado (array)
      setLogs(Array.isArray(data) ? data : (data.logs || []));
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchLogs(value, filterAction), 400);
  };

  const handleActionFilterChange = (value) => {
    setFilterAction(value);
    fetchLogs(search, value);
  };;

  // P-08: busca e action filtrados server-side
  const filtered = logs;

  const handleExportExcel = () => {
    exportToExcel('logs-atividade',
      ['Data/Hora', 'Usuário', 'Ação', 'Tipo', 'Detalhe'],
      filtered.map(l => [
        new Date(l.created_at).toLocaleString('pt-BR'),
        l.user_name,
        getActionConfig(l.action).label,
        l.entity_type,
        l.detail || '',
      ])
    );
  };

  const selectStyle = {
    padding: '10px 10px', borderRadius: '6px', minHeight: '44px',
    border: '1px solid var(--border-color)', fontSize: '13px',
    color: 'var(--text-primary)', backgroundColor: '#FFF',
  };

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-96 bg-muted rounded" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: 'var(--accent-red)' }}>
            Logs de Atividade
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Histórico de ações realizadas na plataforma
          </p>
        </div>

        {/* Filtros */}
        <Card className="p-3 bg-white border">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input value={search} onChange={e => handleSearchChange(e.target.value)}
                placeholder="Buscar por usuário ou detalhe..."
                style={{ width: '100%', padding: '10px 10px 10px 32px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '16px', color: 'var(--text-primary)', outline: 'none', minHeight: '44px', boxSizing: 'border-box' }} />
            </div>
            <select value={filterAction} onChange={e => handleActionFilterChange(e.target.value)} style={selectStyle}>
              <option value="all">Todas as ações</option>
              {Object.entries(ACTION_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 rounded text-xs font-semibold border" style={{ minHeight: "40px" }}
              style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>
              <Download size={12} /> Excel
            </button>
          </div>
        </Card>

        {/* Tabela */}
        <Card className="bg-white border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Activity size={36} className="mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {logs.length === 0 ? 'Nenhuma atividade registrada ainda' : 'Nenhum resultado encontrado'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th className="text-left px-4 py-3 text-xs font-bold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '120px' }}>DATA/HORA</th>
                      <th className="text-left px-4 py-3 text-xs font-bold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '130px' }}>USUÁRIO</th>
                      <th className="text-left px-4 py-3 text-xs font-bold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '150px' }}>AÇÃO</th>
                      <th className="text-left px-4 py-3 text-xs font-bold whitespace-nowrap" style={{ color: 'var(--accent-red)', minWidth: '200px' }}>DETALHE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log, i) => {
                      const cfg = getActionConfig(log.action);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F0EBE3' }}>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {log.user_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {log.detail || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)', borderTop: '1px solid #F0EBE3' }}>
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== logs.length && ` (de ${logs.length} total)`}
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};
