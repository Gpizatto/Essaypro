import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Activity, Search, Download, Filter } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ACTION_CONFIG = {
  published_correction:  { label: 'Publicou correção',     color: '#36555A', icon: '✅' },
  changed_user_role:     { label: 'Alterou função',         color: '#D66B27', icon: '👤' },
  changed_score:         { label: 'Alterou nota',           color: '#7C1805', icon: '📝' },
  deleted_essay:         { label: 'Removeu redação',        color: '#7C1805', icon: '🗑️' },
  saved_draft:           { label: 'Salvou rascunho',        color: '#DAB257', icon: '💾' },
  archived_prompt:       { label: 'Arquivou proposta',      color: '#6B5B4E', icon: '📦' },
  downloaded_file:       { label: 'Baixou arquivo',         color: '#6B5B4E', icon: '⬇️' },
};

const getActionConfig = (action) =>
  ACTION_CONFIG[action] || { label: action, color: '#6B5B4E', icon: '•' };

export const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/activity-logs?limit=200`, { withCredentials: true });
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => logs.filter(log => {
    const matchSearch =
      (log.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.detail || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchAction;
  }), [logs, search, filterAction]);

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
    padding: '6px 10px', borderRadius: '6px',
    border: '1px solid #E8DDD0', fontSize: '13px',
    color: '#2C1A0E', backgroundColor: '#FFF',
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
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
            Logs de Atividade
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            Histórico de ações realizadas na plataforma
          </p>
        </div>

        {/* Filtros */}
        <Card className="p-3 bg-white border">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5B4E' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por usuário ou detalhe..."
                style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E', outline: 'none' }} />
            </div>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={selectStyle}>
              <option value="all">Todas as ações</option>
              {Object.entries(ACTION_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border"
              style={{ borderColor: '#36555A', color: '#36555A' }}>
              <Download size={12} /> Excel
            </button>
          </div>
        </Card>

        {/* Tabela */}
        <Card className="bg-white border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Activity size={36} className="mx-auto mb-2" style={{ color: '#D66B27' }} />
              <p className="text-sm" style={{ color: '#6B5B4E' }}>
                {logs.length === 0 ? 'Nenhuma atividade registrada ainda' : 'Nenhum resultado encontrado'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#FDF3E8', borderBottom: '1px solid #E8DDD0' }}>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>DATA/HORA</th>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>USUÁRIO</th>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>AÇÃO</th>
                      <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#7C1805' }}>DETALHE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log, i) => {
                      const cfg = getActionConfig(log.action);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F0EBE3' }}>
                          <td className="px-4 py-3 text-xs" style={{ color: '#6B5B4E', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: '#2C1A0E' }}>
                            {log.user_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#6B5B4E' }}>
                            {log.detail || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 text-xs" style={{ color: '#6B5B4E', borderTop: '1px solid #F0EBE3' }}>
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
