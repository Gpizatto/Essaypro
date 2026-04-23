import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useBranding } from '../contexts/BrandingContext';
import { Palette, Save, RotateCcw, Eye } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULTS = {
  platform_name: 'redação com nicolle',
  logo_url: '',
  favicon_url: '',
  primary_color: '#7C1805',
  secondary_color: '#D66B27',
  accent_color: '#36555A',
  role_student: 'Aluno',
  role_teacher: 'Professor',
  role_admin: 'Admin',
  welcome_message: '',
  footer_text: '',
};

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
  const [savedOk, setSavedOk] = useState(false); // U-07

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
      setDirty(false);
      setSavedOk(true);  // U-07: exibir banner de confirmação
      setTimeout(() => setSavedOk(false), 3500);
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
      <div className="space-y-5 w-full max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl" style={{ color: '#7C1805' }}>
              Personalização da Plataforma
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
              White label — adapte a plataforma à sua marca
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={reset} title="Restaurar padrões">
              <RotateCcw size={14} className="mr-1" /> Padrão
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              <Save size={14} className="mr-1" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* U-07: feedback visual de save */}
        {savedOk && (
          <div className="px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
            style={{ backgroundColor: '#F0FDF4', border: '1px solid #16A34A', color: '#16A34A' }}>
            ✓ Personalização salva e aplicada com sucesso!
          </div>
        )}
        {dirty && !savedOk && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: '#FFF8F0', border: '1px solid #D66B27', color: '#D66B27' }}>
            <Palette size={14} /> Alterações não salvas
          </div>
        )}

        {/* IDENTIDADE */}
        <Card className="p-4 sm:p-5 bg-white border shadow-sm">
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
        <Card className="p-4 sm:p-5 bg-white border shadow-sm">
          <p className="text-xs font-bold mb-1" style={{ color: '#D66B27' }}>CORES</p>
          <p className="text-xs mb-3" style={{ color: '#6B5B4E' }}>
            As cores são aplicadas imediatamente após salvar.
          </p>

          {[
            { key: 'primary_color', label: 'Cor primária', desc: 'Sidebar, títulos, botões principais' },
            { key: 'secondary_color', label: 'Cor secundária', desc: 'Destaques, badges, ícones' },
            { key: 'accent_color', label: 'Cor de acento', desc: 'Botões de confirmação, status corrigida' },
          ].map(({ key, label, desc }) => (
            <Field key={key} label={label} description={desc}>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <input type="color" value={form[key]}
                  onChange={e => update(key, e.target.value)}
                  aria-label={`Selecionar ${label}`}
                  style={{ width: '48px', height: '36px', border: '1px solid #E8DDD0', borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                />
                <Input value={form[key]} onChange={e => update(key, e.target.value)}
                  style={{ width: '130px', fontFamily: 'monospace', fontSize: '13px' }}
                  placeholder="#7C1805" />
                <div className="w-8 h-8 rounded-full border flex-shrink-0" style={{ backgroundColor: form[key], borderColor: '#E8DDD0' }} />
              </div>
            </Field>
          ))}
        </Card>

        {/* NOMES DOS PERFIS */}
        <Card className="p-4 sm:p-5 bg-white border shadow-sm">
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
        <Card className="p-4 sm:p-5 bg-white border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} style={{ color: '#7C1805' }} />
            <p className="text-sm font-semibold" style={{ color: '#7C1805' }}>Preview</p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: form.primary_color }}>
            <p className="font-bold text-white text-lg" style={{ fontFamily: 'Calligraffitti, cursive' }}>
              {form.platform_name || 'nome da plataforma'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="px-3 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: form.primary_color }}>
              Botão primário
            </button>
            <button className="px-3 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: form.secondary_color }}>
              Secundário
            </button>
            <button className="px-3 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: form.accent_color }}>
              Acento
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {['role_student', 'role_teacher', 'role_admin'].map(k => (
              <span key={k} className="text-xs px-2 py-1 rounded-full font-semibold text-white"
                style={{ backgroundColor: form.primary_color }}>
                {form[k]}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};
