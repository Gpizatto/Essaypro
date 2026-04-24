import React from 'react';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';

export const ScorePanel = ({ prompt, scores, scoreErrors, feedback, handleScoreChange, setFeedback, getScoreColor }) => {
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

                {/* Botões de nível */}
                <div className="flex gap-1 mt-2">
                  {levels.map((val) => {
                    const isSelected = current === val;
                    const levelPct = criterion.peso_maximo > 0 ? val / criterion.peso_maximo : 0;
                    const btnColor = levelPct === 1 ? '#36555A' : levelPct >= 0.6 ? '#D66B27' : levelPct >= 0.4 ? '#DAB257' : levelPct > 0 ? '#7C1805' : '#6B5B4E';
                    return (
                      <button
                        key={val}
                        onClick={() => handleScoreChange(criterion.id, val, criterion.peso_maximo)}
                        title={(() => {
                          const lv = criterion.level_descriptions?.find(l => Math.abs(parseFloat(l.pontuacao) - val) < 0.01);
                          const label = lv?.proficiencia ? ` — ${lv.proficiencia}` : val === 0 ? ' — Não atendeu' : val === criterion.peso_maximo ? ' — Atendeu plenamente' : '';
                          return `${val} pts${label}`;
                        })()}
                        style={{
                          flex: 1,
                          padding: '6px 2px',
                          borderRadius: '6px',
                          border: isSelected ? `2px solid ${btnColor}` : '2px solid #E8DDD0',
                          backgroundColor: isSelected ? btnColor : '#FFF',
                          color: isSelected ? '#FFF' : '#6B5B4E',
                          fontSize: '11px',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>

                {/* Descrição do nível selecionado */}
                {(() => {
                  // Comparação tolerante: 200 === 200.0, evita bug float vs int
                  const levelInfo = criterion.level_descriptions?.find(l => Math.abs(parseFloat(l.pontuacao) - parseFloat(current)) < 0.01);
                  if (levelInfo?.proficiencia || levelInfo?.descricao) {
                    return (
                      <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#FDF3E8', border: '1px solid #E8DDD0' }}>
                        {levelInfo.proficiencia && (
                          <p className="text-xs font-semibold mb-0.5" style={{ color: '#7C1805' }}>{levelInfo.proficiencia}</p>
                        )}
                        {levelInfo.descricao && (
                          <p className="text-xs leading-relaxed" style={{ color: '#6B5B4E' }}>{levelInfo.descricao}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* TOTAL */}
        <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#FDF3E8' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#525252' }}>NOTA TOTAL</p>
          <p className="text-5xl font-black mb-2" style={{ color: getScoreColor(totalScore, maxScore) }} data-testid="total-score">
            {totalScore}
          </p>
          <p className="text-sm text-slate-500">de {maxScore} pontos</p>
          <Progress value={(totalScore / maxScore) * 100} className="h-2 mt-3" />
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
          <Textarea
            id="general-feedback"
            value={feedback.general_feedback}
            onChange={(e) => setFeedback({ ...feedback, general_feedback: e.target.value })}
            rows={6}
            placeholder="Escreva aqui o feedback completo para o aluno..."
            data-testid="general-feedback-input"
          />
        </div>
}
      </div>
    </div>
  );
};
