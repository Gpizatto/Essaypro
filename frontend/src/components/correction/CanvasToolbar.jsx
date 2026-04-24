import React from 'react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { ZoomIn, ZoomOut, MousePointer, Underline, Highlighter, Strikethrough, MessageSquare, Pen, Eraser, Circle, Square, Minus, MoveRight, Type } from 'lucide-react';

const COLORS = [
  { name: 'Vermelho', value: '#E53935' },
  { name: 'Azul',     value: '#1565C0' },
  { name: 'Verde',    value: '#2E7D32' },
  { name: 'Preto',    value: '#000000' },
  { name: 'Roxo',     value: '#6A1B9A' },
  { name: 'Laranja',  value: '#E65100' },
];

const TOOLS = [
  { id: 'select',        icon: MousePointer,  label: 'Seleção (S)',    group: 'text' },
  { id: 'underline',     icon: Underline,     label: 'Sublinhar (U)',  group: 'text' },
  { id: 'highlight',     icon: Highlighter,   label: 'Grifar (H)',     group: 'text' },
  { id: 'strikethrough', icon: Strikethrough, label: 'Riscar (X)',     group: 'text' },
  { id: 'comment',       icon: MessageSquare, label: 'Comentário (M)', group: 'text' },
  { id: 'pen',           icon: Pen,           label: 'Caneta (P)',     group: 'draw' },
  { id: 'line',          icon: Minus,         label: 'Linha (L)',      group: 'draw' },
  { id: 'arrow',         icon: MoveRight,     label: 'Seta (A)',       group: 'draw' },
  { id: 'oval',          icon: Circle,        label: 'Oval (O)',       group: 'draw' },
  { id: 'rect',          icon: Square,        label: 'Retângulo (R)',  group: 'draw' },
  { id: 'textbox',       icon: Type,          label: 'Texto (T)',      group: 'draw' },
  { id: 'eraser',        icon: Eraser,        label: 'Borracha (E)',   group: 'draw' },
];

export const CanvasToolbar = ({
  selectedTool, setSelectedTool,
  selectedColor, setSelectedColor,
  penWidth, setPenWidth,
  eraserWidth, setEraserWidth,
  zoom, zoomIn, zoomOut,
  clearCanvas, undoCanvas, redoCanvas,
}) => {
  return (
  {/* TOOLBAR */}
  <div className="p-4 bg-white border-b flex items-center gap-2 flex-wrap"
    style={{ position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
    {/* Ferramentas de texto */}
    <div className="flex gap-1 p-0.5 rounded" style={{ backgroundColor: '#F0EBE3' }}>
      {TOOLS.filter(t => t.group === 'text').map(tool => {
        const Icon = tool.icon;
        return (
          <div key={tool.id} className="relative" style={{ position: 'relative' }}>
            <Button
              onClick={() => setSelectedTool(tool.id)}
              variant={selectedTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              data-testid={`tool-${tool.id}`}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({ label: tool.label, x: r.left + r.width / 2, y: r.bottom + 6 });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <Icon size={16} />
            </Button>
          </div>
        );
      })}
    </div>

    {/* Ferramentas de desenho */}
    <div className="flex gap-1 p-0.5 rounded" style={{ backgroundColor: '#F0EBE3' }}>
      {TOOLS.filter(t => t.group === 'draw').map(tool => {
        const Icon = tool.icon;
        return (
          <div key={tool.id} style={{ position: 'relative' }}>
            <Button
              onClick={() => setSelectedTool(tool.id)}
              variant={selectedTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              data-testid={`tool-${tool.id}`}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({ label: tool.label, x: r.left + r.width / 2, y: r.bottom + 6 });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <Icon size={16} />
            </Button>
          </div>
        );
      })}
    </div>

    {/* Ações do canvas */}
    <div className="flex gap-1 p-0.5 rounded" style={{ backgroundColor: '#F0EBE3' }}>
      <Button variant="ghost" size="sm" onClick={undoCanvas} title="Desfazer (Ctrl+Z)">
        ↩
      </Button>
      <Button variant="ghost" size="sm" onClick={redoCanvas} title="Refazer (Ctrl+Y)">
        ↪
      </Button>
      <Button variant="ghost" size="sm" onClick={zoomOut} title="Diminuir zoom">
        <ZoomOut size={16} />
      </Button>
      <span className="flex items-center px-1 text-xs" style={{ color: '#6B5B4E' }}>
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="ghost" size="sm" onClick={zoomIn} title="Aumentar zoom">
        <ZoomIn size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={clearCanvas} title="Apagar todas as marcações" style={{ color: '#7C1805' }}>
        <Trash2 size={16} />
      </Button>
    </div>

    {/* Cores sempre visíveis — independente da ferramenta */}
    <Separator orientation="vertical" className="h-6" />
    <div className="flex gap-1">
      {COLORS.map(color => (
        <button
          key={color.value}
          onClick={() => setSelectedColor(color.value)}
          className={`w-6 h-6 rounded border-2 transition-transform ${
            selectedColor === color.value ? 'border-slate-900 scale-125' : 'border-slate-300'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>

    {/* Espessura do traço — sempre visível */}
    <>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: '#6B5B4E' }}>Esp:</span>
        <input
          type="range"
          min="0.5" max="20" step="0.5"
          value={penWidth}
          onChange={e => setPenWidth(parseFloat(e.target.value))}
          style={{ width: '80px', accentColor: '#7C1805' }}
          title={`Espessura: ${penWidth}px`}
        />
        <span className="text-xs font-mono" style={{ color: '#7C1805', minWidth: '32px' }}>{penWidth}px</span>
      </div>
    </>

    {selectedTool === 'eraser' && (
      <>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6B5B4E' }}>Tam:</span>
          <input
            type="range"
            min="5" max="80" step="1"
            value={eraserWidth}
            onChange={e => setEraserWidth(parseInt(e.target.value))}
            style={{ width: '80px', accentColor: '#7C1805' }}
            title={`Tamanho: ${eraserWidth}px`}
          />
          <span className="text-xs font-mono" style={{ color: '#7C1805', minWidth: '32px' }}>{eraserWidth}px</span>
        </div>
      </>
    )}

  </div>

  );
};
