import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Plus, X } from 'lucide-react';

const CATEGORIES = [
  { key: 'all',          label: 'Todas' },
  { key: 'gramatica',    label: 'Gramática' },
  { key: 'coesao',       label: 'Coesão' },
  { key: 'argumentacao', label: 'Argumentação' },
  { key: 'repertorio',   label: 'Repertório' },
  { key: 'proposta',     label: 'Proposta' },
  { key: 'conclusao',    label: 'Conclusão' },
  { key: 'geral',        label: 'Geral' },
];

export const CommentPopup = ({
  // Click comment (imagem/PDF)
  showClickCommentPopup, setShowClickCommentPopup,
  clickCommentText, setClickCommentText, clickCommentCanvasPos,
  // Text comment
  showCommentPopup, setShowCommentPopup,
  commentText, setCommentText, selectedTextRange,
  // Shared state
  handleAddComment,
  quickComments, sharedComments,
  filteredQuickComments, recentComments, topFrequent,
  quickCommentSearch, setQuickCommentSearch,
  quickCommentCategory, setQuickCommentCategory,
  showAddQuickComment, setShowAddQuickComment,
  newQuickComment, setNewQuickComment,
  newQuickCommentCategory, setNewQuickCommentCategory,
  handleUseQuickComment, handleDeleteQuickComment,
  saveQuickComments, setInlineComments,
}) => {
  return (
    <>
  {/* POPUP DE COMENTÁRIO EM IMAGEM/PDF — por clique, sem seleção de texto */}
  {showClickCommentPopup && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => setShowClickCommentPopup(false)}>
      <div className="bg-white rounded-xl p-6 w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold" style={{ color: '#7C1805' }}>💬 Comentário na imagem</h3>
          <button onClick={() => setShowClickCommentPopup(false)} style={{ color: '#6B5B4E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
        <textarea
          autoFocus
          value={clickCommentText}
          onChange={e => setClickCommentText(e.target.value)}
          rows={4}
          placeholder="Digite seu comentário sobre este trecho..."
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E8DDD0', fontSize: '14px', resize: 'vertical' }}
        />
        {/* Sugestões rápidas */}
        <div className="flex flex-wrap gap-1 mt-2 mb-4">
          {['Atenção à ortografia', 'Revisar pontuação', 'Boa argumentação', 'Desenvolver mais', 'Coesão textual'].map(s => (
            <button key={s} onClick={() => setClickCommentText(s)}
              className="text-xs px-2 py-1 rounded-full border"
              style={{ borderColor: '#E8DDD0', color: '#6B5B4E', backgroundColor: 'white' }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowClickCommentPopup(false)}
            className="px-4 py-2 rounded text-sm" style={{ border: '1px solid #E8DDD0', color: '#6B5B4E' }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              if (clickCommentText.trim()) {
                setInlineComments(prev => [...prev, {
                  id: prev.length + 1,
                  selected_text: '📍 Marcação na imagem',
                  comment: clickCommentText.trim(),
                  color: '#FEF3C7',
                  canvasX: clickCommentCanvasPos.x,
                  canvasY: clickCommentCanvasPos.y,
                }]);
                // Auto-salvar modelo de texto se não existir ainda
                const trimmedClick = clickCommentText.trim();
                const allSavedClick = [...quickComments, ...sharedComments];
                const existsClick = allSavedClick.some(
                  qc => qc.text.trim().toLowerCase() === trimmedClick.toLowerCase()
                );
                if (!existsClick && trimmedClick.length >= 3) {
                  const autoEntry = {
                    id: `qc_auto_${Date.now()}`,
                    text: trimmedClick,
                    use_count: 1,
                    last_used_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    category: 'geral',
                  };
                  saveQuickComments([...quickComments, autoEntry]);
                  toast.success('Comentário adicionado e salvo no banco de modelos ✓', { duration: 3000 });
                } else {
                  toast.success('Comentário adicionado!');
                }
              }
              setShowClickCommentPopup(false);
              setClickCommentText('');
            }}
            disabled={!clickCommentText.trim()}
            className="px-4 py-2 rounded text-sm font-semibold text-white"
            style={{ backgroundColor: '#7C1805', opacity: clickCommentText.trim() ? 1 : 0.5 }}>
            Salvar comentário
          </button>
        </div>
      </div>
    </div>
  )}

  {/* POPUP DE COMENTÁRIO */}
  {showCommentPopup && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCommentPopup(false)}>
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold" style={{ color: '#7C1805' }}>Adicionar Comentário</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowCommentPopup(false)}>
            <X size={18} />
          </Button>
        </div>

        <p className="text-sm text-slate-600 mb-3 italic p-2 rounded" style={{ backgroundColor: '#FEF3C7' }}>
          "{selectedTextRange?.text}"
        </p>

        {/* Campo de comentário */}
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={3}
          placeholder="Digite seu comentário ou escolha do banco abaixo..."
          className="mb-4"
        />

        {/* Banco de Comentários */}
        <div className="mb-4">
          <Label className="text-xs mb-2 block font-semibold" style={{ color: '#7C1805' }}>
            Banco de Comentários
          </Label>

          {/* Busca */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2.5" style={{ color: '#6B5B4E' }} />
            <Input
              value={quickCommentSearch}
              onChange={(e) => setQuickCommentSearch(e.target.value)}
              placeholder="Buscar por palavra-chave..."
              className="pl-8 text-xs h-8"
              size="sm"
            />
          </div>

          {/* Filtro por categoria */}
          <div className="flex flex-wrap gap-1 mb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setQuickCommentCategory(cat.key)}
                className="text-xs px-2 py-0.5 rounded-full border transition-all"
                style={{
                  backgroundColor: quickCommentCategory === cat.key ? '#7C1805' : 'transparent',
                  color: quickCommentCategory === cat.key ? '#FDF3E8' : '#6B5B4E',
                  borderColor: quickCommentCategory === cat.key ? '#7C1805' : '#E8DDD0',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Usados recentemente */}
          {!quickCommentSearch && quickCommentCategory === 'all' && recentComments.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B5B4E' }}>Recentes</p>
              <div className="flex flex-wrap gap-1">
                {recentComments.map(qc => (
                  <Badge key={qc.id} className="cursor-pointer hover:opacity-80 text-xs"
                    style={{ backgroundColor: '#FDF3E8', color: '#D66B27', border: '1px solid #D66B27' }}
                    onClick={() => handleUseQuickComment(qc.id, qc.text)}>
                    {qc.text}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Lista filtrada */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {filteredQuickComments.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: '#6B5B4E' }}>Nenhum comentário encontrado</p>
            ) : filteredQuickComments.map(qc => {
              const isFrequent = topFrequent.find(t => t.id === qc.id);
              return (
                <div key={qc.id} className="relative group flex items-center gap-1">
                  <button
                    className="flex-1 text-left text-xs px-2 py-1.5 rounded border transition-all hover:border-[#D66B27]"
                    style={{ borderColor: '#E8DDD0', color: '#2C1A0E', backgroundColor: qc.isShared ? '#F9F6FF' : 'white' }}
                    onClick={() => handleUseQuickComment(qc.id, qc.text)}
                  >
                    {isFrequent && <span className="mr-1">⭐</span>}
                    {qc.isShared && <span className="mr-1 text-xs" style={{ color: '#D9B2CF' }}>★</span>}
                    {qc.text}
                    {qc.category && qc.category !== 'geral' && (
                      <span className="ml-1 text-xs px-1 rounded" style={{ backgroundColor: '#F0EBE3', color: '#6B5B4E' }}>
                        {qc.category}
                      </span>
                    )}
                  </button>
                  {!qc.isShared && (
                    <button
                      onClick={() => handleDeleteQuickComment(qc.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#7C1805', color: 'white' }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Adicionar novo */}
          {showAddQuickComment ? (
            <div className="mt-2 space-y-1">
              <Input
                value={newQuickComment}
                onChange={(e) => setNewQuickComment(e.target.value)}
                placeholder="Texto do comentário..."
                className="text-xs h-8"
                size="sm"
              />
              <select
                value={newQuickCommentCategory}
                onChange={e => setNewQuickCommentCategory(e.target.value)}
                style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px', color: '#2C1A0E' }}
              >
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddQuickComment}>Salvar</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddQuickComment(false); setNewQuickComment(''); }}>
                  <X size={12} />
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-2 w-full h-7 text-xs"
              onClick={() => setShowAddQuickComment(true)}>
              <Plus size={12} className="mr-1" /> Novo comentário
            </Button>
          )}
        </div>



        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowCommentPopup(false)}>Cancelar</Button>
          <Button onClick={handleAddComment}>Adicionar</Button>
        </div>
      </div>
    </div>
  )}

    </>
  );
};
