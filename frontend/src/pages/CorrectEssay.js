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
import { X, Plus, MousePointer, Underline, Highlighter, Strikethrough, MessageSquare, Pen, Eraser, Search, Save, Circle, Square, Minus, MoveRight, Trash2, ZoomIn, ZoomOut, Type } from 'lucide-react';

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
  { id: 'textbox',       icon: Type,         label: 'Texto (T)',      group: 'draw' },
  { id: 'eraser',        icon: Eraser,       label: 'Borracha (E)',   group: 'draw' },
];


export const CorrectEssay = () => {
  const { essayId } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const correctionStartTime = React.useRef(Date.now());
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

  // ── PDF.js state ──────────────────────────────────────────
  const pdfBgCanvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfPageImage, setPdfPageImage] = useState(null);
  // Para PDFs convertidos em imagens no frontend (múltiplas páginas)
  const [pdfImagePages, setPdfImagePages] = useState([]); // array de URLs
  const [pdfError, setPdfError] = useState(null); // mensagem de erro ao carregar PDF
  const pdfAnnotationsRef = useRef({});
  const pdfPageRef = useRef(1);

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
  const [eraserCursor, setEraserCursor] = useState(null);
  const [selectionToolbar, setSelectionToolbar] = useState(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageBlobUrl, setImageBlobUrl] = useState(null); // URL local para evitar CORS
  const [showClickCommentPopup, setShowClickCommentPopup] = useState(false);
  const [clickCommentText, setClickCommentText] = useState('');
  const [clickCommentCanvasPos, setClickCommentCanvasPos] = useState({ x: 0, y: 0 });
  // Caixa de texto no canvas (#9)
  const [textboxInput, setTextboxInput] = useState({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, text: '', fontSize: 16 });
  const textboxInputRef = useRef(null);
  // Caixas de texto arrastáveis — guardadas como objetos, não queimadas no canvas
  const [canvasTextboxes, setCanvasTextboxes] = useState([]);
  const [draggingTextbox, setDraggingTextbox] = useState(null); // { id, offsetX, offsetY }
  // Pan/Zoom para imagem PDF
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  // Comentários arrastáveis — mouse events (mais estável que HTML5 drag API)
  const [draggingComment, setDraggingComment] = useState(null); // { id, offsetX, offsetY }
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  // Hover de comentário — com delay para não piscar
  const hoverTimerRef = useRef(null);

  const [scores, setScores] = useState({});
  const [scoreErrors, setScoreErrors] = useState({});
  const [feedback, setFeedback] = useState({
    general_feedback: '',
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

  const [essayHtml, setEssayHtml] = useState('');
  const [courseSettings, setCourseSettings] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false); // U-09
  const [mobileTab, setMobileTab] = useState('canvas'); // 'canvas' | 'score' — abas em mobile
  const [showScorePanel, setShowScorePanel] = useState(true); // ocultar/mostrar painel de notas
  const [suggestRewrite, setSuggestRewrite] = useState(false); // toggle no header — só envia ao finalizar
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

  // 5.2 — Atalhos de teclado (refs para evitar closure stale)
  const undoRef = useRef(null);
  const redoRef = useRef(null);
  useEffect(() => { undoRef.current = undoCanvas; });
  useEffect(() => { redoRef.current = redoCanvas; });

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

      // U-09: fechar modal de atalhos com Esc
      if (e.key === 'Escape') { setShowShortcuts(false); }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undoRef.current?.(); }
        if (e.key === 'y') { e.preventDefault(); redoRef.current?.(); }
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
        't': 'textbox',
      };
      if (map[e.key]) setSelectedTool(map[e.key]);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Drag de textboxes ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingTextbox) return;
      const canvas = nativeCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const newX = (e.clientX - rect.left) * scaleX - draggingTextbox.offsetX;
      const newY = (e.clientY - rect.top) * scaleY - draggingTextbox.offsetY;
      setCanvasTextboxes(prev => prev.map(t =>
        t.id === draggingTextbox.id ? { ...t, canvasX: newX, canvasY: newY } : t
      ));
    };
    const handleMouseUp = () => setDraggingTextbox(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTextbox]);

  // ── Drag de comentários em imagem/PDF via mouse events globais ─────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingComment) return;
      const canvas = nativeCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const newX = (e.clientX - rect.left) * scaleX - draggingComment.offsetX;
      const newY = (e.clientY - rect.top) * scaleY - draggingComment.offsetY;
      setInlineComments(prev => prev.map(c =>
        c.id === draggingComment.id ? { ...c, canvasX: newX, canvasY: newY } : c
      ));
    };
    const handleMouseUp = () => setDraggingComment(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingComment]);

  // 5.4 — Auto-save a cada 30 segundos
  const autoSaveTimerRef = useRef(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  useEffect(() => {
    if (!essay) return;
    const hasContent =
      Object.values(scores).some(v => v > 0) ||
      feedback.general_feedback.trim();

    if (!hasContent) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        // Auto-save: apenas texto e notas (SEM canvas) — mais leve e rápido
        // Canvas é salvo apenas no Ctrl+S / botão Rascunho
        const textAnnotations = textRef.current ? textRef.current.innerHTML : null;
        await axios.post(`${API_URL}/api/corrections/draft`, {
          essay_id: essayId,
          scores,
          feedback,
          inlineComments,
          textAnnotations,
          // canvasDataUrl omitido intencionalmente no auto-save
        }, { withCredentials: true });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      } catch (e) { setAutoSaveStatus(''); }
    }, 45000); // 45s — menos frequente que antes (era 30s)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [scores, feedback, inlineComments]);

  // Inicializar canvas nativo quando o essay carregar
  useEffect(() => {
    if (!essay || !nativeCanvasRef.current) return;

    const canvas = nativeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    const syncSize = () => {
      // NÃO redimensionar quando há imagem ou PDF — o onLoad da imagem cuida disso
      // Redimensionar canvas via syncSize só para redações de texto digitado
      if (essay?.file_url || pdfImagePages.length > 0) return;
      if (!canvasContainerRef.current) return;
      const container = canvasContainerRef.current;
      const w = container.offsetWidth || 800;
      const textH = textRef.current?.scrollHeight || 0;
      const h = Math.max(textH, 600);
      if (w < 1 || h < 1) return;
      if (canvas.width !== w || canvas.height !== h) {
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

    // Só observar resize para redações de texto
    if (!essay?.file_url && pdfImagePages.length === 0) {
      syncSize();
      const ro = new ResizeObserver(syncSize);
      if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
      if (textRef.current) ro.observe(textRef.current);
      return () => ro.disconnect();
    }
  }, [essay, pdfImagePages]);

  // ── Carregar imagem ─────────────────────────────────────
  useEffect(() => {
    if (!essay?.file_url || pdfImagePages.length > 0) return;
    const isUpload = essay.submission_method === 'upload' || /\.(jpg|jpeg|png|gif|webp)/i.test(essay.file_url);
    if (!isUpload) return;

    // data URL — usar direto, sem HTTP request
    if (essay.file_url.startsWith('data:')) {
      setImageBlobUrl(essay.file_url);
      return;
    }

    // URL HTTP — carregar via fetch com credentials e converter para blob
    let objectUrl = null;
    fetch(essay.file_url, { credentials: 'include' })
      .then(r => r.ok ? r.blob() : Promise.reject(r.status))
      .then(blob => { objectUrl = URL.createObjectURL(blob); setImageBlobUrl(objectUrl); })
      .catch(() => setImageBlobUrl(essay.file_url)); // fallback: src direto

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [essay?.file_url]);

  // ── PDF.js: cada página renderizada como imagem ─────────
  const loadPdfJs = () => new Promise((resolve) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    document.head.appendChild(script);
  });

  const renderPdfPage = async (pageNum) => {
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc) return;

    // Salvar anotações da página atual antes de trocar
    const annoCanvas = nativeCanvasRef.current;
    const ctx = ctxRef.current;
    if (ctx && annoCanvas && annoCanvas.width > 0 && annoCanvas.height > 0) {
      pdfAnnotationsRef.current[pdfPageRef.current] = annoCanvas.toDataURL('image/png');
    }

    // Renderizar a página num canvas temporário e converter para imagem
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    await page.render({ canvasContext: tempCanvas.getContext('2d'), viewport }).promise;
    const dataUrl = tempCanvas.toDataURL('image/png');

    pdfPageRef.current = pageNum;
    setPdfPage(pageNum);
    setPdfPageImage(dataUrl); // <img> vai exibir isso, canvas de anotação fica em cima
  };

  // Quando a imagem da página muda, ajustar canvas de anotação
  useEffect(() => {
    if (!pdfPageImage) return;
    // Pequeno delay para a img renderizar e ter dimensões reais
    const timer = setTimeout(() => {
      const container = canvasContainerRef.current;
      const annoCanvas = nativeCanvasRef.current;
      if (!container || !annoCanvas) return;
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (w < 1 || h < 1) return;
      annoCanvas.width = w;
      annoCanvas.height = h;
      ctxRef.current = annoCanvas.getContext('2d');
      // Restaurar anotações desta página
      const saved = pdfAnnotationsRef.current[pdfPageRef.current];
      if (saved) {
        const img = new Image();
        img.onload = () => ctxRef.current?.drawImage(img, 0, 0, w, h);
        img.src = saved;
      } else {
        ctxRef.current?.clearRect(0, 0, w, h);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [pdfPageImage]);

  // Carregar PDF quando essay carrega
  useEffect(() => {
    if (!essay?.file_url || !/\.pdf$/i.test(essay.file_url)) return;
    let cancelled = false;
    loadPdfJs().then(async (pdfjsLib) => {
      try {
        const pdfDoc = await pdfjsLib.getDocument({
          url: essay.file_url,
          withCredentials: false,
        }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdfDoc;
        setPdfTotalPages(pdfDoc.numPages);
        renderPdfPage(1);
      } catch (err) {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setPdfError(essay.file_url);
      }
    }).catch(err => {
      if (!cancelled) setPdfError(essay.file_url);
    });
    return () => { cancelled = true; };
  }, [essay?.file_url]);

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const fetchData = async () => {
    try {
      // Disparar todos os requests em paralelo
      const [essayRes, settingsRes, draftRes, promptsRes] = await Promise.all([
        axios.get(`${API_URL}/api/essays/${essayId}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/settings/course`, { withCredentials: true }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/api/corrections/draft/${essayId}`, {
          withCredentials: true,
          validateStatus: (s) => s === 200 || s === 404,
        }).catch(() => ({ status: 404 })),
        axios.get(`${API_URL}/api/prompts`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);

      // ── Redação ──────────────────────────────────────────────────────────
      const essayData = { ...essayRes.data };
      if (essayData.file_url && essayData.file_url.startsWith('/api/')) {
        essayData.file_url = `${API_URL}${essayData.file_url}`;
      }
      setEssay(essayData);

      const isUpload = essayRes.data.submission_method === 'upload';
      const rawContent = essayRes.data.content || '';
      let pdfPages = [];
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.type === 'pdf_pages' && Array.isArray(parsed.urls)) {
          pdfPages = parsed.urls.map(url =>
            url && url.startsWith('/api/files/') ? `${API_URL}${url}` : url
          );
        }
      } catch (e) {}

      if (pdfPages.length > 0) {
        setPdfImagePages(pdfPages);
        setEssayHtml('');
      } else if (essayData.file_url) {
        setEssayHtml('');
      } else {
        setEssayHtml(
          rawContent
            ? rawContent.replace(/\n/g, '<br/>')
            : isUpload ? '' : 'Conteúdo não disponível'
        );
      }

      // ── Configurações ────────────────────────────────────────────────────
      setCourseSettings(settingsRes.data);
      setConfirmBeforePublish(settingsRes.data.confirm_before_publish !== false);

      // ── Rascunho ─────────────────────────────────────────────────────────
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

      // ── Proposta ─────────────────────────────────────────────────────────
      const promptData = promptsRes.data.find(p => p.id === essayRes.data.prompt_id);
      setPrompt(promptData);

      if (promptData && promptData.criteria) {
        const initialScores = {};
        promptData.criteria.forEach(c => { initialScores[c.id] = 0; });
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
      historyRef.current = [...historyRef.current.slice(-49), snap];
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
      domHistoryRef.current = [...domHistoryRef.current.slice(-49), textRef.current.innerHTML];
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

  const zoomIn  = () => setZoom(p => Math.min(parseFloat((p + 0.25).toFixed(2)), 3.0));
  const zoomOut = () => setZoom(p => Math.max(parseFloat((p - 0.25).toFixed(2)), 0.25));

  // Eventos de desenho no canvas nativo
  // Adicionar textbox arrastável
  const commitTextbox = (text, canvasX, canvasY, color, fontSize) => {
    if (!text.trim()) return;
    setCanvasTextboxes(prev => [...prev, {
      id: `tb_${Date.now()}`,
      text, canvasX, canvasY, color,
      fontSize,           // fontSize atual (muda proporcionalmente ao resize)
      originalFontSize: fontSize, // referência original para cálculo proporcional
      width: null, height: null,  // definidos após primeiro render/resize
      initialWidth: null,         // largura natural inicial (capturada no primeiro render)
    }]);
  };

  // Queimar todas as textboxes no canvas (chamado antes de salvar/publicar)
  const burnTextboxesToCanvas = () => {
    const ctx = ensureCtx();
    if (!ctx) return;
    canvasTextboxes.forEach(tb => {
      ctx.save();
      ctx.font = `${tb.fontSize}px Arial, sans-serif`;
      ctx.fillStyle = tb.color;
      ctx.textBaseline = 'top';
      const lines = tb.text.split('\n');
      const lineHeight = tb.fontSize * 1.4;
      // Usar maxWidth se a caixa foi redimensionada
      const maxW = tb.width ? tb.width - 8 : undefined;
      lines.forEach((line, i) => {
        if (maxW) ctx.fillText(line, tb.canvasX, tb.canvasY + i * lineHeight, maxW);
        else ctx.fillText(line, tb.canvasX, tb.canvasY + i * lineHeight);
      });
      ctx.restore();
    });
  };

  const handleCanvasMouseDown = (e) => {
    const tool = selectedToolRef.current;

    // Caixa de texto — clique abre input flutuante no ponto clicado
    if (tool === 'textbox') {
      if (!nativeCanvasRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      const canvas = nativeCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      // Posição na tela (para o input flutuante)
      const screenX = e.clientX !== undefined ? e.clientX : rect.left + (pos.x / canvas.width) * rect.width;
      const screenY = e.clientY !== undefined ? e.clientY : rect.top + (pos.y / canvas.height) * rect.height;
      setTextboxInput({ visible: true, x: screenX, y: screenY, canvasX: pos.x, canvasY: pos.y, text: '', fontSize: 16 });
      setTimeout(() => textboxInputRef.current?.focus(), 50);
      return;
    }

    // Comentário por clique em imagem/PDF (sem precisar selecionar texto)
    if (tool === 'comment' && essay?.file_url) {
      if (!ensureCtx()) return;
      const pos = getPos(e);
      const ctx = ctxRef.current;
      const color = selectedColorRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 6, 10, 0, 2 * Math.PI);
      ctx.fillStyle = color; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pos.x - 4, pos.y - 2); ctx.lineTo(pos.x + 4, pos.y - 2); ctx.lineTo(pos.x, pos.y + 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', pos.x, pos.y - 6); ctx.restore();
      setClickCommentText('');
      setClickCommentCanvasPos({ x: pos.x, y: pos.y });
      setShowClickCommentPopup(true);
      return;
    }
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
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = penWidthRef.current || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'line' || tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.beginPath();
        ctx.rect(sx, sy, pos.x - sx, pos.y - sy);
        ctx.stroke();
      } else if (tool === 'oval') {
        const rx = Math.abs(pos.x - sx) / 2;
        const ry = Math.abs(pos.y - sy) / 2;
        const cx = (sx + pos.x) / 2;
        const cy = (sy + pos.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
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
      burnTextboxesToCanvas();
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

      // Salvar anotação da página atual do PDF antes de enviar
      const annoCanvas = nativeCanvasRef.current;
      if ((pdfDocRef.current || pdfImagePages.length > 0) && annoCanvas && annoCanvas.width > 0) {
        pdfAnnotationsRef.current[pdfPageRef.current] = annoCanvas.toDataURL('image/png');
      }

      await axios.post(`${API_URL}/api/corrections/draft`, {
        essay_id: essayId,
        scores,
        feedback,
        inlineComments,
        canvasDataUrl: canvasDraft,
        textAnnotations,
        pdfAnnotations: (pdfDocRef.current || pdfImagePages.length > 0) ? pdfAnnotationsRef.current : undefined,
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

      // ── Auto-salvar modelo de texto ────────────────────────────────────────
      // Se o comentário digitado não existir ainda no banco, salva automaticamente
      const trimmed = newComment.comment;
      const allSaved = [
        ...quickComments,
        ...sharedComments,
      ];
      const alreadyExists = allSaved.some(
        qc => qc.text.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists && trimmed.length >= 3) {
        const autoEntry = {
          id: `qc_auto_${Date.now()}`,
          text: trimmed,
          use_count: 1,
          last_used_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          category: 'geral',
        };
        const updated = [...quickComments, autoEntry];
        saveQuickComments(updated);
        toast.success('Comentário adicionado e salvo no banco de modelos ✓', { duration: 3000 });
      } else {
        toast.success('Comentário adicionado');
      }
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
    burnTextboxesToCanvas();

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
      
      // Salvar anotação da página atual do PDF antes de publicar
      if ((pdfDocRef.current || pdfImagePages.length > 0) && nativeCanvasRef.current && nativeCanvasRef.current.width > 0) {
        pdfAnnotationsRef.current[pdfPageRef.current] = nativeCanvasRef.current.toDataURL('image/png');
      }

      await axios.post(
        `${API_URL}/api/corrections`,
        {
          essay_id: essayId,
          criteria_scores,
          total_score: totalScore,
          ...feedback,
          inline_comments: inlineComments,
          canvas_annotations: canvasData,
          pdf_annotations: (pdfDocRef.current || pdfImagePages.length > 0) ? pdfAnnotationsRef.current : undefined,
          correction_time_minutes: Math.round((Date.now() - correctionStartTime.current) / 60000),
        },
        { withCredentials: true }
      );

      // Se reescrita marcada, notificar o aluno via endpoint de intervenção
      if (suggestRewrite) {
        try {
          await axios.post(
            `${API_URL}/api/corrections/${essayId}/intervention`,
            { suggest_rewrite: true },
            { withCredentials: true }
          );
        } catch (e) {
          console.warn('Rewrite intervention failed:', e);
        }
      }

      toast.success(suggestRewrite ? 'Correção enviada e reescrita solicitada!' : 'Correção finalizada com sucesso!');
      navigate('/correction-queue');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erro ao enviar correção');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper  // Helper: abre popup de edição para uma textbox existente
  // Helper: JSX de uma textbox arrastável com resize nativo
  // Componente React para textbox arrastável e redimensionável
  const TextboxItem = React.memo(({ tb, draggingId, canvasRef, onDragStart, onResize, onRemove }) => {
    const elRef = React.useRef(null);

    // Capturar largura natural após montagem (sem chamar setState durante render)
    React.useEffect(() => {
      if (elRef.current && !tb.initialWidth) {
        const naturalW = elRef.current.offsetWidth;
        if (naturalW > 0) onResize(tb.id, null, null, naturalW);
      }
    }, []); // eslint-disable-line

    const handleMouseDown = (e) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const isResizeHandle = (e.clientX > rect.right - 16 && e.clientY > rect.bottom - 16);
      if (isResizeHandle) return;
      e.stopPropagation();
      const canvas = canvasRef.current; if (!canvas) return;
      const cRect = canvas.getBoundingClientRect();
      const offsetX = (e.clientX - cRect.left) * (canvas.width / cRect.width) - tb.canvasX;
      const offsetY = (e.clientY - cRect.top) * (canvas.height / cRect.height) - tb.canvasY;
      onDragStart(tb.id, offsetX, offsetY);
    };

    const handleMouseUp = (e) => {
      const el = e.currentTarget;
      const newW = Math.round(el.offsetWidth);
      const newH = Math.round(el.offsetHeight);
      const refW = tb.initialWidth || newW;
      const ratio = refW > 0 ? newW / refW : 1;
      const newFontSize = Math.max(6, Math.round(tb.originalFontSize * ratio));
      onResize(tb.id, newW, newH, tb.initialWidth || newW, newFontSize);
    };

    return (
      <div style={{
        position: 'absolute',
        left: `${(tb.canvasX / (canvasRef.current?.width || 1)) * 100}%`,
        top: `${(tb.canvasY / (canvasRef.current?.height || 1)) * 100}%`,
        zIndex: 25,
        userSelect: 'none',
      }}>
        <div
          ref={elRef}
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: `${tb.fontSize}px`,
            color: tb.color,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.4,
            padding: '2px 6px',
            border: '1px dashed rgba(0,0,0,0.3)',
            borderRadius: '3px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            minWidth: '40px',
            minHeight: `${tb.fontSize * 1.4 + 6}px`,
            width: tb.width ? `${tb.width}px` : 'auto',
            height: tb.height ? `${tb.height}px` : 'auto',
            resize: 'both',
            overflow: 'hidden',
            cursor: draggingId === tb.id ? 'grabbing' : 'grab',
            boxSizing: 'border-box',
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {tb.text}
        </div>
        <button
          onMouseDown={(e) => { e.stopPropagation(); onRemove(tb.id); }}
          title="Remover"
          style={{
            position: 'absolute', top: '-8px', right: '-8px',
            width: '16px', height: '16px', borderRadius: '50%',
            backgroundColor: 'var(--accent-red)', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: '11px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, lineHeight: 1, zIndex: 1,
          }}
        >×</button>
      </div>
    );
  });

  const handleTextboxDragStart = (id, offsetX, offsetY) => {
    setDraggingTextbox({ id, offsetX, offsetY });
  };

  const handleTextboxResize = (id, newW, newH, initialWidth, newFontSize) => {
    setCanvasTextboxes(prev => prev.map(t => {
      if (t.id !== id) return t;
      // Só initialWidth (primeiro mount) — sem width/height/fontSize
      if (newW === null) return t.initialWidth ? t : { ...t, initialWidth };
      return { ...t, width: newW, height: newH, fontSize: newFontSize, initialWidth: t.initialWidth || initialWidth };
    }));
  };

  const handleTextboxRemove = (id) => {
    setCanvasTextboxes(prev => prev.filter(t => t.id !== id));
  };

  const renderTextbox = (tb) => (
    <TextboxItem
      key={tb.id}
      tb={tb}
      draggingId={draggingTextbox?.id}
      canvasRef={nativeCanvasRef}
      onDragStart={handleTextboxDragStart}
      onResize={handleTextboxResize}
      onRemove={handleTextboxRemove}
    />
  );

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
    if (percentage >= 80) return 'var(--accent-green)';
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


  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* HEADER FIXO */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <Button
            onClick={() => navigate('/correction-queue')}
            variant="ghost"
            size="sm"
            className="mb-1"
          >
            ← Voltar
          </Button>
          <h1 className="font-heading font-bold truncate" style={{ color: 'var(--accent-red)', fontSize: 'clamp(15px, 3vw, 20px)' }}>
            {essay.prompt_title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 truncate">Aluno: {essay.student_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={saveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium border transition-colors"
            style={{
              borderColor: draftSaved ? 'var(--accent-green)' : 'var(--border-color)',
              color: draftSaved ? 'var(--accent-green)' : 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            <Save size={14} />
            {savingDraft ? 'Salvando...' : draftSaved ? 'Salvo ✓' : 'Rascunho (Ctrl+S)'}
          </button>
          {autoSaveStatus === 'saving' && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>auto-salvando...</span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs" style={{ color: 'var(--accent-green)' }}>✓ auto-salvo</span>
          )}
          {/* Botão tela cheia — oculta/mostra painel de notas */}
          <Button
            onClick={() => setShowScorePanel(v => !v)}
            variant="ghost" size="sm"
            title={showScorePanel ? 'Ocultar painel de notas' : 'Mostrar painel de notas'}
            aria-label={showScorePanel ? 'Ocultar painel de notas' : 'Mostrar painel de notas'}
            style={{
              color: showScorePanel ? 'var(--text-secondary)' : 'var(--accent-red)',
              fontSize: '14px', padding: '6px 10px', gap: '4px',
              fontWeight: showScorePanel ? 400 : 600,
            }}
          >
            {showScorePanel ? '⬜ Tela cheia' : '⬛ Ver notas'}
          </Button>
          {/* U-09: botão de atalhos de teclado */}
          <Button
            onClick={() => setShowShortcuts(true)}
            variant="ghost" size="sm"
            title="Atalhos de teclado"
            aria-label="Ver atalhos de teclado"
            style={{ color: 'var(--text-secondary)', fontSize: '16px', padding: '6px 8px' }}
          >
            ⌨
          </Button>
          <Button
            onClick={() => setSuggestRewrite(v => !v)}
            disabled={submitting}
            size="sm"
            variant={suggestRewrite ? 'default' : 'outline'}
            style={{
              borderColor: suggestRewrite ? 'var(--accent-orange)' : 'var(--accent-orange)',
              backgroundColor: suggestRewrite ? 'var(--accent-orange)' : 'transparent',
              color: suggestRewrite ? 'white' : 'var(--accent-orange)',
              minHeight: '36px', fontSize: '12px',
            }}
            title={suggestRewrite ? 'Reescrita será solicitada ao finalizar (clique para desmarcar)' : 'Marcar para solicitar reescrita ao finalizar'}
          >
            {suggestRewrite ? '✓ Reescrita marcada' : '✏️ Solicitar Reescrita'}
          </Button>
          <Button
            onClick={() => confirmBeforePublish ? setShowConfirmPublish(true) : handleSubmit()}
            disabled={submitting}
            size="sm"
            style={{ backgroundColor: 'var(--accent-green)', minHeight: '36px', fontSize: '12px' }}
            data-testid="finalize-correction-button"
          >
            {submitting ? 'Finalizando...' : '✓ Finalizar'}
          </Button>
        </div>
      </div>

      {/* ABAS MOBILE — só aparecem em telas pequenas */}
      <div className="sm:hidden flex border-b bg-white sticky z-30" style={{ top: 0 }}>
        {[
          { key: 'canvas', label: '✏️ Canvas' },
          { key: 'score',  label: '📊 Avaliação' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMobileTab(tab.key)}
            style={{
              flex: 1, padding: '12px 8px', fontSize: '13px', fontWeight: 600,
              border: 'none', cursor: 'pointer', borderBottom: mobileTab === tab.key ? '3px solid var(--accent-red)' : '3px solid transparent',
              backgroundColor: 'white', color: mobileTab === tab.key ? 'var(--accent-red)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      <div className="flex" style={{ alignItems: 'flex-start' }}>
        {/* PAINEL ESQUERDO - Texto + Anotações */}
        <div className={mobileTab === 'score' ? 'hidden sm:block' : ''} style={{ flex: 1, minWidth: 0, maxWidth: showScorePanel ? undefined : '100%' }}>
          {/* TOOLBAR */}
          <div className="bg-white border-b"
            style={{ position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div className="p-2 sm:p-3 flex flex-wrap items-center gap-1.5">
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
              <span className="flex items-center px-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={zoomIn} title="Aumentar zoom">
                <ZoomIn size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCanvas} title="Apagar todas as marcações" style={{ color: 'var(--accent-red)' }}>
                <Trash2 size={16} />
              </Button>
            </div>

            {/* Linha 2: Cores + Espessura */}
            <div className="w-full flex flex-wrap items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
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
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Esp:</span>
                <input
                  type="range"
                  min="0.5" max="20" step="0.5"
                  value={penWidth}
                  onChange={e => setPenWidth(parseFloat(e.target.value))}
                  style={{ width: '80px', accentColor: 'var(--accent-red)' }}
                  title={`Espessura: ${penWidth}px`}
                />
                <span className="text-xs font-mono" style={{ color: 'var(--accent-red)', minWidth: '32px' }}>{penWidth}px</span>
              </div>
            </>

            {selectedTool === 'eraser' && (
              <>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tam:</span>
                  <input
                    type="range"
                    min="5" max="80" step="1"
                    value={eraserWidth}
                    onChange={e => setEraserWidth(parseInt(e.target.value))}
                    style={{ width: '80px', accentColor: 'var(--accent-red)' }}
                    title={`Tamanho: ${eraserWidth}px`}
                  />
                  <span className="text-xs font-mono" style={{ color: 'var(--accent-red)', minWidth: '32px' }}>{eraserWidth}px</span>
                </div>
              </>
            )}

            </div>{/* fim linha 2 */}
          </div>{/* fim toolbar */}
          </div>{/* fim toolbar wrapper */}

          {/* RECADO DO ALUNO */}
          {essay.student_note && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid #DAB257' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-orange)' }}>✉ Recado do aluno:</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{essay.student_note}</p>
            </div>
          )}

          {/* BANNER REESCRITA - para o professor */}
          {essay.is_rewrite && essay.parent_essay_id && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#FFF0E0', border: '1px solid var(--accent-orange)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-orange)' }}>✏️ Esta é uma reescrita</p>
              <a
                href={`/essay/${essay.parent_essay_id}/correction`}
                className="text-xs underline"
                style={{ color: 'var(--accent-red)' }}
                target="_blank"
                rel="noreferrer"
              >
                Ver versão anterior →
              </a>
            </div>
          )}

          {/* PDF renderizado via PDF.js — canvas de fundo + canvas de anotações */}
          {essay?.file_url && /\.pdf$/i.test(essay.file_url) && (
            <div className="px-8 pb-4">
              {/* Header: título + navegação de páginas + botões */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                  📄 PDF do aluno
                </span>
                <div className="flex items-center gap-2">
                  {pdfTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => pdfPage > 1 && renderPdfPage(pdfPage - 1)}
                        disabled={pdfPage <= 1}
                        className="px-2 py-1 rounded text-xs font-bold border"
                        style={{ borderColor: 'var(--border-color)', color: pdfPage <= 1 ? '#ccc' : 'var(--accent-red)' }}>
                        ←
                      </button>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pdfPage} / {pdfTotalPages}
                      </span>
                      <button onClick={() => pdfPage < pdfTotalPages && renderPdfPage(pdfPage + 1)}
                        disabled={pdfPage >= pdfTotalPages}
                        className="px-2 py-1 rounded text-xs font-bold border"
                        style={{ borderColor: 'var(--border-color)', color: pdfPage >= pdfTotalPages ? '#ccc' : 'var(--accent-red)' }}>
                        →
                      </button>
                    </div>
                  )}
                  <a href={essay.file_url} target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1 rounded font-semibold" style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}>
                    ↗ Abrir
                  </a>
                  <a href={essay.file_url}
                    className="text-xs px-3 py-1 rounded font-semibold border" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
                    ⬇ Baixar
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* IMAGEM + TEXTO: canvas fica por cima de tudo */}
          <div className="p-4">
            <div
              ref={canvasContainerRef}
              style={{ position: 'relative', maxWidth: '100%', margin: '0 auto' }}
            >
              {/* PDF convertido em páginas de imagem (novo sistema) */}
              {pdfImagePages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                      📄 PDF — {pdfImagePages.length} pág.
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Navegação */}
                      {pdfImagePages.length > 1 && (
                        <>
                          <button onClick={() => {
                          if (pdfPage > 1) {
                            // Salvar anotação da página atual antes de trocar
                            if (nativeCanvasRef.current && nativeCanvasRef.current.width > 0) {
                              pdfAnnotationsRef.current[pdfPage] = nativeCanvasRef.current.toDataURL('image/png');
                            }
                            setImageRotation(0); setPdfPage(p => p-1);
                          }
                        }}
                            disabled={pdfPage <= 1}
                            className="px-2 py-1 rounded border text-xs font-bold"
                            style={{ borderColor: 'var(--border-color)', color: pdfPage <= 1 ? '#ccc' : 'var(--accent-red)' }}>←</button>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pdfPage}/{pdfImagePages.length}</span>
                          <button onClick={() => {
                          if (pdfPage < pdfImagePages.length) {
                            if (nativeCanvasRef.current && nativeCanvasRef.current.width > 0) {
                              pdfAnnotationsRef.current[pdfPage] = nativeCanvasRef.current.toDataURL('image/png');
                            }
                            setImageRotation(0); setPdfPage(p => p+1);
                          }
                        }}
                            disabled={pdfPage >= pdfImagePages.length}
                            className="px-2 py-1 rounded border text-xs font-bold"
                            style={{ borderColor: 'var(--border-color)', color: pdfPage >= pdfImagePages.length ? '#ccc' : 'var(--accent-red)' }}>→</button>
                          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
                        </>
                      )}
                      {/* Rotação */}
                      <button onClick={() => setImageRotation(r => (r - 90 + 360) % 360)} title="Girar esquerda"
                        className="px-2 py-1 rounded border text-xs font-bold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>↺</button>
                      <button onClick={() => setImageRotation(r => (r + 90) % 360)} title="Girar direita"
                        className="px-2 py-1 rounded border text-xs font-bold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>↻</button>
                      {imageRotation !== 0 && (
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent-orange)' }}>{imageRotation}°</span>
                      )}
                    </div>
                  </div>
                  {/* Container scrollável para pan+zoom */}
                  <div style={{ overflow: 'auto', maxHeight: '92vh', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: selectedTool === 'select' ? 'grab' : 'default' }}>
                    <div style={{
                      position: 'relative', lineHeight: 0,
                      // Rotação sem cortes: ao girar 90/270°, troca largura/altura via padding
                      ...(imageRotation === 90 || imageRotation === 270 ? {
                        transform: `rotate(${imageRotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease',
                        width: `${zoom * 100}%`,
                        minWidth: '100%',
                        marginTop: 'calc((100% - 100vw * 0.3) / 2)',
                        marginBottom: 'calc((100% - 100vw * 0.3) / 2)',
                      } : {
                        transform: imageRotation !== 0 ? `rotate(${imageRotation}deg)` : undefined,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease',
                        width: `${zoom * 100}%`,
                        minWidth: '100%',
                      }),
                    }}>
                      <img
                        src={pdfImagePages[pdfPage - 1]}
                        alt={`Página ${pdfPage}`}
                        style={{ width: '100%', display: 'block' }}
                        onLoad={(e) => {
                          const canvas = nativeCanvasRef.current;
                          if (!canvas) return;
                          const w = e.target.offsetWidth || e.target.naturalWidth;
                          const h = e.target.offsetHeight || e.target.naturalHeight;
                          // Só redimensionar se dimensões mudaram (evita reset no zoom/rotação)
                          if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
                            canvas.width = w; canvas.height = h;
                            ctxRef.current = canvas.getContext('2d');
                            const saved = pdfAnnotationsRef.current[pdfPage];
                            if (saved) {
                              const img2 = new Image();
                              img2.onload = () => ctxRef.current?.drawImage(img2, 0, 0, w, h);
                              img2.src = saved;
                            } else {
                              ctxRef.current?.clearRect(0, 0, w, h);
                            }
                          }
                        }}
                      />
                      {/* Canvas de anotação */}
                      <canvas
                        ref={nativeCanvasRef}
                        style={{
                          position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%',
                          pointerEvents: ['pen','eraser','line','arrow','oval','rect','comment','textbox'].includes(selectedTool) ? 'all' : 'none',
                          zIndex: 10,
                          cursor: selectedTool === 'eraser' ? 'none' : selectedTool === 'textbox' ? 'text' : 'crosshair',
                          touchAction: 'none',
                        }}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        onTouchStart={handleCanvasMouseDown}
                        onTouchMove={handleCanvasMouseMove}
                        onTouchEnd={handleCanvasMouseUp}
                      />
                      {/* Textboxes arrastáveis sobrepostas */}
                      {canvasTextboxes.map(tb => renderTextbox(tb))}

                      {/* Comentários arrastáveis sobrepostos */}
                      {inlineComments.filter(c => c.canvasX != null).map(c => (
                        <div key={c.id} style={{ position: 'absolute', zIndex: 20,
                          left: `${(c.canvasX / (nativeCanvasRef.current?.width || 1)) * 100}%`,
                          top: `${(c.canvasY / (nativeCanvasRef.current?.height || 1)) * 100}%`,
                          transform: 'translate(-50%, -100%)',
                        }}>
                          {/* Pin arrastável */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const canvas = nativeCanvasRef.current;
                              if (!canvas) return;
                              const rect = canvas.getBoundingClientRect();
                              const scaleX = canvas.width / rect.width;
                              const scaleY = canvas.height / rect.height;
                              const offsetX = (e.clientX - rect.left) * scaleX - c.canvasX;
                              const offsetY = (e.clientY - rect.top) * scaleY - c.canvasY;
                              setDraggingComment({ id: c.id, offsetX, offsetY });
                            }}
                            onMouseEnter={() => {
                              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                              setHoveredCommentId(c.id);
                            }}
                            onMouseLeave={() => {
                              hoverTimerRef.current = setTimeout(() => setHoveredCommentId(null), 200);
                            }}
                            style={{
                              backgroundColor: draggingComment?.id === c.id ? '#5a1003' : 'var(--accent-red)',
                              color: 'white',
                              borderRadius: '50% 50% 50% 0',
                              width: '28px', height: '28px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: 'bold',
                              cursor: draggingComment?.id === c.id ? 'grabbing' : 'grab',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              userSelect: 'none',
                              transition: 'background-color 0.1s',
                            }}
                          >
                            💬
                          </div>
                          {/* Tooltip hover */}
                          {hoveredCommentId === c.id && (
                            <div
                              onMouseEnter={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }}
                              onMouseLeave={() => { hoverTimerRef.current = setTimeout(() => setHoveredCommentId(null), 200); }}
                              style={{
                                position: 'absolute', bottom: '36px', left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'white', border: '1px solid var(--border-color)',
                                borderRadius: '8px', padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                minWidth: '180px', maxWidth: '260px',
                                zIndex: 30, pointerEvents: 'auto',
                              }}
                            >
                              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-red)' }}>#{c.id}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{c.comment}</p>
                              <button onClick={() => {
                                setInlineComments(prev => prev.filter(cm => cm.id !== c.id));
                                setHoveredCommentId(null);
                              }} style={{ marginTop: '6px', fontSize: '11px', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                ✕ Remover
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Cabeçalho da imagem — rotação */}
              {essay?.file_url && pdfImagePages.length === 0 &&
               (essay.submission_method === 'upload' || /\.(jpg|jpeg|png|gif|webp)/i.test(essay.file_url)) && (
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>🖼️ Imagem do aluno</span>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => setImageRotation(r => (r - 90 + 360) % 360)} title="Girar esquerda"
                      className="text-xs px-2 py-1 rounded border font-bold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>↺</button>
                    <button onClick={() => setImageRotation(r => (r + 90) % 360)} title="Girar direita"
                      className="text-xs px-2 py-1 rounded border font-bold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>↻</button>
                    {imageRotation !== 0 && <span className="text-xs" style={{ color: 'var(--accent-orange)' }}>{imageRotation}°</span>}
                    <a href={essay.file_url} target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1 rounded font-semibold" style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}>↗ Abrir</a>
                    <a href={essay.file_url}
                      className="text-xs px-3 py-1 rounded font-semibold border" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>⬇ Baixar</a>
                  </div>
                </div>
              )}

              {/* PDF renderizado como imagem — canvas de anotação fica em cima */}
              {essay?.file_url && /\.pdf$/i.test(essay.file_url) && pdfPageImage && (
                <img
                  src={pdfPageImage}
                  alt={`Página ${pdfPage}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#fff',
                  }}
                />
              )}
              {essay?.file_url && /\.pdf$/i.test(essay.file_url) && !pdfPageImage && !pdfError && (
                <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#fff' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>⏳ Carregando PDF...</p>
                </div>
              )}
              {pdfError && (
                <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', padding: '32px' }}>
                  <p style={{ color: 'var(--accent-red)', fontWeight: '600' }}>⚠️ Não foi possível visualizar o PDF inline</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                    O arquivo pode estar com acesso restrito. Use os botões abaixo para abrir ou baixar.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href={pdfError} target="_blank" rel="noreferrer"
                      style={{ backgroundColor: 'var(--accent-red)', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                      ↗ Abrir PDF em nova aba
                    </a>
                    <a href={pdfError}
                      style={{ border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                      ⬇ Baixar PDF
                    </a>
                  </div>
                </div>
              )}

              {/* Imagem direta (JPG/PNG enviado pelo aluno) */}
              {essay?.file_url && pdfImagePages.length === 0 &&
               (essay.submission_method === 'upload' || /\.(jpg|jpeg|png|gif|webp)/i.test(essay.file_url)) && (
                <div style={{ overflow: 'auto', maxHeight: '92vh', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{
                    position: 'relative', lineHeight: 0,
                    transition: 'transform 0.2s ease',
                    width: `${zoom * 100}%`,
                    minWidth: '100%',
                    // Rotação sem cortes: ao girar 90/270° adiciona margem para acomodar a altura virada
                    ...(imageRotation === 90 || imageRotation === 270 ? {
                      transform: `rotate(${imageRotation}deg)`,
                      transformOrigin: 'center center',
                      marginTop: '10%',
                      marginBottom: '10%',
                    } : imageRotation !== 0 ? {
                      transform: `rotate(${imageRotation}deg)`,
                      transformOrigin: 'center center',
                    } : {}),
                  }}>
                    {!imageBlobUrl && (
                      <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>⏳ Carregando imagem...</p>
                      </div>
                    )}
                    <img
                      src={imageBlobUrl || ''}
                      alt="Redação do aluno"
                      style={{ width: '100%', display: imageBlobUrl ? 'block' : 'none' }}
                      onLoad={(e) => {
                        const canvas = nativeCanvasRef.current;
                        if (!canvas) return;
                        const w = e.target.offsetWidth;
                        const h = e.target.offsetHeight;
                        // Só redimensionar se as dimensões realmente mudaram (evita reset no zoom)
                        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
                          // Salvar anotações atuais antes de redimensionar
                          let savedData = null;
                          if (canvas.width > 0 && canvas.height > 0) {
                            savedData = canvas.toDataURL('image/png');
                          }
                          canvas.width = w;
                          canvas.height = h;
                          ctxRef.current = canvas.getContext('2d');
                          // Restaurar escalando para novo tamanho
                          if (savedData) {
                            const img2 = new Image();
                            img2.onload = () => ctxRef.current?.drawImage(img2, 0, 0, w, h);
                            img2.src = savedData;
                          }
                        }
                      }}
                    />
                    {/* Canvas de anotação — irmão da imagem, mesmo transform */}
                    <canvas
                      ref={nativeCanvasRef}
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        pointerEvents: ['pen','eraser','line','arrow','oval','rect','comment','textbox'].includes(selectedTool) ? 'all' : 'none',
                        zIndex: 10,
                        cursor: selectedTool === 'eraser' ? 'none' : selectedTool === 'textbox' ? 'text' : 'crosshair',
                        touchAction: 'none',
                      }}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      onTouchStart={handleCanvasMouseDown}
                      onTouchMove={handleCanvasMouseMove}
                      onTouchEnd={handleCanvasMouseUp}
                    />
                    {/* Textboxes arrastáveis — imagem */}
                    {canvasTextboxes.map(tb => renderTextbox(tb))}
                  </div>
                </div>
              )}

              {/* Upload sem arquivo disponível */}
              {essay?.submission_method === 'upload' && !essay?.file_url && (
                <div className="bg-white rounded-lg p-12 text-center" style={{ border: '1px solid var(--border-color)', minHeight: '400px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    📎 Esta redação foi enviada como arquivo, mas o arquivo não está disponível.<br/>
                    Use as ferramentas acima para adicionar comentários gerais.
                  </p>
                </div>
              )}

              {/* Campo de texto — só para redações digitadas (sem file_url e sem páginas PDF) */}
              <div
                ref={textRef}
                style={{ display: (essay?.file_url || pdfImagePages.length > 0) ? 'none' : undefined }}
                onMouseUp={(e) => {
                  handleTextSelection(e);
                  // C1: Mini toolbar ao selecionar texto
                  const sel = window.getSelection();
                  if (sel && sel.toString().trim().length > 0) {
                    const range = sel.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setSelectionToolbar({ x: rect.left + rect.width / 2, y: rect.top - 10, text: sel.toString().trim() });
                  } else {
                    setSelectionToolbar(null);
                  }
                }}
                onDoubleClick={() => setSelectedTool('comment')}
                onContextMenu={(e) => { e.preventDefault(); setSelectedTool('pen'); }}
                onMouseMove={(e) => {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseOver={(e) => {
                  const target = e.target.closest('[data-comment-id]');
                  if (target) {
                    const commentId = parseInt(target.getAttribute('data-comment-id'));
                    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    setHoveredCommentId(commentId);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseOut={(e) => {
                  const target = e.target.closest('[data-comment-id]');
                  if (target) {
                    hoverTimerRef.current = setTimeout(() => setHoveredCommentId(null), 200);
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
              {/* Canvas para redações de texto digitado — não usar quando há imagem/PDF */}
              {!essay?.file_url && pdfImagePages.length === 0 && (
                <canvas
                  ref={nativeCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                    pointerEvents: ['pen','eraser','line','arrow','oval','rect','textbox'].includes(selectedTool) ? 'all' : 'none',
                    zIndex: 15,
                    cursor: selectedTool === 'eraser' ? 'none' : selectedTool === 'textbox' ? 'text' : 'crosshair',
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
              )}
              {/* Textboxes arrastáveis — modo texto digitado */}
              {!essay?.file_url && pdfImagePages.length === 0 && canvasTextboxes.map(tb => renderTextbox(tb))}
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
          border: '2px solid var(--accent-red)',
          borderRadius: '3px',
          pointerEvents: 'none',
          zIndex: 9999,
          backgroundColor: 'rgba(124,24,5,0.08)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
        }} />
      )}

      {/* C1: MINI TOOLBAR DE SELEÇÃO */}
      {selectionToolbar && (
        <div style={{
          position: 'fixed',
          left: selectionToolbar.x,
          top: selectionToolbar.y,
          transform: 'translate(-50%, -100%)',
          display: 'flex',
          gap: '4px',
          backgroundColor: 'var(--text-primary)',
          borderRadius: '6px',
          padding: '4px 6px',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setSelectedTool('comment');
              setShowCommentPopup(true);
              setSelectionToolbar(null);
            }}
            style={{ color: 'white', fontSize: '11px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
            title="Adicionar comentário"
          >
            💬 Comentar
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setSelectedTool('underline');
              setSelectionToolbar(null);
            }}
            style={{ color: '#FFD700', fontSize: '11px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
            title="Sublinhar"
          >
            U̲
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setSelectedTool('highlight');
              setSelectionToolbar(null);
            }}
            style={{ color: '#FFD700', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
            title="Grifar"
          >
            ✏️
          </button>
        </div>
      )}

      {/* TOOLTIP GLOBAL */}
      {activeTooltip && (
        <div style={{
          position: 'fixed',
          left: activeTooltip.x,
          top: activeTooltip.y,
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--text-primary)',
          color: 'var(--bg-primary)',
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
            borderBottom: '4px solid var(--text-primary)',
          }} />
        </div>
      )}

      {/* PAINEL DIREITO - Avaliação */}
        <div
          className={`bg-white border-l ${mobileTab === 'canvas' ? 'hidden sm:block' : 'w-full sm:w-auto block'}`}
          style={{
            width: '38%', minWidth: '360px', maxWidth: '480px',
            position: 'sticky', top: '72px',
            height: 'calc(100vh - 72px)', overflowY: 'auto',
            display: !showScorePanel ? 'none' : undefined,
          }}
        >
          <div className="p-4 sm:p-6 space-y-6">
            {/* PONTUAÇÃO */}
            <div>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--accent-red)' }}>Pontuação por Critério</h3>
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
                const levelColor = pct === 1 ? 'var(--accent-green)' : pct >= 0.8 ? 'var(--accent-green)' : pct >= 0.6 ? 'var(--accent-orange)' : pct >= 0.4 ? '#DAB257' : pct > 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
                return (
                  <div key={criterion.id} className="mb-5" data-testid={`score-${criterion.id}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 pr-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{criterion.nome}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{criterion.descricao}</p>
                      </div>
                      <span className="text-lg font-black" style={{ color: levelColor }}>
                        {current}<span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>/{criterion.peso_maximo}</span>
                      </span>
                    </div>

                    {/* Botões de nível */}
                    <div className="flex gap-1 mt-2">
                      {levels.map((val) => {
                        const isSelected = current === val;
                        const levelPct = criterion.peso_maximo > 0 ? val / criterion.peso_maximo : 0;
                        const btnColor = levelPct === 1 ? 'var(--accent-green)' : levelPct >= 0.6 ? 'var(--accent-orange)' : levelPct >= 0.4 ? '#DAB257' : levelPct > 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
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
                              border: isSelected ? `2px solid ${btnColor}` : '2px solid var(--border-color)',
                              backgroundColor: isSelected ? btnColor : '#FFF',
                              color: isSelected ? '#FFF' : 'var(--text-secondary)',
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
                          <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                            {levelInfo.proficiencia && (
                              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent-red)' }}>{levelInfo.proficiencia}</p>
                            )}
                            {levelInfo.descricao && (
                              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{levelInfo.descricao}</p>
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
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
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
                <h3 className="font-semibold" style={{ color: 'var(--accent-red)' }}>Feedback Geral *</h3>
                <div className="flex gap-1">
                  {[
                    { label: '⭐ Ótimo', text: 'Excelente trabalho! Sua redação demonstra ótimo domínio da língua portuguesa e capacidade argumentativa. Continue assim!' },
                    { label: '👍 Bom', text: 'Boa redação! Você demonstrou compreensão do tema e boa estrutura argumentativa. Atenção aos pontos de melhoria indicados.' },
                    { label: '📚 Atenção', text: 'Sua redação apresenta aspectos importantes a desenvolver. Leia os comentários com atenção e revise os pontos indicados para melhorar.' },
                  ].map(tpl => (
                    <button key={tpl.label} type="button"
                      onClick={() => setFeedback(prev => ({ ...prev, general_feedback: tpl.text }))}
                      className="text-xs px-2 py-0.5 rounded border"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)', backgroundColor: 'white', fontSize: '11px' }}>
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
                placeholder="Escreva aqui o feedback completo para o aluno..." style={{ fontSize: "16px" }}
                data-testid="general-feedback-input"
              />
            </div>
}
          </div>
        </div>
      </div>

      {/* CAIXA DE TEXTO FLUTUANTE NO CANVAS (#9) */}
      {textboxInput.visible && (
        <div style={{
          position: 'fixed',
          left: textboxInput.x,
          top: textboxInput.y,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          backgroundColor: 'white',
          border: '2px solid var(--accent-red)',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          minWidth: '220px',
        }}>
          {/* Controles de cor e tamanho */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cor:</span>
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setTextboxInput(prev => ({ ...prev, color: c.value }))}
                style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: c.value,
                  border: (textboxInput.color || selectedColor) === c.value ? '2px solid var(--text-primary)' : '1px solid #ccc',
                  cursor: 'pointer', flexShrink: 0,
                }} title={c.name} />
            ))}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '4px' }}>Tam:</span>
            <select
              value={textboxInput.fontSize}
              onChange={e => setTextboxInput(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              style={{ fontSize: '11px', padding: '1px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32].map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>
          {/* Textarea */}
          <textarea
            ref={textboxInputRef}
            value={textboxInput.text}
            onChange={e => setTextboxInput(prev => ({ ...prev, text: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setTextboxInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, text: '', fontSize: 16 });
              }
              // Ctrl+Enter confirma
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitTextbox(
                  textboxInput.text,
                  textboxInput.canvasX,
                  textboxInput.canvasY,
                  textboxInput.color || selectedColor,
                  textboxInput.fontSize,
                );
                setTextboxInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, text: '', fontSize: 16 });
              }
            }}
            placeholder="Digite o texto... (Ctrl+Enter para confirmar)"
            rows={3}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: `${textboxInput.fontSize}px`,
              fontFamily: 'Arial, sans-serif',
              color: textboxInput.color || selectedColor,
              resize: 'both',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {/* Botões */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button onClick={() => setTextboxInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, text: '', fontSize: 16 })}
              onClick={() => setTextboxInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, text: '', fontSize: 16 })}
              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', background: 'white' }}>
              Cancelar
            </button>
            <button
              onClick={() => {
                commitTextbox(
                  textboxInput.text,
                  textboxInput.canvasX,
                  textboxInput.canvasY,
                  textboxInput.color || selectedColor,
                  textboxInput.fontSize,
                );
                setTextboxInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, text: '', fontSize: 16 });
              }}
              disabled={!textboxInput.text.trim()}
              style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '6px',
                backgroundColor: 'var(--accent-red)', color: 'white', border: 'none',
                cursor: textboxInput.text.trim() ? 'pointer' : 'not-allowed',
                opacity: textboxInput.text.trim() ? 1 : 0.5, fontWeight: 600,
              }}>
              ✓ Inserir texto
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO PUBLICAR */}
      {showConfirmPublish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]">
            <h3 className="font-heading font-bold text-lg mb-2" style={{ color: 'var(--accent-red)' }}>
              Publicar correção?
            </h3>
            <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              <strong>{essay?.student_name}</strong> receberá a correção imediatamente.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Total: <strong style={{ color: 'var(--accent-red)' }}>{prompt?.criteria?.reduce((s, c) => s + (scores[c.id] || 0), 0)} pts</strong>
              {' '}de {prompt?.criteria?.reduce((s, c) => s + c.peso_maximo, 0)} pts
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPublish}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--accent-green)' }}
              >
                ✓ Confirmar e publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE COMENTÁRIO EM IMAGEM/PDF — por clique, sem seleção de texto */}
      {showClickCommentPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowClickCommentPopup(false)}>
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--accent-red)' }}>💬 Comentário na imagem</h3>
              <button onClick={() => setShowClickCommentPopup(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <textarea
              autoFocus
              value={clickCommentText}
              onChange={e => setClickCommentText(e.target.value)}
              rows={4}
              placeholder="Digite seu comentário sobre este trecho..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', resize: 'vertical' }}
            />
            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-1 mt-2 mb-4">
              {['Atenção à ortografia', 'Revisar pontuação', 'Boa argumentação', 'Desenvolver mais', 'Coesão textual'].map(s => (
                <button key={s} onClick={() => setClickCommentText(s)}
                  className="text-xs px-2 py-1 rounded-full border"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'white' }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClickCommentPopup(false)}
                className="px-4 py-2 rounded text-sm" style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
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
                style={{ backgroundColor: 'var(--accent-red)', opacity: clickCommentText.trim() ? 1 : 0.5 }}>
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
              <h3 className="font-semibold" style={{ color: 'var(--accent-red)' }}>Adicionar Comentário</h3>
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
              <Label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--accent-red)' }}>
                Banco de Comentários
              </Label>

              {/* Busca */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-2.5" style={{ color: 'var(--text-secondary)' }} />
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
                      backgroundColor: quickCommentCategory === cat.key ? 'var(--accent-red)' : 'transparent',
                      color: quickCommentCategory === cat.key ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      borderColor: quickCommentCategory === cat.key ? 'var(--accent-red)' : 'var(--border-color)',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Usados recentemente */}
              {!quickCommentSearch && quickCommentCategory === 'all' && recentComments.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Recentes</p>
                  <div className="flex flex-wrap gap-1">
                    {recentComments.map(qc => (
                      <Badge key={qc.id} className="cursor-pointer hover:opacity-80 text-xs"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)' }}
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
                  <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>Nenhum comentário encontrado</p>
                ) : filteredQuickComments.map(qc => {
                  const isFrequent = topFrequent.find(t => t.id === qc.id);
                  return (
                    <div key={qc.id} className="relative group flex items-center gap-1">
                      <button
                        className="flex-1 text-left text-xs px-2 py-1.5 rounded border transition-all hover:border-[var(--accent-orange)]"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', backgroundColor: qc.isShared ? '#F9F6FF' : 'white' }}
                        onClick={() => handleUseQuickComment(qc.id, qc.text)}
                      >
                        {isFrequent && <span className="mr-1">⭐</span>}
                        {qc.isShared && <span className="mr-1 text-xs" style={{ color: '#D9B2CF' }}>★</span>}
                        {qc.text}
                        {qc.category && qc.category !== 'geral' && (
                          <span className="ml-1 text-xs px-1 rounded" style={{ backgroundColor: '#F0EBE3', color: 'var(--text-secondary)' }}>
                            {qc.category}
                          </span>
                        )}
                      </button>
                      {!qc.isShared && (
                        <button
                          onClick={() => handleDeleteQuickComment(qc.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}
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
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-primary)' }}
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


      )}

      {/* U-09: MODAL DE ATALHOS DE TECLADO */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowShortcuts(false)}>
          <div className="rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--accent-red)' }}>
                ⌨ Atalhos de Teclado
              </h3>
              <button onClick={() => setShowShortcuts(false)}
                aria-label="Fechar modal de atalhos"
                style={{ color: 'var(--text-secondary)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {[
                { keys: 'S', desc: 'Seleção / mover' },
                { keys: 'P / C', desc: 'Caneta livre' },
                { keys: 'E', desc: 'Borracha' },
                { keys: 'L', desc: 'Linha reta' },
                { keys: 'A', desc: 'Seta' },
                { keys: 'R', desc: 'Retângulo' },
                { keys: 'O', desc: 'Oval / círculo' },
                { keys: 'U', desc: 'Sublinhado' },
                { keys: 'H', desc: 'Marcador (highlight)' },
                { keys: 'X', desc: 'Tachado' },
                { keys: 'M', desc: 'Comentário' },
                { keys: 'T', desc: 'Caixa de texto' },
                { keys: 'Ctrl + Z', desc: 'Desfazer' },
                { keys: 'Ctrl + Y', desc: 'Refazer' },
                { keys: 'Ctrl + S', desc: 'Salvar rascunho' },
                { keys: 'Ctrl + Enter', desc: 'Confirmar texto' },
                { keys: 'Esc', desc: 'Cancelar / fechar' },
              ].map(({ keys, desc }) => (
                <div key={keys} className="flex items-center justify-between py-1.5 px-2 rounded"
                  style={{ borderBottom: '1px solid #F0EBE3' }}>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{desc}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--border-color)', color: 'var(--accent-red)' }}>
                    {keys}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
              Clique fora ou pressione Esc para fechar
            </p>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR PUBLICAÇÃO */}


      {/* TOOLTIP HOVER DE COMENTÁRIO — aparece no hover, não fecha ao mover para o tooltip */}
      {hoveredCommentId && inlineComments.find(c => c.id === hoveredCommentId && c.canvasX == null) && (
        <div
          className="fixed bg-white border shadow-lg rounded-lg p-3 z-50"
          style={{
            left: `${Math.min(tooltipPosition.x + 12, window.innerWidth - 320)}px`,
            top: `${tooltipPosition.y - 80}px`,
            maxWidth: '300px',
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }}
          onMouseLeave={() => { hoverTimerRef.current = setTimeout(() => setHoveredCommentId(null), 150); }}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>Comentário #{hoveredCommentId}</p>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {inlineComments.find(c => c.id === hoveredCommentId)?.comment}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { handleDeleteComment(hoveredCommentId); setHoveredCommentId(null); }}
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
