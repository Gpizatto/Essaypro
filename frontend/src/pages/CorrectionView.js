import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Award, RotateCcw, Download, FileText, BookOpen, X, CalendarDays, User, CheckCircle2, Clock, MessageSquarePlus, Star, ExternalLink, Save, Bookmark, Printer } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Textarea } from '../components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

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
  const [pdfPages, setPdfPages] = useState([]);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [loading, setLoading] = useState(true);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [courseSettings, setCourseSettings] = useState(null);
  const [intervention, setIntervention] = useState({ teacher_comment: '', suggest_rewrite: false, mark_important: false, extra_material: '' });
  const [correctionHistory, setCorrectionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [evolutionData, setEvolutionData] = useState([]); // evolução do aluno por competência
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionDirty, setInterventionDirty] = useState(false);
  // Reescrita
  const [rewriteData, setRewriteData] = useState(null);       // { rewrite, rewrite_correction } — para professor ver reescrita
  const [parentCorrectionData, setParentCorrectionData] = useState(null); // { parent_essay_id, parent_correction } — para aluno ver nota original

  useEffect(() => {
    fetchData();
  }, [essayId]);



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
      const essayData = { ...essayRes.data };

      // Normalizar file_url relativa
      if (essayData.file_url && essayData.file_url.startsWith('/api/')) {
        essayData.file_url = `${process.env.REACT_APP_BACKEND_URL}${essayData.file_url}`;
      }

      // Detectar PDF convertido em imagens
      let pages = [];
      try {
        const parsed = JSON.parse(essayData.content || '');
        if (parsed.type === 'pdf_pages' && Array.isArray(parsed.urls)) {
          pages = parsed.urls.map(u =>
            u.startsWith('/api/') ? `${process.env.REACT_APP_BACKEND_URL}${u}` : u
          );
        }
      } catch (e) {}

      // Fallback: qualquer file_url de imagem
      if (pages.length === 0 && essayData.file_url &&
          /\.(jpg|jpeg|png|gif|webp)/i.test(essayData.file_url)) {
        pages = [essayData.file_url];
      }

      setPdfPages(pages);
      setEssay(essayData);
      setCorrection(correctionRes.data);
      
      // Carregar imagem
      if (essayData.file_url && pages.length === 0 &&
          (essayData.submission_method === 'upload' || /\.(jpg|jpeg|png|gif|webp)/i.test(essayData.file_url))) {
        if (essayData.file_url.startsWith('data:')) {
          setImageBlobUrl(essayData.file_url); // data URL — usar direto
        } else {
          fetch(essayData.file_url, { credentials: 'include' })
            .then(r => r.ok ? r.blob() : Promise.reject(r.status))
            .then(blob => setImageBlobUrl(URL.createObjectURL(blob)))
            .catch(() => setImageBlobUrl(essayData.file_url));
        }
      }

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

      // Buscar histórico de versões
      try {
        const histRes = await axios.get(`${API_URL}/api/corrections/${essayId}/history`, { withCredentials: true });
        setCorrectionHistory(histRes.data);
      } catch (e) { /* sem histórico */ }
      // Buscar evolução por competência (outras correções do mesmo aluno)
      try {
        const evolutionRes = await axios.get(`${API_URL}/api/student/evolution`, { withCredentials: true });
        setEvolutionData(evolutionRes.data || []);
      } catch (e) { /* sem evolução */ }

      // Reescrita: professor vê se existe reescrita desta redação
      try {
        const rewriteRes = await axios.get(`${API_URL}/api/essays/${essayId}/rewrite`, {
          withCredentials: true,
          validateStatus: s => s === 200 || s === 404,
        });
        if (rewriteRes.status === 200) setRewriteData(rewriteRes.data);
      } catch (e) { /* sem reescrita */ }

      // Reescrita: aluno vê nota original se esta for uma reescrita
      try {
        const parentRes = await axios.get(`${API_URL}/api/essays/${essayId}/parent-correction`, {
          withCredentials: true,
          validateStatus: s => s === 200 || s === 404,
        });
        if (parentRes.status === 200) setParentCorrectionData(parentRes.data);
      } catch (e) { /* não é reescrita */ }

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

  const handlePrintCorrection = () => {
    window.print();
  };

  const totalScore = correction.total_score || 0;
  const maxScore = correction.criteria_scores?.reduce((sum, cs) => sum + cs.max, 0) || 1000;

  return (
    <Layout>
      <style>{`
        .comment-pin:hover .comment-tooltip { opacity: 1 !important; pointer-events: auto !important; }
        .comment-pin { position: absolute; z-index: 20; cursor: pointer; }
      `}</style>
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
                Baixar Redação
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCorrection}>
                <Download size={15} className="mr-2" />
                Baixar Correção
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintCorrection}>
                <Printer size={15} className="mr-2" />
                Imprimir / PDF
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-2xl font-bold" style={{ color: '#7C1805' }}>
              Sua Redação com Anotações
            </h2>
            {essay?.is_rewrite && essay?.parent_essay_id && (
              <a href={`/correction/${essay.parent_essay_id}`} target="_blank" rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold border flex items-center gap-1"
                style={{ borderColor: '#D66B27', color: '#D66B27' }}>
                🔍 Ver versão anterior
              </a>
            )}
          </div>
          {/* PDF convertido em imagens */}
          {pdfPages.length > 0 ? (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {pdfPages.map((src, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
                  {pdfPages.length > 1 && (
                    <p className="text-xs mb-1" style={{ color: '#6B5B4E' }}>
                      Página {i + 1} de {pdfPages.length}
                    </p>
                  )}
                  {/* Imagem da página */}
                  <img
                    src={src}
                    alt={`Página ${i + 1}`}
                    style={{ width: '100%', display: 'block', borderRadius: '8px', border: '1px solid #E8DDD0' }}
                  />
                  {/* Anotações do professor: pdf_annotations por página ou canvas_annotations geral */}
                  {(correction.pdf_annotations?.[i + 1] || (i === 0 && correction.canvas_annotations?.dataUrl)) && (
                    <img
                      src={correction.pdf_annotations?.[i + 1] || correction.canvas_annotations?.dataUrl}
                      alt={`Anotações página ${i + 1}`}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: '8px', objectFit: 'fill' }}
                    />
                  )}
                  {/* Pins de comentários nesta página — hover mostra texto */}
                  {(correction.inline_comments || [])
                    .filter(c => c.canvasX != null && (!c.page || c.page === i + 1))
                    .map(c => {
                      const canvas = correction.pdf_annotations?.[i + 1];
                      const imgEl = document.querySelector(`img[alt="Página ${i + 1}"]`);
                      const imgW = imgEl?.offsetWidth || 800;
                      const imgH = imgEl?.offsetHeight || 1000;
                      const canvasW = 800; // canvas width used during correction
                      const canvasH = 1000;
                      const leftPct = (c.canvasX / canvasW) * 100;
                      const topPct = (c.canvasY / canvasH) * 100;
                      return (
                        <div key={c.id}
                          className="comment-pin"
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            transform: 'translate(-50%, -100%)',
                          }}
                        >
                          <div style={{
                            backgroundColor: '#7C1805', color: 'white',
                            borderRadius: '50%', width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          }}>!</div>
                          {/* Tooltip ao hover */}
                          <div style={{
                            position: 'absolute', bottom: '28px', left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#2C1A0E', color: 'white',
                            padding: '6px 10px', borderRadius: '8px',
                            fontSize: '12px', whiteSpace: 'nowrap', maxWidth: '220px',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            opacity: 0, pointerEvents: 'none',
                            transition: 'opacity 0.15s',
                            zIndex: 30,
                          }}
                          className="comment-tooltip"
                          >
                            {c.comment}
                            <div style={{
                              position: 'absolute', top: '100%', left: '50%',
                              transform: 'translateX(-50%)',
                              border: '5px solid transparent',
                              borderTopColor: '#2C1A0E',
                            }} />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              ))}

            </div>
          ) : essay?.file_url && (essay.submission_method === 'upload' || /\.(jpg|jpeg|png|gif|webp)/i.test(essay.file_url)) ? (
            // file_url é imagem (PDF convertido numa página) — mostrar com canvas por cima
            <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
              <img
                src={imageBlobUrl || essay.file_url}
                alt="Redação do aluno"
                style={{ width: '100%', display: 'block', borderRadius: '8px', border: '1px solid #E8DDD0' }}
              />
              {/* Mostrar anotações: preferir pdf_annotations[1], fallback para canvas_annotations */}
              {(correction.pdf_annotations?.[1] || correction.canvas_annotations?.dataUrl) && (
                <img
                  src={correction.pdf_annotations?.[1] || correction.canvas_annotations?.dataUrl}
                  alt="Anotações"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: '8px' }}
                />
              )}
              {/* Pins de comentários */}
              {(correction.inline_comments || []).filter(c => c.canvasX != null).map(c => (
                <div key={c.id} className="comment-pin"
                  style={{ position: 'absolute', left: `${(c.canvasX / 800) * 100}%`, top: `${(c.canvasY / 1000) * 100}%`, transform: 'translate(-50%,-100%)', zIndex: 20 }}>
                  <div style={{ backgroundColor: '#7C1805', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>!</div>
                  <div className="comment-tooltip" style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2C1A0E', color: 'white', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', maxWidth: '220px', wordBreak: 'break-word', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s', zIndex: 30, whiteSpace: 'pre-wrap' }}>
                    {c.comment}
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '5px solid transparent', borderTopColor: '#2C1A0E' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
              ref={textRef}
              dangerouslySetInnerHTML={{ __html: essay?.content && !essay.content.startsWith('{') ? essay.content.replace(/\n/g, '<br/>') : 'Conteúdo não disponível' }}
            />
            {correction.canvas_annotations?.dataUrl && (
              <img
                src={correction.canvas_annotations.dataUrl}
                alt="Anotações da correção"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15, objectFit: 'fill' }}
              />
            )}
          </div>
          )}


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

        

        <Card className="p-6 bg-white border" data-testid="general-feedback-card">
          <div className="flex items-center gap-2 mb-3">
            <Award size={20} style={{ color: '#36555A' }} />
            <h3 className="font-semibold" style={{ color: '#7C1805' }}>
              Feedback Geral
            </h3>
          </div>
          <p className="text-slate-700 leading-relaxed">{correction.general_feedback}</p>
        </Card>

        {/* COMPARAÇÃO DE NOTAS — aluno vê nota original vs reescrita */}
        {user?.role === 'student' && parentCorrectionData && (
          <Card className="p-6 bg-white border" style={{ borderLeft: '4px solid #36555A' }}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#7C1805' }}>
              <RotateCcw size={18} /> Comparação: Original × Reescrita
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#F0F7F6', border: '1px solid #D0E8E4' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B5B4E' }}>NOTA ORIGINAL</p>
                <p className="text-4xl font-black" style={{ color: getScoreColor(parentCorrectionData.parent_correction.total_score, correction.criteria_scores?.reduce((s, c) => s + c.max, 0) || 1000) }}>
                  {parentCorrectionData.parent_correction.total_score}
                </p>
                <a href={`/essay/${parentCorrectionData.parent_essay_id}/correction`}
                  className="text-xs mt-2 block" style={{ color: '#36555A' }}>
                  Ver correção original →
                </a>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#FDF3E8', border: '1px solid #DAB257' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B5B4E' }}>NOTA REESCRITA</p>
                <p className="text-4xl font-black" style={{ color: getScoreColor(correction.total_score, correction.criteria_scores?.reduce((s, c) => s + c.max, 0) || 1000) }}>
                  {correction.total_score}
                </p>
                {correction.total_score > parentCorrectionData.parent_correction.total_score ? (
                  <p className="text-xs mt-2 font-semibold" style={{ color: '#36555A' }}>
                    ▲ +{correction.total_score - parentCorrectionData.parent_correction.total_score} pts — Melhorou!
                  </p>
                ) : correction.total_score < parentCorrectionData.parent_correction.total_score ? (
                  <p className="text-xs mt-2 font-semibold" style={{ color: '#7C1805' }}>
                    ▼ {correction.total_score - parentCorrectionData.parent_correction.total_score} pts
                  </p>
                ) : (
                  <p className="text-xs mt-2 font-semibold" style={{ color: '#6B5B4E' }}>= Mesma nota</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* REESCRITA ENVIADA — professor vê que existe uma reescrita desta redação */}
        {user?.role !== 'student' && rewriteData && (
          <Card className="p-5 bg-white border" style={{ borderLeft: '4px solid #D66B27' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-sm flex items-center gap-2" style={{ color: '#D66B27' }}>
                  <RotateCcw size={16} /> O aluno enviou uma reescrita
                </p>
                <p className="text-xs mt-1" style={{ color: '#6B5B4E' }}>
                  {rewriteData.rewrite_correction
                    ? `Reescrita já corrigida — Nota: ${rewriteData.rewrite_correction.total_score} pts`
                    : 'Reescrita aguardando correção'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"
                  onClick={() => navigate(`/essay/${rewriteData.rewrite.id}/correction`)}
                  style={{ borderColor: '#D66B27', color: '#D66B27' }}>
                  {rewriteData.rewrite_correction ? 'Ver correção da reescrita' : 'Corrigir reescrita →'}
                </Button>
              </div>
            </div>
          </Card>
        )}

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

        {/* BOTÃO REESCRITA — aluno vê quando permitido ou quando professor solicitou */}
        {user?.role === 'student' && courseSettings?.allow_rewrite !== false && !rewriteData && (
        <Card className="p-6 bg-white border" style={{
          borderColor: intervention.suggest_rewrite ? '#D66B27' : '#DAB257',
          backgroundColor: intervention.suggest_rewrite ? '#FFF7ED' : '#FFFBF0',
        }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              {intervention.suggest_rewrite ? (
                <>
                  <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: '#D66B27' }}>
                    ✏️ O professor solicitou uma reescrita
                  </p>
                  <h3 className="font-semibold mb-1" style={{ color: '#7C1805' }}>
                    Envie sua nova versão
                  </h3>
                  <p className="text-sm" style={{ color: '#6B5B4E' }}>
                    Aplique o feedback recebido e envie uma nova versão melhorada.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold mb-1" style={{ color: '#7C1805' }}>
                    Quer reescrever esta redação?
                  </h3>
                  <p className="text-sm" style={{ color: '#6B5B4E' }}>
                    Aplique o feedback recebido e envie uma nova versão vinculada a esta correção.
                  </p>
                </>
              )}
            </div>
            <Button
              onClick={() => navigate(`/submit-essay/${essay?.prompt_id}?rewrite=${essayId}`)}
              className="shrink-0"
              style={intervention.suggest_rewrite ? { backgroundColor: '#D66B27', color: 'white' } : {}}
              variant={intervention.suggest_rewrite ? 'default' : 'outline'}
            >
              <RotateCcw size={16} className="mr-2" />
              Enviar Reescrita
            </Button>
          </div>
        </Card>
        )}

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
