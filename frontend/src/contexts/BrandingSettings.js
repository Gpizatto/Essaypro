import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useBranding, BRANDING_DEFAULTS } from '../contexts/BrandingContext';
import { Palette, Save, RotateCcw, Eye } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULTS = BRANDING_DEFAULTS;

const Field = ({ label, description, children }) => (
  <div className="py-3" style={{ borderBottom: '1px solid #F0EBE3' }}>
    <label className="text-sm font-semibold block mb-0.5" style={{ color: '#2C1A0E' }}>{label}</label>
    {description && <p className="text-xs mb-2" style={{ color: '#6B5B4E' }}>{description}</p>}
    {children}
  </div>
);

export const BrandingSettings = () => {
  const { setBranding } = useBranding();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetchBranding(); }, []);

  const fetchBranding = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/settings/branding`, { withCredentials: true });
      setForm({ ...DEFAULTS, ...data });
    } catch (e) { toast.error('Erro ao carregar configurações'); }
    finally { setLoading(false); }
  };

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/settings/branding`, form, { withCredentials: true });
      setBranding(form); // atualiza contexto global imediatamente
      toast.success('Personalização salva!');
      setDirty(false);
    } catch (e) { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const reset = () => {
    setForm(DEFAULTS);
    setDirty(true);
  };

  const inputStyle = { marginTop: '4px' };

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
              Personalização da Plataforma
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              White label — adapte a plataforma à sua marca
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
            <Palette size={14} /> Alterações não salvas
          </div>
        )}

        {/* IDENTIDADE */}
        <Card className="p-5 bg-white border shadow-sm">
          <p className="text-xs font-bold mb-1" style={{ color: '#D66B27' }}>IDENTIDADE</p>

          <Field label="Nome da plataforma" description="Aparece no topo do sidebar e na aba do browser">
            <Input style={inputStyle} value={form.platform_name}
              onChange={e => update('platform_name', e.target.value)}
              placeholder="redação com nicolle" />
          </Field>

          <Field label="URL do logo" description="Link direto para imagem PNG/SVG (recomendado: fundo transparente)">
            <Input style={inputStyle} value={form.logo_url}
              onChange={e => update('logo_url', e.target.value)}
              placeholder="https://..." />
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo preview" className="mt-2 h-10 object-contain rounded" />
            )}
          </Field>

          <Field label="URL do favicon" description="Ícone que aparece na aba do browser (formato .ico ou .png 32x32)">
            <Input style={inputStyle} value={form.favicon_url}
              onChange={e => update('favicon_url', e.target.value)}
              placeholder="https://..." />
          </Field>

          <Field label="Mensagem de boas-vindas" description="Exibida na tela de login">
            <Textarea style={inputStyle} rows={2} value={form.welcome_message}
              onChange={e => update('welcome_message', e.target.value)}
              placeholder="Bem-vinda! Aqui você corrige e evolui." />
          </Field>

          <Field label="Texto do rodapé" description="Aparece no final das páginas">
            <Input style={inputStyle} value={form.footer_text}
              onChange={e => update('footer_text', e.target.value)}
              placeholder="© 2025 redação com nicolle" />
          </Field>
        </Card>

        {/* CORES */}
        <Card className="p-5 bg-white border shadow-sm">
          <p className="text-xs font-bold mb-1" style={{ color: '#D66B27' }}>CORES</p>
          <p className="text-xs mb-3" style={{ color: '#6B5B4E' }}>
            As cores são aplicadas em toda a plataforma imediatamente após salvar.
          </p>

          {/* Grupo: Cores de destaque */}
          <p className="text-xs font-semibold mt-2 mb-1" style={{ color: '#6B5B4E' }}>Cores de destaque</p>
          {[
            { key: 'primary_color',   label: 'Cor primária',   desc: 'Sidebar, títulos, botões principais, bordas de ênfase' },
            { key: 'secondary_color', label: 'Cor secundária', desc: 'Destaques, badges, ícones, scrollbar' },
            { key: 'accent_color',    label: 'Cor de acento',  desc: 'Botões de confirmação, status "corrigida", links' },
          ].map(({ key, label, desc }) => (
            <Field key={key} label={label} description={desc}>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form[key] || '#000000'}
                  onChange={e => update(key, e.target.value)}
                  style={{ width: '48px', height: '36px', border: '1px solid #E8DDD0', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                />
                <Input value={form[key]} onChange={e => update(key, e.target.value)}
                  style={{ width: '120px', fontFamily: 'monospace', fontSize: '13px' }}
                  placeholder="#7C1805" />
                <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: form[key], borderColor: '#E8DDD0' }} />
              </div>
            </Field>
          ))}

          {/* Grupo: Cores de fundo e texto */}
          <p className="text-xs font-semibold mt-4 mb-1" style={{ color: '#6B5B4E' }}>Fundo e texto</p>
          {[
            { key: 'bg_color',       label: 'Cor de fundo',        desc: 'Fundo geral da plataforma (área principal)' },
            { key: 'bg_card_color',  label: 'Cor dos cards',       desc: 'Fundo dos cards, modais e painéis' },
            { key: 'text_color',     label: 'Cor do texto',        desc: 'Texto principal em toda a plataforma' },
            { key: 'text_soft_color',label: 'Cor do texto suave',  desc: 'Textos secundários, labels, descrições' },
            { key: 'border_color',   label: 'Cor das bordas',      desc: 'Bordas de cards, inputs e separadores' },
          ].map(({ key, label, desc }) => (
            <Field key={key} label={label} description={desc}>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form[key] || '#000000'}
                  onChange={e => update(key, e.target.value)}
                  style={{ width: '48px', height: '36px', border: '1px solid #E8DDD0', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                />
                <Input value={form[key]} onChange={e => update(key, e.target.value)}
                  style={{ width: '120px', fontFamily: 'monospace', fontSize: '13px' }}
                  placeholder="#FDF3E8" />
                <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: form[key], borderColor: '#E8DDD0' }} />
              </div>
            </Field>
          ))}
        </Card>

        {/* NOMES DOS PERFIS */}
        <Card className="p-5 bg-white border shadow-sm">
          <p className="text-xs font-bold mb-1" style={{ color: '#D66B27' }}>NOMES DOS PERFIS</p>
          <p className="text-xs mb-3" style={{ color: '#6B5B4E' }}>
            Customize como cada papel é chamado na plataforma.
          </p>

          {[
            { key: 'role_student', label: 'Nome do aluno', placeholder: 'Aluno' },
            { key: 'role_teacher', label: 'Nome do professor/corretor', placeholder: 'Professor' },
            { key: 'role_admin', label: 'Nome do administrador', placeholder: 'Admin' },
          ].map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <Input style={inputStyle} value={form[key]}
                onChange={e => update(key, e.target.value)}
                placeholder={placeholder} />
            </Field>
          ))}
        </Card>

        {/* Preview */}
        <Card className="p-5 bg-white border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} style={{ color: '#7C1805' }} />
            <p className="text-sm font-semibold" style={{ color: '#7C1805' }}>Preview em tempo real</p>
          </div>
          {/* Simulação da sidebar */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${form.border_color || '#E8DDD0'}`, minHeight: '140px' }}>
            <div className="w-32 p-3 flex flex-col gap-2" style={{ backgroundColor: form.primary_color || '#7C1805' }}>
              <p className="text-xs font-bold text-white opacity-90" style={{ fontFamily: 'Calligraffitti, cursive' }}>
                {form.platform_name || 'Plataforma'}
              </p>
              {['Dashboard', 'Redações', 'Correções'].map(item => (
                <div key={item} className="text-xs px-2 py-1 rounded" style={{ color: 'rgba(255,255,255,0.8)' }}>{item}</div>
              ))}
            </div>
            {/* Simulação do conteúdo */}
            <div className="flex-1 p-3" style={{ backgroundColor: form.bg_color || '#FDF3E8' }}>
              <p className="text-xs font-bold mb-2" style={{ color: form.text_color || '#2C1A0E' }}>Título da página</p>
              <p className="text-xs mb-2" style={{ color: form.text_soft_color || '#6B5B4E' }}>Texto descritivo da página com cor suave.</p>
              <div className="p-2 rounded" style={{ backgroundColor: form.bg_card_color || '#FFFFFF', border: `1px solid ${form.border_color || '#E8DDD0'}` }}>
                <p className="text-xs" style={{ color: form.text_color || '#2C1A0E' }}>Card de conteúdo</p>
              </div>
              <div className="flex gap-1 mt-2">
                <button className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: form.primary_color }}>Primário</button>
                <button className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: form.secondary_color }}>Secundário</button>
                <button className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: form.accent_color }}>Acento</button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
