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
import { X, Plus, MousePointer, Underline, Highlighter, Strikethrough, MessageSquare, Pen, Eraser, Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Canvas, PencilBrush } from 'fabric';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = [
  { name: 'Amarelo', value: '#FFEB3B' },
  { name: 'Verde', value: '#A5D6A7' },
  { name: 'Vermelho', value: '#EF9A9A' },
  { name: 'Azul', value: '#90CAF9' },
  { name: 'Roxo', value: '#CE93D8' },
  { name: 'Preto', value: '#000000' }
];

const TOOLS = [
  { id: 'select', icon: MousePointer, label: 'Seleção' },
  { id: 'underline', icon: Underline, label: 'Sublinhar' },
  { id: 'highlight', icon: Highlighter, label: 'Grifar' },
  { id: 'strikethrough', icon: Strikethrough, label: 'Riscar' },
  { id: 'comment', icon: MessageSquare, label: 'Comentário' },
  { id: 'pen', icon: Pen, label: 'Caneta Livre' },
  { id: 'eraser', icon: Eraser, label: 'Borracha' }
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
  const fabricCanvasRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('#FFEB3B');
  const [penWidth, setPenWidth] = useState(5);
  const [penOpacity, setPenOpacity] = useState(1);
  const [eraserSize, setEraserSize] = useState('medium');

  const [inlineComments, setInlineComments] = useState([]);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [scores, setScores] = useState({});
  const [scoreErrors, setScoreErrors] = useState({});
  const [feedback, setFeedback] = useState({
    general_feedback: '',
    strengths: '',
    improvements: '',
  });

  const [quickComments, setQuickComments] = useState([]);
  const [quickCommentSearch, setQuickCommentSearch] = useState('');
  const [showAddQuickComment, setShowAddQuickComment] = useState(false);
  const [newQuickComment, setNewQuickComment] = useState('');

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [dismissedErrors, setDismissedErrors] = useState([]);
  const [expandedSuggestions, setExpandedSuggestions] = useState({});

  useEffect(() => {
    fetchData();
    loadQuickComments();
  }, [essayId]);

  useEffect(() => {
    if (essay && textRef.current && !fabricCanvasRef.current) {
      const timer = setTimeout(() => {
        const canvasElement = document.getElementById('correction-canvas');
        if (!canvasElement) {
          console.error('Elemento canvas nao encontrado no DOM');
          return;
        }

        try {
          const textRect = textRef.current.getBoundingClientRect();
          const containerRect = canvasContainerRef.current.getBoundingClientRect();
          const width = Math.max(containerRect.width, 800);
          const height = Math.max(textRef.current.scrollHeight, 600);
          
          const fabricCanvas = new Canvas(canvasElement, {
            width: width,
            height: height,
            isDrawingMode: false,
            selection: false,
            backgroundColor: null
          });
          
          fabricCanvasRef.current = fabricCanvas;
          
          // Inicializar PencilBrush (obrigatorio Fabric.js v7)
          fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
          fabricCanvas.freeDrawingBrush.color = '#000000';
          fabricCanvas.freeDrawingBrush.width = 5;
          
          // Estilizar o wrapper criado pelo Fabric.js
          const wrapper = canvasElement.parentElement;
          if (wrapper && wrapper.classList.contains('canvas-container')) {
            wrapper.style.position = 'absolute';
            wrapper.style.top = '0';
            wrapper.style.left = '0';
            wrapper.style.width = width + 'px';
            wrapper.style.height = height + 'px';
            wrapper.style.pointerEvents = 'none';
            wrapper.style.zIndex = '5';
          }
          
          setCanvasReady(true);
          console.log('Canvas Fabric.js criado:', { width, height, brush: !!fabricCanvas.freeDrawingBrush });
          
        } catch (error) {
          console.error('ERRO ao criar canvas Fabric.js:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [essay]);

  useEffect(() => {
    if (fabricCanvasRef.current && canvasReady) {
      const canvas = fabricCanvasRef.current;
      const canvasElement = document.getElementById('correction-canvas');
      const wrapper = canvasElement?.parentElement;
      
      if (selectedTool === 'pen') {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        
        const rgbaColor = hexToRgba(selectedColor, penOpacity);
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = rgbaColor;
          canvas.freeDrawingBrush.width = penWidth;
        }
        
        if (wrapper) {
          wrapper.style.pointerEvents = 'all';
          wrapper.style.zIndex = '20';
          wrapper.style.cursor = 'crosshair';
        }
        
        canvas.renderAll();
      } else if (selectedTool === 'eraser') {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = '#FFFFFF';
          canvas.freeDrawingBrush.width = eraserSize === 'small' ? 10 : 30;
        }
        
        if (wrapper) {
          wrapper.style.pointerEvents = 'all';
          wrapper.style.zIndex = '20';
          wrapper.style.cursor = 'not-allowed';
        }
        
        canvas.renderAll();
      } else {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        
        if (wrapper) {
          wrapper.style.pointerEvents = 'none';
          wrapper.style.zIndex = '5';
          wrapper.style.cursor = 'default';
        }
        
        canvas.renderAll();
      }
    }
  }, [selectedTool, selectedColor, penWidth, penOpacity, eraserSize, canvasReady]);

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
      const { data } = await axios.get(`${API_URL}/api/users/quick-comments`, { withCredentials: true });
      setQuickComments(data.quick_comments || []);
    } catch (error) {
      console.error('Error loading quick comments:', error);
    }
  };

  const saveQuickComments = async (comments) => {
    try {
      await axios.put(`${API_URL}/api/users/quick-comments`, comments, { withCredentials: true });
      setQuickComments(comments);
    } catch (error) {
      console.error('Error saving quick comments:', error);
      toast.error('Erro ao salvar comentário pronto');
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

  const handleTextSelection = () => {
    if (selectedTool === 'select' || selectedTool === 'pen' || selectedTool === 'eraser') return;

    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) return;
    if (!textRef.current.contains(selection.anchorNode)) return;

    const range = selection.getRangeAt(0).cloneRange();
    const selectedText = selection.toString().trim();

    if (selectedTool === 'comment') {
      setSelectedTextRange({ range, text: selectedText });
      setCommentText('');
      setShowCommentPopup(true);
    } else {
      applyAnnotation(selectedText, range);
    }
  };

  const applyAnnotation = (text, range) => {
    const span = document.createElement('span');

    if (selectedTool === 'underline') {
      span.style.borderBottom = `2px solid ${selectedColor}`;
      span.style.paddingBottom = '2px';
    } else if (selectedTool === 'highlight') {
      span.style.backgroundColor = selectedColor;
      span.style.padding = '2px 0';
    } else if (selectedTool === 'strikethrough') {
      span.style.textDecoration = 'line-through';
      span.style.textDecorationColor = selectedColor;
      span.style.textDecorationThickness = '2px';
      span.style.textDecorationStyle = 'solid';
    }

    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      window.getSelection().removeAllRanges();
    } catch (error) {
      console.error('Error applying annotation:', error);
    }
  };

  const handleAddComment = () => {
    if (commentText.trim() && selectedTextRange) {
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
    setAiAnalyzing(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/ai/analyze-essay`,
        { essay_id: essayId, content: essay.content },
        { withCredentials: true }
      );
      setAiSuggestions(data);
      setDismissedErrors([]);
      toast.success('Análise concluída!');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(error.response?.data?.detail || 'Não foi possível analisar. Tente novamente.');
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

    const criteria_scores = prompt.criteria.map(c => ({
      criteria_id: c.id,
      nome: c.nome,
      score: scores[c.id] || 0,
      max: c.peso_maximo
    }));

    const totalScore = criteria_scores.reduce((sum, cs) => sum + cs.score, 0);

    setSubmitting(true);
    try {
      const canvasData = fabricCanvasRef.current ? fabricCanvasRef.current.toJSON() : null;
      
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
    if (percentage >= 80) return '#10B981';
    if (percentage >= 60) return '#3B82F6';
    if (percentage >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const filteredQuickComments = quickComments.filter(qc => 
    qc.text.toLowerCase().includes(quickCommentSearch.toLowerCase())
  );

  const topFrequent = [...quickComments].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 3);
  const recentComments = [...quickComments]
    .filter(qc => qc.last_used_at)
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
    .slice(0, 5);

  const visibleAiErrors = aiSuggestions?.erros?.filter(e => !dismissedErrors.includes(e.id)) || [];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9F8F6' }}>
      {/* HEADER FIXO */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div>
          <Button
            onClick={() => navigate('/correction-queue')}
            variant="ghost"
            size="sm"
            className="mb-2"
          >
            ← Voltar para fila
          </Button>
          <h1 className="font-heading text-xl font-bold" style={{ color: '#002147' }}>
            {essay.prompt_title}
          </h1>
          <p className="text-sm text-slate-500">Aluno: {essay.student_name}</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="lg"
          style={{ backgroundColor: '#10B981' }}
          data-testid="finalize-correction-button"
        >
          {submitting ? 'Finalizando...' : '✓ Finalizar Correção'}
        </Button>
      </div>

      <div className="flex flex-1">
        {/* PAINEL ESQUERDO - Texto + Anotações */}
        <div className="flex-1" style={{ width: '60%', maxWidth: '60%' }}>
          {/* TOOLBAR */}
          <div className="p-4 bg-white border-b flex items-center gap-2 flex-wrap sticky" style={{ top: '88px', zIndex: 40 }}>
            {TOOLS.map(tool => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  variant={selectedTool === tool.id ? 'default' : 'outline'}
                  size="sm"
                  title={tool.label}
                  data-testid={`tool-${tool.id}`}
                >
                  <Icon size={16} />
                </Button>
              );
            })}

            {(selectedTool === 'underline' || selectedTool === 'highlight' || selectedTool === 'pen') && (
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
                <div className="flex gap-1">
                  <Button
                    variant={penWidth === 2 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPenWidth(2)}
                  >
                    Fina
                  </Button>
                  <Button
                    variant={penWidth === 5 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPenWidth(5)}
                  >
                    Média
                  </Button>
                  <Button
                    variant={penWidth === 10 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPenWidth(10)}
                  >
                    Grossa
                  </Button>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex gap-1">
                  <Button
                    variant={penOpacity === 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPenOpacity(1)}
                  >
                    Sólido
                  </Button>
                  <Button
                    variant={penOpacity === 0.6 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPenOpacity(0.6)}
                  >
                    Médio
                  </Button>
                  <Button
                    variant={penOpacity === 0.3 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPenOpacity(0.3)}
                  >
                    Suave
                  </Button>
                </div>
              </>
            )}

            {selectedTool === 'eraser' && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex gap-1">
                  <Button
                    variant={eraserSize === 'small' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEraserSize('small')}
                  >
                    Pequena
                  </Button>
                  <Button
                    variant={eraserSize === 'large' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEraserSize('large')}
                  >
                    Grande
                  </Button>
                </div>
              </>
            )}

            <Separator orientation="vertical" className="h-6" />
            <Button
              onClick={handleAnalyzeWithAI}
              disabled={aiAnalyzing}
              style={{ backgroundColor: '#6B21A8' }}
              size="sm"
              data-testid="analyze-ai-button"
            >
              <Sparkles size={16} className="mr-2" />
              {aiAnalyzing ? 'Analisando...' : '🤖 Analisar com IA'}
            </Button>
          </div>

          {/* TEXTO DA REDAÇÃO */}
          <div className="flex-1 overflow-y-auto p-8">
            <div
              ref={canvasContainerRef}
              style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}
            >
              <div
                ref={textRef}
                onMouseUp={handleTextSelection}
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
                style={{ fontSize: '18px', fontFamily: 'Lora, serif', lineHeight: '1.8', minHeight: '600px' }}
                data-testid="essay-text"
                suppressContentEditableWarning={true}
                dangerouslySetInnerHTML={{ __html: essay.content ? essay.content.replace(/\n/g, '<br/>') : 'Conteúdo não disponível' }}
              />
              <canvas
                id="correction-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: selectedTool === 'pen' || selectedTool === 'eraser' ? 'all' : 'none',
                  zIndex: selectedTool === 'pen' || selectedTool === 'eraser' ? 20 : -1,
                  cursor: selectedTool === 'pen' ? 'crosshair' : selectedTool === 'eraser' ? 'not-allowed' : 'default'
                }}
              />
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO - Avaliação */}
        <div className="w-[40%] bg-white border-l overflow-y-auto" style={{ maxHeight: 'calc(100vh - 88px)' }}>
          <div className="p-6 space-y-6">
            {/* PONTUAÇÃO */}
            <div>
              <h3 className="font-semibold mb-4" style={{ color: '#002147' }}>Pontuação por Critério</h3>
              {prompt.criteria.map((criterion) => (
                <div key={criterion.id} className="mb-4" data-testid={`score-${criterion.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold">{criterion.nome}</Label>
                      <p className="text-xs text-slate-500 mt-0.5">{criterion.descricao}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Input
                        type="number"
                        value={scores[criterion.id] || 0}
                        onChange={(e) => handleScoreChange(criterion.id, e.target.value, criterion.peso_maximo)}
                        min={0}
                        max={criterion.peso_maximo}
                        step={40}
                        className="w-20 text-right"
                        style={{ fontSize: '16px', fontWeight: 'bold' }}
                      />
                      <span className="text-sm text-slate-600">/ {criterion.peso_maximo}</span>
                    </div>
                  </div>
                  {scoreErrors[criterion.id] && (
                    <div className="mt-1 p-2 rounded" style={{ backgroundColor: '#FEE2E2', border: '1px solid #DC2626' }}>
                      <p className="text-xs font-semibold" style={{ color: '#991B1B' }}>⚠ {scoreErrors[criterion.id]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* TOTAL */}
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F9F8F6' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#525252' }}>NOTA TOTAL</p>
              <p className="text-5xl font-black mb-2" style={{ color: getScoreColor(totalScore, maxScore) }} data-testid="total-score">
                {totalScore}
              </p>
              <p className="text-sm text-slate-500">de {maxScore} pontos</p>
              <Progress value={(totalScore / maxScore) * 100} className="h-2 mt-3" />
            </div>

            <Separator />

            {/* FEEDBACK */}
            <div className="space-y-4">
              <h3 className="font-semibold" style={{ color: '#002147' }}>Feedback</h3>
              
              <div>
                <Label htmlFor="general-feedback">Feedback Geral *</Label>
                <Textarea
                  id="general-feedback"
                  value={feedback.general_feedback}
                  onChange={(e) => setFeedback({ ...feedback, general_feedback: e.target.value })}
                  rows={4}
                  className="mt-1"
                  placeholder="Comentários gerais sobre a redação..."
                  data-testid="general-feedback-input"
                />
              </div>

              <div>
                <Label htmlFor="strengths">Pontos Fortes</Label>
                <Textarea
                  id="strengths"
                  value={feedback.strengths}
                  onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="O que o aluno fez bem..."
                  data-testid="strengths-input"
                />
              </div>

              <div>
                <Label htmlFor="improvements">Pontos a Melhorar</Label>
                <Textarea
                  id="improvements"
                  value={feedback.improvements}
                  onChange={(e) => setFeedback({ ...feedback, improvements: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="O que pode ser melhorado..."
                  data-testid="improvements-input"
                />
              </div>
            </div>

            {/* SUGESTÕES DA IA */}
            {aiSuggestions && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: '#002147' }}>Sugestões da IA</h3>
                  
                  {aiSuggestions.resumo && (
                    <Card className="p-4 mb-4 border-2" style={{ backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm flex items-center gap-2 font-bold mb-2" style={{ color: '#1E40AF' }}>
                            <span>🤖</span> Resumo Geral da IA
                          </p>
                          <p className="text-sm italic font-medium" style={{ color: '#1E3A8A' }}>{aiSuggestions.resumo}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {visibleAiErrors.length === 0 && aiSuggestions.resumo && (
                    <Card className="p-6 text-center border-2" style={{ backgroundColor: '#F0FDF4', borderColor: '#10B981' }}>
                      <p className="text-sm font-semibold" style={{ color: '#065F46' }}>✓ Nenhum erro específico encontrado pela IA</p>
                      <p className="text-xs mt-1" style={{ color: '#047857' }}>Veja o resumo geral acima para orientações</p>
                    </Card>
                  )}

                  {visibleAiErrors.map((erro) => {
                    const badge = TIPO_BADGES[erro.tipo] || TIPO_BADGES.gramatical;
                    const isExpanded = expandedSuggestions[erro.id];
                    
                    return (
                      <Card key={erro.id} className="p-4 mb-3 border-2" style={{ borderColor: badge.color, backgroundColor: '#FFFFFF' }}>
                        <div className="flex items-start justify-between mb-2">
                          <Badge style={{ backgroundColor: badge.color, color: '#FFFFFF', fontWeight: 'bold' }}>
                            {badge.icon} {badge.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismissError(erro.id)}
                            className="hover:bg-red-50"
                          >
                            <X size={14} className="text-red-600" />
                          </Button>
                        </div>
                        
                        <div className="p-3 rounded mb-2" style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}>
                          <p className="text-sm font-mono font-semibold">"{erro.trecho}"</p>
                        </div>
                        
                        <p className="text-sm mb-2 font-medium" style={{ color: '#1E293B' }}>{erro.descricao}</p>
                        
                        <button
                          onClick={() => setExpandedSuggestions({ ...expandedSuggestions, [erro.id]: !isExpanded })}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 mb-2"
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          Ver sugestão
                        </button>
                        
                        {isExpanded && (
                          <div className="p-3 rounded mb-2" style={{ backgroundColor: '#DBEAFE', border: '1px solid #3B82F6' }}>
                            <p className="text-sm font-medium" style={{ color: '#1E3A8A' }}>{erro.sugestao}</p>
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddErrorAsComment(erro)}
                          className="w-full font-semibold"
                          style={{ borderColor: badge.color, color: badge.color }}
                        >
                          <Plus size={14} className="mr-1" /> Adicionar como comentário
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* POPUP DE COMENTÁRIO */}
      {showCommentPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCommentPopup(false)}>
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold" style={{ color: '#002147' }}>Adicionar Comentário</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCommentPopup(false)}>
                <X size={18} />
              </Button>
            </div>

            <p className="text-sm text-slate-600 mb-3 italic p-2 rounded" style={{ backgroundColor: '#FEF3C7' }}>
              "{selectedTextRange?.text}"
            </p>

            {/* Quick Comments */}
            <div className="mb-4">
              <Label className="text-xs mb-2 block">Comentários Prontos</Label>
              
              <div className="mb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    value={quickCommentSearch}
                    onChange={(e) => setQuickCommentSearch(e.target.value)}
                    placeholder="Buscar comentário..."
                    className="pl-9"
                    size="sm"
                  />
                </div>
              </div>

              {recentComments.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Usados recentemente</p>
                  <div className="flex flex-wrap gap-1">
                    {recentComments.map((qc) => (
                      <Badge
                        key={qc.id}
                        className="cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: '#E0E7FF' }}
                        onClick={() => handleUseQuickComment(qc.id, qc.text)}
                      >
                        {qc.text}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {filteredQuickComments.map((qc, index) => {
                  const isFrequent = topFrequent.slice(0, 3).find(t => t.id === qc.id);
                  return (
                    <div key={qc.id} className="relative group">
                      <Badge
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => handleUseQuickComment(qc.id, qc.text)}
                      >
                        {isFrequent && '⭐ '}{qc.text}
                      </Badge>
                      <button
                        onClick={() => handleDeleteQuickComment(qc.id)}
                        className="absolute -top-1 -right-1 hidden group-hover:block bg-red-500 text-white rounded-full w-4 h-4 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              {showAddQuickComment ? (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newQuickComment}
                    onChange={(e) => setNewQuickComment(e.target.value)}
                    placeholder="Novo comentário pronto..."
                    size="sm"
                  />
                  <Button size="sm" onClick={handleAddQuickComment}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowAddQuickComment(false);
                    setNewQuickComment('');
                  }}>
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setShowAddQuickComment(true)}
                >
                  <Plus size={14} className="mr-1" /> Criar Comentário Pronto
                </Button>
              )}
            </div>

            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              placeholder="Digite seu comentário..."
              className="mb-4"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCommentPopup(false)}>Cancelar</Button>
              <Button onClick={handleAddComment}>Adicionar</Button>
            </div>
          </div>
        </div>
      )}

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
