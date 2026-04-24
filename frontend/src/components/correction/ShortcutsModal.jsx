import React from 'react';

const SHORTCUTS = [
  { keys: 'S',           desc: 'Seleção / mover' },
  { keys: 'P / C',       desc: 'Caneta livre' },
  { keys: 'E',           desc: 'Borracha' },
  { keys: 'L',           desc: 'Linha reta' },
  { keys: 'A',           desc: 'Seta' },
  { keys: 'R',           desc: 'Retângulo' },
  { keys: 'O',           desc: 'Oval / círculo' },
  { keys: 'U',           desc: 'Sublinhado' },
  { keys: 'H',           desc: 'Marcador (highlight)' },
  { keys: 'X',           desc: 'Tachado' },
  { keys: 'M',           desc: 'Comentário' },
  { keys: 'T',           desc: 'Caixa de texto' },
  { keys: 'Ctrl + Z',    desc: 'Desfazer' },
  { keys: 'Ctrl + Y',    desc: 'Refazer' },
  { keys: 'Ctrl + S',    desc: 'Salvar rascunho' },
  { keys: 'Ctrl + Enter',desc: 'Confirmar texto' },
  { keys: 'Esc',         desc: 'Cancelar / fechar' },
];

export const ShortcutsModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    onClick={onClose}
  >
    <div
      className="rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
      style={{ backgroundColor: '#FDF3E8', border: '1px solid #E8DDD0' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-lg" style={{ color: '#7C1805' }}>
          ⌨ Atalhos de Teclado
        </h3>
        <button
          onClick={onClose}
          aria-label="Fechar modal de atalhos"
          style={{ color: '#6B5B4E', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div className="space-y-1">
        {SHORTCUTS.map(({ keys, desc }) => (
          <div
            key={keys}
            className="flex items-center justify-between py-1.5 px-2 rounded"
            style={{ borderBottom: '1px solid #F0EBE3' }}
          >
            <span className="text-sm" style={{ color: '#2C1A0E' }}>{desc}</span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: '#E8DDD0', color: '#7C1805' }}
            >
              {keys}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: '#6B5B4E' }}>
        Clique fora ou pressione Esc para fechar
      </p>
    </div>
  </div>
);
