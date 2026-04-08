import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Settings, Save, RotateCcw, Download, MessageSquare, User, Brain, Sparkles } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: '44px', height: '24px', borderRadius: '12px', position: 'relative',
      backgroundColor: checked ? '#36555A' : '#D1C5BC',
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.2s', flexShrink: 0,
    }}
  >
    <span style={{
      position: 'absolute', top: '3px',
      left: checked ? '23px' : '3px',
      width: '18px', height: '18px',
      borderRadius: '50%', backgroundColor: '#FFF',
      transition: 'left 0.2s', display: 'block',
    }} />
  </button>
);

const SettingRow = ({ icon: Icon, title, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4 py-4" style={{ borderBottom: '1px solid #F0EBE3' }}>
    <div className="flex items-start gap-3 flex-1">
      <div className="p-2 rounded-lg mt-0.5" style={{ backgroundColor: '#FDF3E8' }}>
        <Icon size={16} style={{ color: '#D66B27' }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>{description}</p>
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

export const CourseSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/settings/course`, { withCredentials: true });
      setSettings(data);
    } catch (err) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/settings/course`, settings, { withCredentials: true });
      toast.success('Configurações salvas com sucesso!');
      setDirty(false);
    } catch (err) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Restaurar todas as configurações para o padrão?')) return;
    const defaults = {
      show_teacher_name: true,
      allow_post_correction_doubt: true,
      allow_download: true,
      allow_rewrite: true,
      require_rewrite: false,
      allow_ai_analysis: true,
    };
    setSettings(defaults);
    setDirty(true);
  };

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
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
              Configurações Pedagógicas
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              Controle o que alunos e corretores podem fazer na plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset} title="Restaurar padrões">
              <RotateCcw size={14} className="mr-1" /> Padrão
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              <Save size={14} className="mr-1" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {dirty && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: '#FFF8F0', border: '1px solid #D66B27', color: '#D66B27' }}>
            <Settings size={14} />
            Há alterações não salvas
          </div>
        )}

        {/* SEÇÃO ALUNO */}
        <Card className="p-5 bg-white border shadow-sm">
          <p className="text-xs font-bold mb-1" style={{ color: '#D66B27' }}>ÁREA DO ALUNO</p>

          <SettingRow
            icon={User}
            title="Exibir nome do corretor"
            description="O aluno vê quem corrigiu a redação dele"
            checked={settings.show_teacher_name}
            onChange={v => update('show_teacher_name', v)}
          />
          <SettingRow
            icon={MessageSquare}
            title="Permitir dúvidas pós-correção"
            description="O aluno pode enviar uma mensagem após receber a correção"
            checked={settings.allow_post_correction_doubt}
            onChange={v => update('allow_post_correction_doubt', v)}
          />
          <SettingRow
            icon={Download}
            title="Permitir downloads"
            description="O aluno pode baixar redação e correção em arquivo"
            checked={settings.allow_download}
            onChange={v => update('allow_download', v)}
          />
          <SettingRow
            icon={RotateCcw}
            title="Permitir reescrita"
            description="O aluno pode enviar uma nova versão após ser corrigido"
            checked={settings.allow_rewrite}
            onChange={v => update('allow_rewrite', v)}
          />
          <div style={{ borderBottom: 'none' }}>
            <SettingRow
              icon={RotateCcw}
              title="Reescrita obrigatória"
              description="O aluno é obrigado a reescrever antes de enviar nova redação"
              checked={settings.require_rewrite}
              onChange={v => update('require_rewrite', v)}
              disabled={!settings.allow_rewrite}
            />
          </div>
        </Card>

        {/* SEÇÃO CORRETOR */}
        <Card className="p-5 bg-white border shadow-sm">
          <p className="text-xs font-bold mb-1" style={{ color: '#D66B27' }}>FERRAMENTAS DE CORREÇÃO</p>

          <div style={{ borderBottom: 'none' }}>
            <SettingRow
              icon={Sparkles}
              title="Análise por IA"
              description="Corretor pode usar IA para sugerir erros gramaticais no texto digitado"
              checked={settings.allow_ai_analysis}
              onChange={v => update('allow_ai_analysis', v)}
            />
          </div>
        </Card>

        {/* Legenda */}
        <p className="text-xs" style={{ color: '#6B5B4E' }}>
          As configurações são aplicadas globalmente para todos os usuários da plataforma.
          Alterações entram em vigor imediatamente após salvar.
        </p>
      </div>
    </Layout>
  );
};
