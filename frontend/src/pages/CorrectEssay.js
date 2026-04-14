import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { X, Plus, MousePointer, Underline, Highlighter, Strikethrough, MessageSquare, Pen, Eraser, Search, ChevronDown, ChevronUp, Sparkles, Save, Circle, Square, Minus, MoveRight, Trash2, ZoomIn, ZoomOut, Type } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = [
  { name: 'Vermelho', value: '#E53935' },
  { name: 'Azul', value: '#1565C0' },
  { name: 'Verde', value: '#2E7D32' },
  { name: 'Preto', value: '#000000' },
  { name: 'Roxo', value: '#6A1B9A' },
  { name: 'Laranja', value: '#E65100' }
];

const TOOLS = [
  { id: 'select',        icon: MousePointer, label: 'Seleção (S)',    group: 'text' },
  { id: 'underline',     icon: Underline,    label: 'Sublinhar (U)',  group: 'text' },
  { id: 'highlight',     icon: Highlighter,  label: 'Grifar (H)',     group: 'text' },
  { id: 'strikethrough', icon: Strikethrough,label: 'Riscar (X)',     group: 'text' },
  { id: 'comment',       icon: MessageSquare,label: 'Comentário (M)', group: 'text' },
  { id: 'pen',           icon: Pen,          label: 'Caneta (P)',     group: 'draw' },
  { id: 'line',          icon: Minus,        label: 'Linha (L)',      group: 'draw' },
  { id: 'arrow',         icon: MoveRight,    label: 'Seta (A)',       group: 'draw' },
  { id: 'oval',          icon: Circle,       label: 'Oval (O)',       group: 'draw' },
  { id: 'rect',          icon: Square,       label: 'Retângulo (R)',  group: 'draw' },
  { id: 'eraser',        icon: Eraser,       label: 'Borracha (E)',   group: 'draw' },
];

const TIPO_BADGES = {
  gramatical: { label: 'Gramatical', color: '#DC2626', icon: '🔴' },
  coesao: { label: 'Coesão', color: '#D97706', icon: '🟡' },
  argumentacao: { label: 'Argumentação', color: '#EA580C', icon: '🟠' },
  tematico: { label: 'Temático', color: '#2563EB', icon: '🔵' },
  estilo: { label: 'Estilo', color: '#9333EA', icon: '🟣' }
};

export const CorrectEssay = () => {
  const { essayId } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const textInitializedRef = useRef(false);
  const nativeCanvasRef = useRef(null);   // ref para o elemento <canvas>
  const ctxRef = useRef(null);            // CanvasRenderingContext2D
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const shapeStartRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);       // ImageData para preview de formas
  const selectedToolRef = useRef('select');
  const selectedColorRef = useRef('#E53935');
  const penWidthRef = useRef(0.5);
  const historyRef = useRef([]);          // array de ImageData
  const [zoom, setZoom] = useState(1);

  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('#E53935');

  // Manter refs sincronizados para usar em event listeners sem stale closure
  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { selectedColorRef.current = selectedColor; }, [selectedColor]);
  const [penWidth, setPenWidth] = useState(0.5);
  const penOpacity = 1; // sempre sólido
  const [eraserSize, setEraserSize] = useState('medium');
  const [eraserWidth, setEraserWidth] = useState(20);
  const eraserWidthRef = React.useRef(20);

  const [inlineComments, setInlineComments] = useState([]);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [eraserCursor, setEraserCursor] = useState(null); // {x, y} for visual cursor // { label, x, y }

  const [scores, setScores] = useState({});
  const [scoreErrors, setScoreErrors] = useState({});
  const [feedback, setFeedback] = useState({
    general_feedback: '',
    strengths: '',
    improvements: '',
  });

  const [quickComments, setQuickComments] = useState([]);
  const [quickCommentSearch, setQuickCommentSearch] = useState('');
  const [quickCommentCategory, setQuickCommentCategory] = useState('all');
  const [showAddQuickComment, setShowAddQuickComment] = useState(false);
  const [newQuickComment, setNewQuickComment] = useState('');
  const [newQuickCommentCategory, setNewQuickCommentCategory] = useState('geral');
  const [sharedComments, setSharedComments] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [dismissedErrors, setDismissedErrors] = useState([]);
  const [expandedSuggestions, setExpandedSuggestions] = useState({});
  const [essayHtml, setEssayHtml] = useState('');
  const [courseSettings, setCourseSettings] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [confirmBeforePublish, setConfirmBeforePublish] = useState(true);
  const pendingDraftRef = useRef(null);

  useEffect(() => {
    fetchData();
    loadQuickComments();
  }, [essayId]);

  // Injetar texto UMA VEZ no div — div não é controlado pelo React
  const textInjectedRef = useRef(false);
  useEffect(() => {
    if (!essayHtml || loading || textInjectedRef.current) return;
    if (!textRef.current) return;

    const draft = pendingDraftRef.current;
    if (draft && draft.textAnnotations) {
      textRef.current.innerHTML = draft.textAnnotations;
    } else {
      textRef.current.innerHTML = essayHtml;
    }
    textInjectedRef.current = true;

    if (draft && draft.canvasDataUrl) {
      const savedUrl = draft.canvasDataUrl;
      pendingDraftRef.current = null;
      const tryDraw = (attempts) => {
        const canvas = nativeCanvasRef.current;
        const ctx = ctxRef.current || (canvas && canvas.getContext('2d'));
        if (ctx && canvas && canvas.width > 0) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            toast.success('Rascunho carregado — continue de onde parou!', { duration: 3000 });
          };
          img.src = savedUrl;
        } else if (attempts < 15) {
          setTimeout(() => tryDraw(attempts + 1), 200);
        }
      };
      setTimeout(() => tryDraw(0), 600);
    } else if (draft) {
      pendingDraftRef.current = null;
      toast.success('Rascunho carregado — continue de onde parou!', { duration: 3000 });
    }
  });

  // Sync refs
  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { selectedColorRef.current = selectedColor; }, [selectedColor]);
  useEffect(() => { penWidthRef.current = penWidth; }, [penWidth]);
  useEffect(() => { eraserWidthRef.current = eraserWidth; }, [eraserWidth]);

  // 5.2 — Atalhos de teclado
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undoCanvas(); }
        if (e.key === 'y') { e.preventDefault(); redoCanvas(); }
        if (e.key === 's') { e.preventDefault(); saveDraft(); }
        return;
      }

      const map = {
        'p': 'pen', 'c': 'pen',
        'e': 'eraser',
        'l': 'line',
        's': 'select',
        'a': 'arrow',
        'o': 'oval',
        'r': 'rect',
        'u': 'underline',
        'h': 'highlight',
        'x': 'strikethrough',
        'm': 'comment',
      };
      if (map[e.key]) setSelectedTool(map[e.key]);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // 5.4 — Auto-save a cada 30 segundos
  const autoSaveTimerRef = useRef(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  useEffect(() => {
    if (!essay) return;
    const hasContent =
      Object.values(scores).some(v => v > 0) ||
      feedback.general_feedback.trim() ||
      feedback.strengths.trim() ||
      feedback.improvements.trim();
    if (!hasContent) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await axios.post(`${API_URL}/api/corrections/draft`, {
          essay_id: essayId, scores, feedback, inlineComments,
        }, { withCredentials: true });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      } catch (e) { setAutoSaveStatus(''); }
    }, 30000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [scores, feedback, inlineComments]);

  // Inicializar canvas nativo quando o essay carregar
  useEffect(() => {
    if (!essay || !nativeCanvasRef.current) return;

    const canvas = nativeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    const syncSize = () => {
      if (!canvasContainerRef.current) return;
      const container = canvasContainerRef.current;
      const w = container.offsetWidth || 800;
      const h = Math.max(
        container.offsetHeight || 0,
        textRef.current?.scrollHeight || 0,
        textRef.current?.offsetHeight || 0,
        600
      );
      if (w < 1 || h < 1) return; // evitar canvas com dimensão zero
      if (canvas.width !== w || canvas.height !== h) {
        // Salvar conteúdo antes de redimensionar
        let saved = null;
        try {
          if (canvas.width > 0 && canvas.height > 0) {
            saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
          }
        } catch(e) {}
        canvas.width = w;
        canvas.height = h;
        if (saved) ctx.putImageData(saved, 0, 0);
      }
    };

    syncSize();

    const ro = new ResizeObserver(syncSize);
    if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
    if (textRef.current) ro.observe(textRef.current);

    return () => ro.disconnect();
  }, [essay]);

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const fetchData = async () => {
    try {
      const essayRes = await axios.get(`${API_URL}/api/essays/${essayId}`, { withCredentials: true });
      setEssay(essayRes.data);
      setEssayHtml(essayRes.data.content ? essayRes.data.content.replace(/\n/g, '<br/>') : 'Conteúdo não disponível');

      // Buscar configurações do curso
      try {
        const settingsRes = await axios.get(`${API_URL}/api/settings/course`, { withCredentials: true });
        setCourseSettings(settingsRes.data);
        setConfirmBeforePublish(settingsRes.data.confirm_before_publish !== false);
      } catch (e) { console.error('Error fetching settings:', e); }

      // Carregar rascunho se existir (404 é esperado quando não há rascunho)
      try {
        const draftRes = await axios.get(`${API_URL}/api/corrections/draft/${essayId}`, {
          withCredentials: true,
          validateStatus: (status) => status === 200 || status === 404,
        });
        if (draftRes.status === 200) {
          const d = draftRes.data;
          if (d.scores) setScores(d.scores);
          if (d.feedback) setFeedback(d.feedback);
          if (d.inlineComments) setInlineComments(d.inlineComments);
          pendingDraftRef.current = {
            textAnnotations: d.textAnnotations || null,
            canvasDataUrl: d.canvasDataUrl || null,
          };
          setDraftLoaded(true);
        }
      } catch (e) { /* ignorar */ }

      const promptsRes = await axios.get(`${API_URL}/api/prompts`, { withCredentials: true });
      const promptData = promptsRes.data.find(p => p.id === essayRes.data.prompt_id);
      setPrompt(promptData);

      if (promptData && promptData.criteria) {
        const initialScores = {};
        promptData.criteria.forEach(c => {
          initialScores[c.id] = 0;
        });
        setScores(initialScores);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar redação');
    } finally {
      setLoading(false);
    }
  };

  const loadQuickComments = async () => {
    try {
      const [personalRes, sharedRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/quick-comments`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/quick-comments`, { withCredentials: true }).catch(() => ({ data: { quick_comments: [] } })),
      ]);
      setQuickComments(personalRes.data.quick_comments || []);
      setSharedComments(sharedRes.data.quick_comments || []);
    } catch (error) {
      console.error('Error loading quick comments:', error);
    }
  };

  const saveQuickComments = async (comments) => {
    try {
      // FastAPI recebe List[dict] diretamente como body JSON array
      await axios.put(`${API_URL}/api/users/quick-comments`, comments, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setQuickComments(comments);
    } catch (error) {
      console.error('Error saving quick comments:', error);
      // Não mostrar toast de erro para não atrapalhar o fluxo
    }
  };

  const handleAddQuickComment = () => {
    if (newQuickComment.trim()) {
      const newComment = {
        id: `qc_${Date.now()}`,
        text: newQuickComment.trim(),
        use_count: 0,
        last_used_at: null,
        created_at: new Date().toISOString()
      };
      const updated = [...quickComments, newComment];
      saveQuickComments(updated);
      setNewQuickComment('');
      setShowAddQuickComment(false);
      toast.success('Comentário pronto adicionado');
    }
  };

  const handleDeleteQuickComment = (commentId) => {
    const updated = quickComments.filter(qc => qc.id !== commentId);
    saveQuickComments(updated);
    toast.success('Comentário pronto removido');
  };

  const handleUseQuickComment = async (commentId, text) => {
    setCommentText(prev => prev ? `${prev} ${text}` : text);
    try {
      await axios.put(`${API_URL}/api/users/quick-comments/use/${commentId}`, {}, { withCredentials: true });
      loadQuickComments();
    } catch (error) {
      console.error('Error recording quick comment usage:', error);
    }
  };

  // ── Canvas nativo: funções de desenho ──────────────────────────────────
  // Inicializar ctx se ainda não foi feito
  const ensureCtx = () => {
    if (!ctxRef.current && nativeCanvasRef.current) {
      ctxRef.current = nativeCanvasRef.current.getContext('2d');
    }
    return ctxRef.current;
  };

  const getPos = (e) => {
    const canvas = nativeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  };

  const saveHistory = () => {
    const canvas = nativeCanvasRef.current;
    const ctx = ensureCtx();
    if (!canvas || !ctx) return;
    if (canvas.width < 1 || canvas.height < 1) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [...historyRef.current.slice(-29), snap];
    } catch(e) {}
  };

  const clearCanvas = () => {
    if (!nativeCanvasRef.current || !ctxRef.current) return;
    if (!window.confirm('Apagar todas as marcações?')) return;
    saveHistory();
    ctxRef.current.clearRect(0, 0, nativeCanvasRef.current.width, nativeCanvasRef.current.height);
  };

  // Histórico unificado: canvas ImageData + snapshot do innerHTML do texto
  const domHistoryRef = useRef([]);

  const saveDomHistory = () => {
    if (textRef.current) {
      domHistoryRef.current = [...domHistoryRef.current.slice(-29), textRef.current.innerHTML];
    }
  };

  const undoCanvas = () => {
    // Desfazer canvas
    if (ctxRef.current && historyRef.current.length > 0) {
      const prev = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);
      ctxRef.current.putImageData(prev, 0, 0);
      return;
    }
    // Desfazer anotação de texto (sublinhar, grifar, riscar, comentário)
    if (textRef.current && domHistoryRef.current.length > 0) {
      const prev = domHistoryRef.current[domHistoryRef.current.length - 1];
      domHistoryRef.current = domHistoryRef.current.slice(0, -1);
      textRef.current.innerHTML = prev;
    }
  };

  const redoCanvas = () => {};  // simplificado — undo já cobre o fluxo principal

  const zoomIn  = () => setZoom(p => Math.min(parseFloat((p + 0.1).toFixed(1)), 2.0));
  const zoomOut = () => setZoom(p => Math.max(parseFloat((p - 0.1).toFixed(1)), 0.5));

  // Eventos de desenho no canvas nativo
  const handleCanvasMouseDown = (e) => {
    const tool = selectedToolRef.current;
    if (!['pen','eraser','line','arrow','oval','rect'].includes(tool)) return;
    if (!ensureCtx() || !nativeCanvasRef.current) return;
    e.preventDefault();
    saveHistory();
    isDrawingRef.current = true;
    const pos = getPos(e);
    lastPosRef.current = pos;
    shapeStartRef.current = pos;
    if (tool === 'pen' || tool === 'eraser') {
      const ctx = ctxRef.current;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selectedColorRef.current;
      ctx.lineWidth = penWidthRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else {
      // snapshot para preview
      snapshotRef.current = ctxRef.current.getImageData(
        0, 0, nativeCanvasRef.current.width, nativeCanvasRef.current.height
      );
    }
  };

  const handleCanvasMouseMove = (e) => {
    // Update eraser visual cursor
    if (selectedToolRef.current === 'eraser') {
      const pos = getPos(e);
      const rect = nativeCanvasRef.current?.getBoundingClientRect();
      if (rect) setEraserCursor({ x: e.clientX, y: e.clientY });
    }
    if (!isDrawingRef.current) return;
    if (!ensureCtx()) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const tool = selectedToolRef.current;
    const color = selectedColorRef.current;
    const pos = getPos(e);

    if (tool === 'pen') {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = penWidthRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 1;
      // Novo path por segmento — evita acúmulo que engrossa traço horizontal
      const last = lastPosRef.current;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
    } else if (tool === 'eraser') {
      const ew = eraserWidthRef.current;
      ctx.clearRect(pos.x - ew / 2, pos.y - ew / 2, ew, ew);
    } else {
      // Preview de forma: restaurar snapshot e redesenhar
      ctx.putImageData(snapshotRef.current, 0, 0);
      const sx = shapeStartRef.current.x;
      const sy = shapeStartRef.current.y;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillStyle = 'transparent';
      ctx.beginPath();
      if (tool === 'line' || tool === 'arrow') {
        ctx.moveTo(sx, sy);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(sx, sy, pos.x - sx, pos.y - sy);
      } else if (tool === 'oval') {
        const rx = Math.abs(pos.x - sx) / 2;
        const ry = Math.abs(pos.y - sy) / 2;
        const cx = (sx + pos.x) / 2;
        const cy = (sy + pos.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (!ensureCtx()) return;
    const tool = selectedToolRef.current;
    const ctx = ctxRef.current;
    const color = selectedColorRef.current;

    if (tool === 'arrow') {
      const pos = getPos(e);
      const sx = shapeStartRef.current.x;
      const sy = shapeStartRef.current.y;
      const angle = Math.atan2(pos.y - sy, pos.x - sx);
      const headLen = 14;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
    snapshotRef.current = null;
    ctx.closePath?.();
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      // Salvar canvas como dataUrl
      let canvasDraft = null;
      if (nativeCanvasRef.current) {
        const c = nativeCanvasRef.current;
        if (c.width > 0 && c.height > 0) {
          canvasDraft = c.toDataURL('image/png');
        }
      }
      // Salvar anotações de texto (innerHTML)
      const textAnnotations = textRef.current ? textRef.current.innerHTML : null;

      await axios.post(`${API_URL}/api/corrections/draft`, {
        essay_id: essayId,
        scores,
        feedback,
        inlineComments,
        canvasDataUrl: canvasDraft,
        textAnnotations,
      }, { withCredentials: true });
      setDraftSaved(true);
      toast.success('Rascunho salvo!');
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (err) {
      toast.error('Erro ao salvar rascunho');
    } finally {
      setSavingDraft(false);
    }
  };

  const applyAnnotationWithTool = (range, tool, color) => {
    saveDomHistory(); // salvar antes de modificar
    const span = document.createElement('span');

    if (tool === 'underline') {
      span.style.borderBottom = `2px solid ${color}`;
      span.style.paddingBottom = '2px';
    } else if (tool === 'highlight') {
      span.style.backgroundColor = color;
      span.style.padding = '2px 0';
    } else if (tool === 'strikethrough') {
      span.style.textDecoration = 'line-through';
      span.style.textDecorationColor = color;
      span.style.textDecorationThickness = '2px';
      span.style.textDecorationStyle = 'solid';
    }

    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      window.getSelection().removeAllRanges();
    } catch (error) {
      console.error('Erro ao aplicar anotacao:', error);
    }
  };

  // Listener global para capturar mouseup sem problemas de stale closure
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      const tool = selectedToolRef.current;
      const color = selectedColorRef.current;

      if (tool === 'select' || tool === 'pen' || tool === 'eraser') return;

      const selection = window.getSelection();
      if (!selection || !selection.toString().trim()) return;
      if (!textRef.current || !textRef.current.contains(selection.anchorNode)) return;

      const range = selection.getRangeAt(0).cloneRange();
      const selectedText = selection.toString().trim();

      if (tool === 'comment') {
        setSelectedTextRange({ range, text: selectedText });
        setCommentText('');
        setShowCommentPopup(true);
      } else {
        applyAnnotationWithTool(range, tool, color);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleTextSelection = () => {
    // Mantido para compatibilidade — a logica real esta no listener global acima
  };

  const applyAnnotation = (text, range) => {
    applyAnnotationWithTool(range, selectedToolRef.current, selectedColorRef.current);
  };

  const handleCommentTextChange = (val) => {
    setCommentText(val);
    if (val.trim().length >= 2) {
      const allComments = [
        ...quickComments,
        ...sharedComments.filter(sc => !quickComments.find(qc => qc.text === sc.text))
      ];
      const matches = allComments.filter(qc =>
        qc.text.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setAutocompleteSuggestions(matches);
      setShowAutocomplete(matches.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleAddComment = () => {
    if (commentText.trim() && selectedTextRange) {
      saveDomHistory();
      const newComment = {
        id: inlineComments.length + 1,
        selected_text: selectedTextRange.text,
        comment: commentText.trim(),
        color: '#FEF3C7',
        position: selectedTextRange.range.getBoundingClientRect()
      };
      
      setInlineComments([...inlineComments, newComment]);
      
      const span = document.createElement('span');
      span.textContent = selectedTextRange.text;
      span.style.backgroundColor = '#FEF3C7';
      span.style.borderBottom = '2px dotted #92400E';
      span.style.padding = '2px 4px';
      span.style.borderRadius = '2px';
      span.style.position = 'relative';
      span.style.cursor = 'help';
      span.setAttribute('data-comment-id', newComment.id);
      span.className = 'inline-comment';
      
      const badge = document.createElement('sup');
      badge.textContent = newComment.id;
      badge.style.fontSize = '10px';
      badge.style.fontWeight = 'bold';
      badge.style.color = '#92400E';
      badge.style.marginLeft = '2px';
      span.appendChild(badge);

      try {
        selectedTextRange.range.deleteContents();
        selectedTextRange.range.insertNode(span);
        window.getSelection().removeAllRanges();
      } catch (error) {
        console.error('Error adding comment:', error);
      }

      setShowCommentPopup(false);
      setCommentText('');
      setSelectedTextRange(null);
      toast.success('Comentário adicionado');
    }
  };

  const handleDeleteComment = (commentId) => {
    setInlineComments(inlineComments.filter(c => c.id !== commentId));
    const spans = textRef.current.querySelectorAll(`[data-comment-id="${commentId}"]`);
    spans.forEach(span => {
      const text = span.textContent.replace(/\d+$/, '');
      const textNode = document.createTextNode(text);
      span.parentNode.replaceChild(textNode, span);
    });
    setHoveredCommentId(null);
    toast.success('Comentário removido');
  };

  const handleScoreChange = (criteriaId, value, max) => {
    const numValue = parseInt(value) || 0;
    
    if (numValue < 0) {
      setScores({ ...scores, [criteriaId]: 0 });
      return;
    }
    
    if (numValue > max) {
      setScores({ ...scores, [criteriaId]: max });
      setScoreErrors({ ...scoreErrors, [criteriaId]: '' });
      return;
    }
    
    if (numValue % 40 !== 0) {
      setScores({ ...scores, [criteriaId]: numValue });
      setScoreErrors({ ...scoreErrors, [criteriaId]: 'Use múltiplos de 40 (0, 40, 80...)' });
    } else {
      setScores({ ...scores, [criteriaId]: numValue });
      setScoreErrors({ ...scoreErrors, [criteriaId]: '' });
    }
  };

  const handleAnalyzeWithAI = async () => {
    // Para redações com upload, pegar texto do DOM se content estiver vazio
    const textContent = essay.content?.trim()
      || textRef.current?.innerText?.trim()
      || '';

    if (!textContent || textContent === 'Conteúdo não disponível') {
      toast.error('Esta redação foi enviada como imagem — sem texto para a IA analisar.');
      return;
    }

    setAiAnalyzing(true);
    setAiSuggestions(null);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/ai/analyze-essay`,
        { essay_id: essayId, content: textContent },
        { withCredentials: true }
      );
      setAiSuggestions(data);
      setDismissedErrors([]);
      setExpandedSuggestions({});
      const count = data.erros?.length || 0;
      toast.success(`Análise concluída! ${count} ponto${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}.`);
    } catch (error) {
      console.error('AI analysis error:', error);
      if (error.response?.status === 429) {
        toast.error('Limite de requisições da IA atingido. Aguarde 30 segundos e tente novamente.');
      } else {
        const msg = error.response?.data?.detail || 'Não foi possível analisar. Tente novamente.';
        toast.error(msg);
      }
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDismissError = (errorId) => {
    setDismissedErrors([...dismissedErrors, errorId]);
  };

  const handleAddErrorAsComment = (erro) => {
    const newComment = {
      id: inlineComments.length + 1,
      selected_text: erro.trecho,
      comment: `${erro.descricao}\n\nSugestão: ${erro.sugestao}`,
      color: '#FEF3C7'
    };
    
    setInlineComments([...inlineComments, newComment]);
    
    const textContent = textRef.current.textContent;
    const index = textContent.indexOf(erro.trecho);
    
    if (index !== -1) {
      const range = document.createRange();
      const walker = document.createTreeWalker(textRef.current, NodeFilter.SHOW_TEXT);
      let charCount = 0;
      let startNode = null;
      let startOffset = 0;
      let endNode = null;
      let endOffset = 0;
      
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent.length;
        
        if (!startNode && charCount + nodeLength > index) {
          startNode = node;
          startOffset = index - charCount;
        }
        
        if (startNode && charCount + nodeLength >= index + erro.trecho.length) {
          endNode = node;
          endOffset = index + erro.trecho.length - charCount;
          break;
        }
        
        charCount += nodeLength;
      }
      
      if (startNode && endNode) {
        try {
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
          
          const span = document.createElement('span');
          span.textContent = erro.trecho;
          span.style.backgroundColor = '#FEF3C7';
          span.style.borderBottom = '2px dotted #92400E';
          span.style.padding = '2px 4px';
          span.style.borderRadius = '2px';
          span.style.position = 'relative';
          span.style.cursor = 'help';
          span.setAttribute('data-comment-id', newComment.id);
          span.className = 'inline-comment';
          
          const badge = document.createElement('sup');
          badge.textContent = newComment.id;
          badge.style.fontSize = '10px';
          badge.style.fontWeight = 'bold';
          badge.style.color = '#92400E';
          badge.style.marginLeft = '2px';
          span.appendChild(badge);
          
          range.deleteContents();
          range.insertNode(span);
        } catch (error) {
          console.error('Error adding AI comment:', error);
        }
      }
    }
    
    handleDismissError(erro.id);
    toast.success('Erro adicionado como comentário');
  };

  const handleSubmit = async () => {
    if (!feedback.general_feedback.trim()) {
      toast.error('Feedback geral é obrigatório');
      return;
    }
    const hasScoreErrors = Object.values(scoreErrors).some(err => err);
    if (hasScoreErrors) {
      toast.error('Corrija os erros de pontuação antes de finalizar');
      return;
    }
    setShowConfirmPublish(true);
  };

  const handleConfirmPublish = async () => {
    setShowConfirmPublish(false);

    const criteria_scores = prompt.criteria.map(c => ({
      criteria_id: c.id,
      nome: c.nome,
      score: scores[c.id] || 0,
      max: c.peso_maximo
    }));

    const totalScore = criteria_scores.reduce((sum, cs) => sum + cs.score, 0);

    setSubmitting(true);
    try {
      // Serializar canvas nativo como dataURL
      // Serializar canvas — garante que tem dimensões antes do toDataURL
      let canvasData = null;
      if (nativeCanvasRef.current) {
        const c = nativeCanvasRef.current;
        // Canvas precisa ter width/height > 0 para toDataURL funcionar
        if (c.width > 0 && c.height > 0) {
          canvasData = { dataUrl: c.toDataURL('image/png') };
        }
      }
      
      await axios.post(
        `${API_URL}/api/corrections`,
        {
          essay_id: essayId,
          criteria_scores,
          total_score: totalScore,
          ...feedback,
          inline_comments: inlineComments,
          canvas_annotations: canvasData
        },
        { withCredentials: true }
      );

      toast.success('Correção finalizada com sucesso!');
      navigate('/correction-queue');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erro ao enviar correção');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!essay || !prompt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">Redação não encontrada</p>
        </div>
      </div>
    );
  }

  const totalScore = prompt.criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);
  const maxScore = prompt.criteria.reduce((sum, c) => sum + c.peso_maximo, 0);

  const getScoreColor = (score, max) => {
    const percentage = max > 0 ? (score / max) * 100 : 0;
    if (percentage >= 80) return '#36555A';
    if (percentage >= 60) return '#3B82F6';
    if (percentage >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const CATEGORIES = [
    { key: 'all', label: 'Todas' },
    { key: 'gramatica', label: 'Gramática' },
    { key: 'coesao', label: 'Coesão' },
    { key: 'argumentacao', label: 'Argumentação' },
    { key: 'repertorio', label: 'Repertório' },
    { key: 'proposta', label: 'Proposta' },
    { key: 'conclusao', label: 'Conclusão' },
    { key: 'geral', label: 'Geral' },
  ];

  const allComments = [
    ...quickComments,
    ...sharedComments.filter(sc => !quickComments.find(qc => qc.text === sc.text)).map(sc => ({ ...sc, isShared: true }))
  ];

  const filteredQuickComments = allComments.filter(qc => {
    const matchText = qc.text.toLowerCase().includes(quickCommentSearch.toLowerCase());
    const matchCat = quickCommentCategory === 'all' || qc.category === quickCommentCategory;
    return matchText && matchCat;
  });

  const topFrequent = [...quickComments].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 3);
  const recentComments = [...quickComments]
    .filter(qc => qc.last_used_at)
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
    .slice(0, 5);

  const visibleAiErrors = aiSuggestions?.erros?.filter(e => !dismissedErrors.includes(e.id)) || [];

  return (
    <div style={{ backgroundColor: '#FDF3E8', minHeight: '100vh' }}>
      {/* HEADER FIXO */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <Button
            onClick={() => navigate('/correction-queue')}
            variant="ghost"
            size="sm"
            className="mb-2"
          >
            ← Voltar para fila
          </Button>
          <h1 className="font-heading text-xl font-bold" style={{ color: '#7C1805' }}>
            {essay.prompt_title}
          </h1>
          <p className="text-sm text-slate-500">Aluno: {essay.student_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium border transition-colors"
            style={{
              borderColor: draftSaved ? '#36555A' : '#E8DDD0',
              color: draftSaved ? '#36555A' : '#6B5B4E',
              backgroundColor: 'transparent',
            }}
          >
            <Save size={14} />
            {savingDraft ? 'Salvando...' : draftSaved ? 'Salvo ✓' : 'Rascunho (Ctrl+S)'}
          </button>
          {autoSaveStatus === 'saving' && (
            <span className="text-xs" style={{ color: '#6B5B4E' }}>auto-salvando...</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs" style={{ color: '#36555A' }}>✓ auto-salvo</span>
          )}
          <Button
            onClick={() => confirmBeforePublish ? setShowConfirmPublish(true) : handleSubmit()}
            disabled={submitting}
            size="lg"
            style={{ backgroundColor: '#36555A' }}
            data-testid="finalize-correction-button"
          >
            {submitting ? 'Finalizando...' : '✓ Finalizar Correção'}
          </Button>
        </div>
      </div>

      <div className="flex" style={{ alignItems: 'flex-start' }}>
        {/* PAINEL ESQUERDO - Texto + Anotações */}
        <div style={{ flex: 1, minWidth: 0 }}>
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

            {(selectedTool === 'underline' || selectedTool === 'highlight' || selectedTool === 'pen' || selectedTool === 'strikethrough') && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex gap-1">
                  {COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        selectedColor === color.value ? 'border-slate-900' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </>
            )}

            {selectedTool === 'pen' && (
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
            )}

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

            <Separator orientation="vertical" className="h-6" />
            <Button
              onClick={handleAnalyzeWithAI}
              disabled={aiAnalyzing}
              style={{ backgroundColor: '#36555A' }}
              size="sm"
              data-testid="analyze-ai-button"
            >
              <Sparkles size={16} className="mr-2" />
              {aiAnalyzing ? 'Analisando...' : '🤖 Analisar com IA'}
            </Button>
          </div>

          {/* RECADO DO ALUNO */}
          {essay.student_note && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#FDF3E8', border: '1px solid #DAB257' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#D66B27' }}>✉ Recado do aluno:</p>
              <p className="text-sm" style={{ color: '#2C1A0E' }}>{essay.student_note}</p>
            </div>
          )}

          {/* BANNER REESCRITA - para o professor */}
          {essay.is_rewrite && essay.parent_essay_id && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#FFF0E0', border: '1px solid #D66B27' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#D66B27' }}>✏️ Esta é uma reescrita</p>
              <a
                href={`/essay/${essay.parent_essay_id}/correction`}
                className="text-xs underline"
                style={{ color: '#7C1805' }}
                target="_blank"
                rel="noreferrer"
              >
                Ver versão anterior →
              </a>
            </div>
          )}

          {/* TEXTO DA REDAÇÃO */}
          <div className="p-8">
            <div
              ref={canvasContainerRef}
              style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}
            >
              <div
                ref={textRef}
                onMouseUp={handleTextSelection}
                onDoubleClick={() => setSelectedTool('comment')}
                onContextMenu={(e) => { e.preventDefault(); setSelectedTool('pen'); }}
                onMouseMove={(e) => {
                  const target = e.target.closest('[data-comment-id]');
                  if (target) {
                    const commentId = parseInt(target.getAttribute('data-comment-id'));
                    setHoveredCommentId(commentId);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  } else {
                    setHoveredCommentId(null);
                  }
                }}
                className="bg-white shadow-sm rounded-lg p-12 relative z-10"
                style={{
                  fontSize: '18px',
                  fontFamily: 'Lora, serif',
                  lineHeight: '1.8',
                  minHeight: '600px',
                  transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                  transformOrigin: 'top left',
                  cursor: selectedTool === 'strikethrough' ? 'crosshair'
                        : selectedTool === 'underline' ? 'text'
                        : selectedTool === 'highlight' ? 'text'
                        : selectedTool === 'comment' ? 'text'
                        : 'default',
                  userSelect: selectedTool === 'select' ? 'none' : 'text',
                }}
                data-testid="essay-text"
              ></div>
              <canvas
                ref={nativeCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: ['pen','eraser','line','arrow','oval','rect'].includes(selectedTool) ? 'all' : 'none',
                  zIndex: 15,
                  cursor: selectedTool === 'eraser' ? 'none' : 'crosshair',
                  touchAction: 'none',
                  display: 'block',
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasMouseDown}
                onTouchMove={handleCanvasMouseMove}
                onTouchEnd={handleCanvasMouseUp}
              />
            </div>
          </div>
        </div>

        {/* BORRACHA — cursor visual */}
      {selectedTool === 'eraser' && eraserCursor && (
        <div style={{
          position: 'fixed',
          left: eraserCursor.x - eraserWidth / 2,
          top: eraserCursor.y - eraserWidth / 2,
          width: eraserWidth,
          height: eraserWidth,
          border: '2px solid #7C1805',
          borderRadius: '3px',
          pointerEvents: 'none',
          zIndex: 9999,
          backgroundColor: 'rgba(124,24,5,0.08)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
        }} />
      )}

      {/* TOOLTIP GLOBAL */}
      {activeTooltip && (
        <div style={{
          position: 'fixed',
          left: activeTooltip.x,
          top: activeTooltip.y,
          transform: 'translateX(-50%)',
          backgroundColor: '#2C1A0E',
          color: '#FDF3E8',
          fontSize: '11px',
          fontWeight: '600',
          padding: '4px 8px',
          borderRadius: '5px',
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {activeTooltip.label}
          <div style={{
            position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
            borderBottom: '4px solid #2C1A0E',
          }} />
        </div>
      )}

      {/* PAINEL DIREITO - Avaliação */}
        <div className="bg-white border-l" style={{ width: '38%', minWidth: '360px', maxWidth: '480px', position: 'sticky', top: '72px', height: 'calc(100vh - 72px)', overflowY: 'auto' }}>
          <div className="p-6 space-y-6">
            {/* PONTUAÇÃO */}
            <div>
              <h3 className="font-semibold mb-3" style={{ color: '#7C1805' }}>Pontuação por Critério</h3>
              {prompt.criteria.map((criterion) => {
                const levels = [];
                if (criterion.level_descriptions && criterion.level_descriptions.length > 0) {
                  criterion.level_descriptions.forEach(l => levels.push(l.pontuacao));
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
                            title={`${val} pontos${val === 0 ? ' — Não atendeu' : val === criterion.peso_maximo ? ' — Atendeu plenamente' : ''}`}
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
                      const levelInfo = criterion.level_descriptions?.find(l => l.pontuacao === current);
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
              <h3 className="font-semibold mb-2" style={{ color: '#7C1805' }}>Feedback Geral *</h3>
              <Textarea
                id="general-feedback"
                value={feedback.general_feedback}
                onChange={(e) => setFeedback({ ...feedback, general_feedback: e.target.value })}
                rows={6}
                placeholder="Escreva aqui o feedback completo para o aluno..."
                data-testid="general-feedback-input"
              />
            </div>

            {/* SUGESTÕES DA IA */}
            {aiSuggestions && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold" style={{ color: '#7C1805' }}>
                      🤖 Análise da IA
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: '#FDF3E8', color: '#D66B27' }}>
                        {visibleAiErrors.length} ponto{visibleAiErrors.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setAiSuggestions(null)}
                        className="text-xs"
                        style={{ color: '#6B5B4E' }}
                        title="Fechar análise"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {aiSuggestions.resumo && (
                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#FDF3E8', border: '1px solid #DAB257' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#D66B27' }}>Resumo geral</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#2C1A0E' }}>{aiSuggestions.resumo}</p>
                    </div>
                  )}

                  {visibleAiErrors.length === 0 ? (
                    <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#F0F5F5', border: '1px solid #36555A' }}>
                      <p className="text-xs font-semibold" style={{ color: '#36555A' }}>✓ Nenhum ponto específico encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleAiErrors.map((erro) => {
                        const badge = TIPO_BADGES[erro.tipo] || TIPO_BADGES.gramatical;
                        const isExpanded = expandedSuggestions[erro.id];
                        return (
                          <div key={erro.id} className="rounded-lg overflow-hidden"
                            style={{ border: `1px solid ${badge.color}20`, backgroundColor: '#FFF' }}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-3 py-2"
                              style={{ backgroundColor: `${badge.color}15` }}>
                              <span className="text-xs font-bold" style={{ color: badge.color }}>
                                {badge.icon} {badge.label}
                              </span>
                              <button onClick={() => handleDismissError(erro.id)}
                                style={{ color: '#6B5B4E' }}>
                                <X size={12} />
                              </button>
                            </div>
                            {/* Trecho */}
                            <div className="px-3 py-2">
                              <p className="text-xs italic mb-1" style={{ color: '#6B5B4E' }}>
                                "{erro.trecho?.substring(0, 80)}{erro.trecho?.length > 80 ? '...' : ''}"
                              </p>
                              <p className="text-xs" style={{ color: '#2C1A0E' }}>{erro.descricao}</p>
                            </div>
                            {/* Ações */}
                            <div className="px-3 pb-2 flex gap-2">
                              <button
                                onClick={() => setExpandedSuggestions({ ...expandedSuggestions, [erro.id]: !isExpanded })}
                                className="text-xs flex items-center gap-1"
                                style={{ color: '#D66B27' }}>
                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                Sugestão
                              </button>
                              <button
                                onClick={() => handleAddErrorAsComment(erro)}
                                className="text-xs flex items-center gap-1"
                                style={{ color: '#7C1805' }}>
                                <Plus size={11} /> Comentário
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="px-3 pb-3">
                                <p className="text-xs p-2 rounded" style={{ backgroundColor: '#FDF3E8', color: '#2C1A0E' }}>
                                  {erro.sugestao}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO PUBLICAR */}
      {showConfirmPublish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]">
            <h3 className="font-heading font-bold text-lg mb-2" style={{ color: '#7C1805' }}>
              Publicar correção?
            </h3>
            <p className="text-sm mb-1" style={{ color: '#2C1A0E' }}>
              <strong>{essay?.student_name}</strong> receberá a correção imediatamente.
            </p>
            <p className="text-sm mb-4" style={{ color: '#6B5B4E' }}>
              Total: <strong style={{ color: '#7C1805' }}>{prompt?.criteria?.reduce((s, c) => s + (scores[c.id] || 0), 0)} pts</strong>
              {' '}de {prompt?.criteria?.reduce((s, c) => s + c.peso_maximo, 0)} pts
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: '#E8DDD0', color: '#6B5B4E' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPublish}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#36555A' }}
              >
                ✓ Confirmar e publicar
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

      {/* MODAL CONFIRMAR PUBLICAÇÃO */}


      {/* TOOLTIP HOVER DE COMENTÁRIO */}
      {hoveredCommentId && (
        <div
          className="fixed bg-white border shadow-lg rounded-lg p-3 z-50"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 60}px`,
            maxWidth: '300px'
          }}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>#{hoveredCommentId}</p>
              <p className="text-sm">{inlineComments.find(c => c.id === hoveredCommentId)?.comment}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteComment(hoveredCommentId)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
