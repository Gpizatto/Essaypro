import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Award, TrendingUp, Lightbulb, RotateCcw, Download, FileText, BookOpen, X, CalendarDays, User, CheckCircle2, Clock, MessageSquarePlus, Star, ExternalLink, Save, Bookmark } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Textarea } from '../components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Canvas, PencilBrush } from 'fabric';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score, max) => {
  const percentage = max > 0 ? (score / max) * 100 : 0;
  if (percentage >= 80) return '#36555A';
  if (percentage >= 60) return '#3B82F6';
  if (percentage >= 40) return '#F59E0B';
  return '#EF4444';
};

export const CorrectionView = () => {
  const { essayId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [essay, setEssay] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [loading, setLoading] = useState(true);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [courseSettings, setCourseSettings] = useState(null);
  const [intervention, setIntervention] = useState({ teacher_comment: '', suggest_rewrite: false, mark_important: false, extra_material: '' });
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionDirty, setInterventionDirty] = useState(false);

  useEffect(() => {
    fetchData();
  }, [essayId]);

  useEffect(() => {
    if (correction && correction.canvas_annotations && canvasContainerRef.current && !fabricCanvasRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const canvas = new Canvas('readonly-canvas', {
        width: rect.width,
        height: rect.height,
        isDrawingMode: false,
        selection: false
      });
      
      canvas.loadFromJSON(correction.canvas_annotations, () => {
        canvas.renderAll();
        canvas.forEachObject((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });
      });
      
      fabricCanvasRef.current = canvas;
    }
  }, [correction]);

  useEffect(() => {
    if (correction && correction.inline_comments && textRef.current) {
      renderInlineComments();
    }
  }, [correction]);

  const fetchData = async () => {
    try {
      const [essayRes, correctionRes] = await Promise.all([
        axios.get(`${API_URL}/api/essays/${essayId}`, { withCredentials: true }),
        axios.get(`${API_URL}/api/corrections/${essayId}`, { withCredentials: true }),
      ]);
      setEssay(essayRes.data);
      setCorrection(correctionRes.data);

      // Buscar proposta para o modal
      const promptsRes = await axios.get(`${API_URL}/api/prompts`, { withCredentials: true });
      const found = promptsRes.data.find(p => p.id === essayRes.data.prompt_id);
      if (found) setPrompt(found);

      // Buscar configurações do curso
      const settingsRes = await axios.get(`${API_URL}/api/settings/course`, { withCredentials: true });
      setCourseSettings(settingsRes.data);

      // Buscar intervenção do professor
      try {
        const intRes = await axios.get(`${API_URL}/api/corrections/${essayId}/intervention`, { withCredentials: true });
        setIntervention(intRes.data);
      } catch (e) { /* sem intervenção ainda */ }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadEssay = () => {
    if (!essay?.content) return;
    const text = `REDAÇÃO — ${essay.prompt_title || 'Sem título'}\n\nEnviada em: ${new Date(essay.submitted_at).toLocaleDateString('pt-BR')}\n\n${essay.content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redacao-${essayId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCorrection = () => {
    if (!correction) return;
    const lines = [
      `CORREÇÃO — ${essay?.prompt_title || 'Sem título'}`,
      `Data: ${new Date(correction.corrected_at).toLocaleDateString('pt-BR')}`,
      `Nota Total: ${correction.total_score}`,
      '',
      '=== AVALIAÇÃO POR CRITÉRIO ===',
      ...(correction.criteria_scores || []).map(cs => `${cs.nome}: ${cs.score}/${cs.max}`),
      '',
      '=== FEEDBACK GERAL ===',
      correction.general_feedback || '',
      '',
      '=== PONTOS FORTES ===',
      correction.strengths || '',
      '',
      '=== SUGESTÕES DE MELHORIA ===',
      correction.improvements || '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correcao-${essayId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderInlineComments = () => {
    if (!textRef.current || !correction.inline_comments) return;
    
    const textContent = essay.content;
    const sortedComments = [...correction.inline_comments].sort((a, b) => 
      textContent.indexOf(a.selected_text) - textContent.indexOf(b.selected_text)
    );

    sortedComments.forEach(comment => {
      const index = textContent.indexOf(comment.selected_text);
      if (index === -1) return;

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
        
        if (startNode && charCount + nodeLength >= index + comment.selected_text.length) {
          endNode = node;
          endOffset = index + comment.selected_text.length - charCount;
          break;
        }
        
        charCount += nodeLength;
      }
      
      if (startNode && endNode) {
        try {
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
          
          const span = document.createElement('span');
          span.textContent = comment.selected_text;
          span.style.backgroundColor = '#FEF3C7';
          span.style.borderBottom = '2px dotted #92400E';
          span.style.padding = '2px 4px';
          span.style.borderRadius = '2px';
          span.style.cursor = 'help';
          span.setAttribute('data-comment-id', comment.id);
          span.className = 'inline-comment-readonly';
          
          const badge = document.createElement('sup');
          badge.textContent = comment.id;
          badge.style.fontSize = '10px';
          badge.style.fontWeight = 'bold';
          badge.style.color = '#92400E';
          badge.style.marginLeft = '2px';
          span.appendChild(badge);
          
          range.deleteContents();
          range.insertNode(span);
        } catch (error) {
          console.error('Error rendering comment:', error);
        }
      }
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-1/2"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Layout>
    );
  }

  if (!correction) {
    return (
      <Layout>
        <Card className="p-12 text-center bg-white">
          <p className="text-lg text-slate-600">Correção não encontrada</p>
        </Card>
      </Layout>
    );
  }

  const saveIntervention = async () => {
    setSavingIntervention(true);
    try {
      await axios.post(`${API_URL}/api/corrections/${essayId}/intervention`, intervention, { withCredentials: true });
      setInterventionDirty(false);
      toast.success('Intervenção salva!');
    } catch (err) {
      toast.error('Erro ao salvar intervenção');
    } finally {
      setSavingIntervention(false);
    }
  };

  const updateIntervention = (key, value) => {
    setIntervention(prev => ({ ...prev, [key]: value }));
    setInterventionDirty(true);
  };

  const totalScore = correction.total_score || 0;
  const maxScore = correction.criteria_scores?.reduce((sum, cs) => sum + cs.max, 0) || 1000;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }} data-testid="correction-title">
              Correção da Redação
            </h1>
            {essay?.is_rewrite && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#FFF0E0', color: '#D66B27', border: '1px solid #D66B27' }}>
                ✏️ Reescrita
              </span>
            )}
            <Badge style={{ backgroundColor: '#36555A', color: '#FDF3E8' }}>
              <CheckCircle2 size={12} className="mr-1" />
              Corrigida
            </Badge>
          </div>

          <p className="font-heading font-semibold text-lg" style={{ color: '#2C1A0E' }}>{essay?.prompt_title}</p>

          {/* Linha de metadados */}
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#6B5B4E' }}>
            <span className="flex items-center gap-1">
              <CalendarDays size={14} />
              Enviada em {essay ? new Date(essay.submitted_at).toLocaleDateString('pt-BR') : '—'}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={14} style={{ color: '#36555A' }} />
              Corrigida em {correction ? new Date(correction.corrected_at).toLocaleDateString('pt-BR') : '—'}
            </span>
            {correction?.teacher_name && courseSettings?.show_teacher_name !== false && (
              <span className="flex items-center gap-1">
                <User size={14} />
                Por {correction.teacher_name}
              </span>
            )}
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowPromptModal(true)}>
            <BookOpen size={15} className="mr-2" />
            Ver Proposta
          </Button>
          {courseSettings?.allow_download !== false && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadEssay}>
                <FileText size={15} className="mr-2" />
                Baixar Redação Original
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCorrection}>
                <Download size={15} className="mr-2" />
                Baixar Correção
              </Button>
            </>
          )}
        </div>

        <Card className="p-8 bg-white border shadow-sm" data-testid="total-score-card">
          <div className="text-center">
            <p className="text-sm font-semibold mb-2" style={{ color: '#525252' }}>
              NOTA TOTAL
            </p>
            <div
              className="text-7xl font-black mb-2"
              style={{ color: getScoreColor(totalScore, maxScore) }}
              data-testid="total-score-value"
            >
              {totalScore}
            </div>
            <p className="text-slate-500">de {maxScore} pontos</p>
            <Progress value={(totalScore / maxScore) * 100} className="h-2 mt-3" />
          </div>
        </Card>

        {/* TEXTO DA REDAÇÃO COM CANVAS */}
        <Card className="p-8 bg-white border shadow-sm">
          <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>
            Sua Redação com Anotações
          </h2>
          <div ref={canvasContainerRef} style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
            <div
              ref={textRef}
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
              className="relative z-10 bg-white p-8"
              style={{ fontSize: '18px', fontFamily: 'Lora, serif', lineHeight: '1.8', minHeight: '400px' }}
            >
              {essay?.content || 'Conteúdo não disponível'}
            </div>
            {correction.canvas_annotations && (
              <canvas
                id="readonly-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              />
            )}
          </div>
        </Card>

        <div>
          <h2 className="font-heading text-2xl font-bold mb-4" style={{ color: '#7C1805' }}>
            Avaliação por Critérios
          </h2>
          <div className="space-y-4">
            {correction.criteria_scores && correction.criteria_scores.map((cs) => (
              <Card key={cs.criteria_id} className="p-6 bg-white border" data-testid={`competency-${cs.criteria_id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#7C1805' }}>
                      {cs.nome}
                    </p>
                  </div>
                  <span className="text-2xl font-bold ml-4" style={{ color: '#36555A' }}>
                    {cs.score}/{cs.max}
                  </span>
                </div>
                <Progress value={(cs.score / cs.max) * 100} className="h-2" />
              </Card>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border" data-testid="general-feedback-card">
            <div className="flex items-center gap-2 mb-3">
              <Award size={20} style={{ color: '#36555A' }} />
              <h3 className="font-semibold" style={{ color: '#7C1805' }}>
                Feedback Geral
              </h3>
            </div>
            <p className="text-slate-700 leading-relaxed">{correction.general_feedback}</p>
          </Card>

          <Card className="p-6 bg-white border" data-testid="strengths-card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={20} style={{ color: '#36555A' }} />
              <h3 className="font-semibold" style={{ color: '#7C1805' }}>
                Pontos Fortes
              </h3>
            </div>
            <p className="text-slate-700 leading-relaxed">{correction.strengths || 'Nenhum comentário'}</p>
          </Card>

          <Card className="p-6 bg-white border" data-testid="improvements-card">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={20} style={{ color: '#F59E0B' }} />
              <h3 className="font-semibold" style={{ color: '#7C1805' }}>
                Sugestões de Melhoria
              </h3>
            </div>
            <p className="text-slate-700 leading-relaxed">{correction.improvements || 'Nenhum comentário'}</p>
          </Card>
        </div>

        {/* COMENTÁRIO COMPLEMENTAR DO PROFESSOR — visível ao aluno */}
        {correction.teacher_comment && user?.role === 'student' && (
          <Card className="p-5 bg-white border" style={{ borderLeft: '4px solid #D9B2CF' }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquarePlus size={16} style={{ color: '#D9B2CF' }} />
              <p className="font-semibold text-sm" style={{ color: '#7C1805' }}>Observação da Professora</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#2C1A0E' }}>{correction.teacher_comment}</p>
          </Card>
        )}

        {/* MATERIAL EXTRA — visível ao aluno */}
        {correction.extra_material && user?.role === 'student' && (
          <Card className="p-5 bg-white border" style={{ borderLeft: '4px solid #DAB257' }}>
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink size={16} style={{ color: '#DAB257' }} />
              <p className="font-semibold text-sm" style={{ color: '#7C1805' }}>Material Complementar</p>
            </div>
            <p className="text-sm" style={{ color: '#2C1A0E' }}>{correction.extra_material}</p>
          </Card>
        )}

        {/* PAINEL DE INTERVENÇÃO — visível apenas ao professor/admin */}
        {user?.role !== 'student' && (
          <Card className="p-5 bg-white border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={18} style={{ color: '#7C1805' }} />
                <h3 className="font-semibold" style={{ color: '#7C1805' }}>Intervenção Pedagógica</h3>
              </div>
              <div className="flex items-center gap-2">
                {interventionDirty && (
                  <span className="text-xs" style={{ color: '#D66B27' }}>Alterações não salvas</span>
                )}
                <Button size="sm" onClick={saveIntervention} disabled={savingIntervention || !interventionDirty}>
                  <Save size={13} className="mr-1" />
                  {savingIntervention ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Toggles */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => updateIntervention('mark_important', !intervention.mark_important)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={{
                    backgroundColor: intervention.mark_important ? '#FDF3E8' : 'white',
                    borderColor: intervention.mark_important ? '#D66B27' : '#E8DDD0',
                    color: intervention.mark_important ? '#D66B27' : '#6B5B4E',
                  }}
                >
                  <Bookmark size={14} />
                  {intervention.mark_important ? '★ Marcada para revisão em aula' : 'Marcar para revisão em aula'}
                </button>
                <button
                  onClick={() => updateIntervention('suggest_rewrite', !intervention.suggest_rewrite)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                  style={{
                    backgroundColor: intervention.suggest_rewrite ? '#FFF0E0' : 'white',
                    borderColor: intervention.suggest_rewrite ? '#D66B27' : '#E8DDD0',
                    color: intervention.suggest_rewrite ? '#D66B27' : '#6B5B4E',
                  }}
                >
                  <RotateCcw size={14} />
                  {intervention.suggest_rewrite ? 'Reescrita sugerida ✓' : 'Sugerir reescrita ao aluno'}
                </button>
              </div>

              {/* Comentário complementar */}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: '#2C1A0E' }}>
                  Comentário complementar <span style={{ color: '#6B5B4E' }}>(visível ao aluno)</span>
                </label>
                <Textarea
                  rows={3}
                  value={intervention.teacher_comment || ''}
                  onChange={e => updateIntervention('teacher_comment', e.target.value)}
                  placeholder="Adicione uma observação complementar à correção..."
                  className="text-sm"
                />
              </div>

              {/* Material extra */}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: '#2C1A0E' }}>
                  Material extra <span style={{ color: '#6B5B4E' }}>(link ou descrição — visível ao aluno)</span>
                </label>
                <input
                  type="text"
                  value={intervention.extra_material || ''}
                  onChange={e => updateIntervention('extra_material', e.target.value)}
                  placeholder="Ex: https://... ou 'Ver página 45 do caderno'"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E8DDD0', fontSize: '13px', color: '#2C1A0E' }}
                />
              </div>
            </div>
          </Card>
        )}

        {correction.inline_comments && correction.inline_comments.length > 0 && (
          <Card className="p-6 bg-white border">
            <h3 className="font-semibold mb-4" style={{ color: '#7C1805' }}>
              Legenda de Comentários ({correction.inline_comments.length})
            </h3>
            <div className="space-y-3">
              {correction.inline_comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                  >
                    {comment.id}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 italic mb-1">"{comment.selected_text}"</p>
                    <p className="text-sm text-slate-700">{comment.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

        {/* BOTÃO REESCRITA */}
        {courseSettings?.allow_rewrite !== false && (
        <Card className="p-6 bg-white border" style={{ borderColor: '#DAB257', backgroundColor: '#FFFBF0' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#7C1805' }}>
                Quer reescrever esta redação?
              </h3>
              <p className="text-sm" style={{ color: '#6B5B4E' }}>
                Aplique o feedback recebido e envie uma nova versão vinculada a esta correção.
              </p>
            </div>
            <Button
              onClick={() => navigate(`/submit-essay/${essay?.prompt_id}?rewrite=${essayId}`)}
              variant="outline"
              className="shrink-0"
            >
              <RotateCcw size={16} className="mr-2" />
              Enviar Reescrita
            </Button>
          </div>
        </Card>

      {/* MODAL DA PROPOSTA */}
      {showPromptModal && prompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowPromptModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E8DDD0' }}>
              <h2 className="font-heading font-bold text-xl" style={{ color: '#7C1805' }}>
                {prompt.title}
              </h2>
              <button onClick={() => setShowPromptModal(false)} style={{ color: '#6B5B4E' }}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#D66B27' }}>TEMA</p>
                <p className="text-sm" style={{ color: '#2C1A0E' }}>{prompt.theme}</p>
              </div>
              {prompt.supporting_texts && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#D66B27' }}>TEXTOS DE APOIO</p>
                  <p className="text-sm whitespace-pre-line" style={{ color: '#2C1A0E' }}>{prompt.supporting_texts}</p>
                </div>
              )}
              {prompt.instructions && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#D66B27' }}>INSTRUÇÕES</p>
                  <p className="text-sm" style={{ color: '#2C1A0E' }}>{prompt.instructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOOLTIP HOVER DE COMENTÁRIO */}
      {hoveredCommentId && correction.inline_comments && (
        <div
          className="fixed bg-white border shadow-lg rounded-lg p-3 z-50"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 60}px`,
            maxWidth: '300px'
          }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>#{hoveredCommentId}</p>
          <p className="text-sm">{correction.inline_comments.find(c => c.id === hoveredCommentId)?.comment}</p>
        </div>
      )}
    </Layout>
  );
};
