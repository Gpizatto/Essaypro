import React from 'react';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { X } from 'lucide-react';

export const ScorePanel = ({
  prompt,
  scores,
  feedback,
  setFeedback,
  handleScoreChange,
  totalScore,
  autoSaveStatus,
  aiSuggestions,
  setAiSuggestions,
  visibleAiErrors,
  handleDismissError,
  handleAddErrorAsComment,
  inlineComments,
  handleAnalyzeWithAI,
  loadingAI,
  suggest_rewrite,
  setSuggestRewrite,
  mark_important,
  setMarkImportant,
  extra_material,
  setExtraMaterial,
  handleSubmit,
  submitting,
  confirmBeforePublish,
  setShowConfirmPublish,
}) => {
  const maxScore = prompt.criteria.reduce((s, c) => s + (c.peso_maximo || c.max || 0), 0);
  const pct = maxScore > 0 ? totalScore / maxScore : 0;
  const totalColor = pct >= 0.8 ? '#36555A' : pct >= 0.6 ? '#D66B27' : pct >= 0.4 ? '#DAB257' : '#7C1805';

  return (
    <div className="bg-white border-l" style={{ width: '38%', minWidth: '360px', maxWidth: '480px', position: 'sticky', top: '72px', height: 'calc(100vh - 72px)', overflowY: 'auto' }}>
      <div className="p-6 space-y-6">

        {/* PONTUAÇÃO */}
        <div>
          <h3 className="font-semibold mb-3" style={{ color: '#7C1805' }}>Pontuação por Critério</h3>
          {prompt.criteria.map((criterion) => {
            const levels = [];
            if (criterion.level_descriptions && criterion.level_descriptions.length > 0) {
              criterion.level_descriptions.forEach(l => levels.push(parseFloat(l.pontuacao)));
            } else {
              const step = criterion.peso_maximo <= 10 ? 1 : criterion.peso_maximo <= 50 ? 5 : 40;
              for (let v = 0; v <= criterion.peso_maximo; v += step) levels.push(Math.round(v * 100) / 100);
            }
            const current = scores[criterion.id] || 0;
            const pct = criterion.peso_maximo > 0 ? current / criterion.peso_maximo : 0;
            const levelColor = pct === 1 ? '#36555A' : pct >= 0.8 ? '#36555A' : pct >= 0.6 ? '#D66B27' : pct >= 0.4 ? '#DAB257' : pct > 0 ? '#7C1805' : '#6B5B4E';
            return (
              <div key={criterion.id} className="mb-5" data-testid={`score-${criterion.id}`}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>{criterion.nome}</p>
                    <p className="text-xs" style={{ color: '#6B5B4E' }}>{criterion.descricao}</p>
                  </div>
                  <span className="text-lg font-black" style={{ color: levelColor }}>
                    {current}<span className="text-xs font-normal" style={{ color: '#6B5B4E' }}>/{criterion.peso_maximo}</span>
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  {levels.map((val) => {
                    const isSelected = current === val;
                    const levelPct = criterion.peso_maximo > 0 ? val / criterion.peso_maximo : 0;
                    const btnColor = levelPct === 1 ? '#36555A' : levelPct >= 0.6 ? '#D66B27' : levelPct >= 0.4 ? '#DAB257' : levelPct > 0 ? '#7C1805' : '#6B5B4E';
                    const lv = criterion.level_descriptions?.find(l => Math.abs(parseFloat(l.pontuacao) - val) < 0.01);
                    const titleLabel = lv?.proficiencia ? ` — ${lv.proficiencia}` : val === 0 ? ' — Não atendeu' : val === criterion.peso_maximo ? ' — Atendeu plenamente' : '';
                    return (
                      <button key={val}
                        onClick={() => handleScoreChange(criterion.id, val, criterion.peso_maximo)}
                        title={`${val} pts${titleLabel}`}
                        style={{
                          flex: 1, padding: '6px 2px', borderRadius: '6px',
                          border: isSelected ? `2px solid ${btnColor}` : '2px solid #E8DDD0',
                          backgroundColor: isSelected ? btnColor : '#FFF',
                          color: isSelected ? '#FFF' : '#6B5B4E',
                          fontSize: '11px', fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {val}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const levelInfo = criterion.level_descriptions?.find(l => Math.abs(parseFloat(l.pontuacao) - parseFloat(current)) < 0.01);
                  if (levelInfo?.proficiencia || levelInfo?.descricao) {
                    return (
                      <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#FDF3E8', border: '1px solid #E8DDD0' }}>
                        {levelInfo.proficiencia && <p className="text-xs font-semibold mb-0.5" style={{ color: '#7C1805' }}>{levelInfo.proficiencia}</p>}
                        {levelInfo.descricao && <p className="text-xs leading-relaxed" style={{ color: '#6B5B4E' }}>{levelInfo.descricao}</p>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            );
          })}

          {/* NOTA TOTAL */}
          <div className="mt-4 p-4 rounded-xl text-center" style={{ backgroundColor: '#FDF3E8', border: '2px solid #E8DDD0' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#6B5B4E' }}>NOTA TOTAL</p>
            <p className="text-4xl font-black" style={{ color: totalColor }}>{totalScore}</p>
            <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>de {maxScore} pontos</p>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E8DDD0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: totalColor }} />
            </div>
          </div>
        </div>

        <Separator />

        {/* FEEDBACK */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold" style={{ color: '#7C1805' }}>Feedback Geral *</h3>
            <div className="flex gap-1">
              {[
                { label: '⭐ Ótimo', text: 'Excelente trabalho! Sua redação demonstra ótimo domínio da língua portuguesa e capacidade argumentativa. Continue assim!' },
                { label: '👍 Bom', text: 'Boa redação! Você demonstrou compreensão do tema e boa estrutura argumentativa. Atenção aos pontos de melhoria indicados.' },
                { label: '📚 Atenção', text: 'Sua redação apresenta aspectos importantes a desenvolver. Leia os comentários com atenção e revise os pontos indicados para melhorar.' },
              ].map(tpl => (
                <button key={tpl.label} type="button"
                  onClick={() => setFeedback(prev => ({ ...prev, general_feedback: tpl.text }))}
                  className="text-xs px-2 py-0.5 rounded border"
                  style={{ color: '#6B5B4E', borderColor: '#E8DDD0', backgroundColor: 'white', fontSize: '11px' }}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea id="general-feedback" value={feedback.general_feedback}
            onChange={(e) => setFeedback({ ...feedback, general_feedback: e.target.value })}
            rows={6} placeholder="Escreva aqui o feedback completo para o aluno..."
            data-testid="general-feedback-input" />
        </div>

        {/* ANÁLISE DA IA */}
        {aiSuggestions && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold" style={{ color: '#7C1805' }}>🤖 Análise da IA</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#FDF3E8', color: '#D66B27' }}>
                    {visibleAiErrors.length} ponto{visibleAiErrors.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => setAiSuggestions(null)} className="text-xs" style={{ color: '#6B5B4E' }} title="Fechar análise">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {visibleAiErrors.map((erro) => (
                  <div key={erro.id} className="p-3 rounded-lg border" style={{ backgroundColor: '#FFFBF5', borderColor: '#E8DDD0' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold" style={{ color: '#7C1805' }}>{erro.tipo}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#2C1A0E' }}>{erro.descricao}</p>
                        {erro.sugestao && <p className="text-xs mt-1 italic" style={{ color: '#6B5B4E' }}>💡 {erro.sugestao}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleAddErrorAsComment(erro)} title="Adicionar como comentário"
                          style={{ fontSize: '11px', color: '#36555A', background: 'none', border: '1px solid #36555A', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>+</button>
                        <button onClick={() => handleDismissError(erro.id)} title="Dispensar"
                          style={{ fontSize: '11px', color: '#6B5B4E', background: 'none', border: '1px solid #E8DDD0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* OPÇÕES EXTRAS */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: '#7C1805' }}>Opções</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={suggest_rewrite} onChange={e => setSuggestRewrite(e.target.checked)}
              style={{ accentColor: '#7C1805' }} />
            <span className="text-xs" style={{ color: '#2C1A0E' }}>Sugerir reescrita ao aluno</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mark_important} onChange={e => setMarkImportant(e.target.checked)}
              style={{ accentColor: '#7C1805' }} />
            <span className="text-xs" style={{ color: '#2C1A0E' }}>Marcar como redação importante</span>
          </label>
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B5B4E' }}>Material extra (link ou texto)</p>
            <input value={extra_material} onChange={e => setExtraMaterial(e.target.value)}
              placeholder="https://..." style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '12px' }} />
          </div>
        </div>

        <Separator />

        {/* BOTÃO FINALIZAR */}
        <div>
          {autoSaveStatus === 'saved' && (
            <p className="text-xs mb-2 text-center" style={{ color: '#36555A' }}>✓ Rascunho salvo</p>
          )}
          <button
            onClick={confirmBeforePublish ? () => setShowConfirmPublish(true) : handleSubmit}
            disabled={submitting}
            data-testid="finalize-correction-button"
            className="w-full py-3 rounded-xl font-semibold text-white transition-all"
            style={{ backgroundColor: submitting ? '#E8DDD0' : '#36555A', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Finalizando...' : '✓ Finalizar Correção'}
          </button>
        </div>
      </div>
    </div>
  );
};
