import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Componente que renderiza PDF como imagens usando PDF.js
const PdfViewer = ({ url }) => {
  const [pages, setPages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!url) return;
    const loadPdf = () => {
      const pdfjs = window.pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjs.getDocument(url).promise
        .then(async (doc) => {
          const imgs = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            imgs.push(canvas.toDataURL('image/png'));
          }
          setPages(imgs);
          setLoading(false);
        })
        .catch(() => { setError(true); setLoading(false); });
    };
    if (window.pdfjsLib) {
      loadPdf();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = loadPdf;
      document.head.appendChild(s);
    }
  }, [url]);

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#6B5B4E' }}>
      ⏳ Carregando PDF...
    </div>
  );
  if (error) return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p style={{ color: '#7C1805', marginBottom: '12px' }}>
        Não foi possível visualizar o PDF inline.
      </p>
      <a href={url} target="_blank" rel="noreferrer"
        style={{ backgroundColor: '#7C1805', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>
        ↗ Abrir PDF em nova aba
      </a>
    </div>
  );
  return (
    <div>
      {pages.map((src, i) => (
        <div key={i}>
          {pages.length > 1 && (
            <div style={{ padding: '6px 12px', backgroundColor: '#F0EBE3', fontSize: '12px', color: '#6B5B4E' }}>
              Página {i + 1} de {pages.length}
            </div>
          )}
          <img src={src} alt={`Página ${i + 1}`} style={{ width: '100%', display: 'block' }} />
        </div>
      ))}
    </div>
  );
};
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import { Upload, FileText, Edit3 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const SubmitEssay = () => {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [studentNote, setStudentNote] = useState('');
  const [isRewrite, setIsRewrite] = useState(false);
  const [parentEssayId, setParentEssayId] = useState(null);
  const [credits, setCredits] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(''); // mensagem de progresso
  const location = useLocation();

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Comece a escrever sua redação aqui...</p>',
    editorProps: {
      attributes: {
        class: 'tiptap-editor min-h-[400px] p-8 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    fetchPrompt();
    fetchCredits();
    // Detectar se é reescrita via query param ?rewrite=essayId
    const params = new URLSearchParams(location.search);
    const rewriteId = params.get('rewrite');
    if (rewriteId) {
      setIsRewrite(true);
      setParentEssayId(rewriteId);
    }
  }, [promptId]);

  const fetchCredits = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/credits/me`, { withCredentials: true });
      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchPrompt = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/prompts`, { withCredentials: true });
      const selectedPrompt = data.find((p) => p.id === promptId);
      setPrompt(selectedPrompt);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      toast.error('Erro ao carregar tema');
    } finally {
      setLoading(false);
    }
  };

  // Converte PDF para PNG usando PDF.js — retorna array de dataUrls (uma por página)
  const pdfToImages = (file) => new Promise((resolve, reject) => {
    const loadAndConvert = async () => {
      try {
        const pdfjs = window.pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const images = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // alta resolução
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          images.push(canvas.toDataURL('image/jpeg', 0.92));
        }
        resolve(images);
      } catch (err) { reject(err); }
    };
    if (window.pdfjsLib) {
      loadAndConvert();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = loadAndConvert;
      s.onerror = () => reject(new Error('Falha ao carregar PDF.js'));
      document.head.appendChild(s);
    }
  });

  // Converte dataUrl base64 para File
  const dataUrlToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleFileUpload = async (file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST', body: fd, credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erro ${res.status}`);
      }
      const data = await res.json();
      setUploadUrl(data.url);
      toast.success('Arquivo enviado com sucesso!');
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro no upload: ' + error.message);
      return null;
    }
  };



  const handleSubmit = async (method) => {
    setSubmitting(true);
    try {
      let content = '';
      let fileUrl = null;

      if (method === 'editor') {
        content = editor.getText();
      } else if (method === 'paste') {
        content = pasteContent;
      } else if (method === 'upload') {
        if (!uploadFile && !uploadUrl) {
          toast.error('Selecione um arquivo para enviar');
          setSubmitting(false);
          return;
        }

        if (uploadFile && !uploadUrl) {
          // PDF: converter para imagem(ns) antes de enviar
          if (uploadFile.type === 'application/pdf' || uploadFile.name.toLowerCase().endsWith('.pdf')) {
            setUploadProgress('Convertendo PDF para imagem...');
            try {
              const images = await pdfToImages(uploadFile);
              // Enviar cada página como imagem separada e guardar a primeira como file_url
              const uploadedUrls = [];
              for (let i = 0; i < images.length; i++) {
                setUploadProgress(`Enviando página ${i + 1} de ${images.length}...`);
                const imgFile = dataUrlToFile(images[i], `pagina-${i + 1}.jpg`);
                const fd = new FormData();
                fd.append('file', imgFile);
                const res = await fetch(`${API_URL}/api/upload`, {
                  method: 'POST', body: fd, credentials: 'include',
                });
                if (!res.ok) throw new Error('Falha ao enviar página ' + (i + 1));
                const data = await res.json();
                uploadedUrls.push(data.url);
              }
              fileUrl = uploadedUrls[0]; // primeira página como URL principal
              // Páginas extras salvas no content como JSON para o professor ver
              if (uploadedUrls.length > 1) {
                content = JSON.stringify({ type: 'pdf_pages', urls: uploadedUrls });
              }
              setUploadProgress('');
            } catch (err) {
              setUploadProgress('');
              toast.error('Erro ao converter PDF: ' + err.message);
              setSubmitting(false);
              return;
            }
          } else {
            // Imagem normal: upload direto
            fileUrl = await handleFileUpload(uploadFile);
            if (!fileUrl) {
              setSubmitting(false);
              return;
            }
          }
        } else {
          fileUrl = uploadUrl;
        }
      }

      await axios.post(
        `${API_URL}/api/essays`,
        {
          prompt_id: promptId,
          content,
          submission_method: method,
          file_url: fileUrl,
          student_note: studentNote.trim() || null,
          parent_essay_id: parentEssayId,
          is_rewrite: isRewrite,
        },
        { withCredentials: true }
      );

      toast.success('Redação enviada com sucesso!');
      navigate('/my-essays');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erro ao enviar redação');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-1/2"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </Layout>
    );
  }

  if (!prompt) {
    return (
      <Layout>
        <Card className="p-12 text-center bg-white">
          <p className="text-lg text-slate-600">Tema não encontrado</p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-black text-3xl md:text-4xl" style={{ color: '#7C1805' }} data-testid="submit-essay-title">
            {prompt.title}
          </h1>
          <p className="text-lg mt-2 text-slate-600">{prompt.theme}</p>
        </div>

        <Card className="p-6 bg-white border" style={{ backgroundColor: '#FDF3E8' }}>
          <h3 className="font-semibold mb-2" style={{ color: '#7C1805' }}>
            Textos de Apoio
          </h3>
          {/* Textos de apoio */}
          {prompt.supporting_texts && (
            <p className="text-slate-700 whitespace-pre-line leading-relaxed mb-4">{prompt.supporting_texts}</p>
          )}

          {/* Arquivos de apoio (PDF/imagens) */}
          {(prompt.supporting_files || []).length > 0 && (
            <div className="space-y-4 mt-2">
              {prompt.supporting_files.map((file, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8DDD0' }}>
                  {/* Header com nome e botões */}
                  <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#FDF3E8' }}>
                    <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#7C1805' }}>
                      {file.type === 'pdf' ? '📄' : '🖼️'} {file.name}
                    </span>
                    <div className="flex gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1 rounded font-semibold"
                        style={{ backgroundColor: '#7C1805', color: 'white' }}
                      >
                        ↗ Abrir
                      </a>
                      <a
                        href={file.url}
                        download={file.name}
                        className="text-xs px-3 py-1 rounded font-semibold border"
                        style={{ borderColor: '#7C1805', color: '#7C1805', backgroundColor: 'white' }}
                      >
                        ⬇ Baixar
                      </a>
                    </div>
                  </div>
                  {/* Visualizador */}
                  {file.type === 'pdf' ? (
                    <PdfViewer url={file.url} />
                  ) : (
                    <img
                      src={file.url}
                      alt={file.name}
                      style={{ maxWidth: '100%', display: 'block' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-white border">
          <h3 className="font-semibold mb-2" style={{ color: '#7C1805' }}>
            Instruções
          </h3>
          <p className="text-slate-700 leading-relaxed">{prompt.instructions}</p>
        </Card>

        {/* Banner de créditos */}
        {credits && credits.mode !== 'unlimited' && (
          <Card className="p-4 border" style={{
            borderColor: credits.remaining === 0 ? '#7C1805' : '#E8DDD0',
            backgroundColor: credits.remaining === 0 ? '#FEF2F2' : '#FDF3E8'
          }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: credits.remaining === 0 ? '#7C1805' : '#2C1A0E' }}>
                  {credits.remaining === 0
                    ? '⚠️ Você atingiu seu limite de envios'
                    : `⚡ ${credits.remaining} crédito${credits.remaining !== 1 ? 's' : ''} restante${credits.remaining !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>
                  {credits.used} de {credits.limit} usados {credits.mode === 'monthly' ? 'este mês' : 'esta semana'}
                  {credits.renews_at ? ` · renova em ${credits.renews_at}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: credits.limit }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: i < credits.used ? '#7C1805' : '#E8DDD0' }}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Banner de reescrita */}
        {isRewrite && (
          <Card className="p-4 border-l-4" style={{ borderLeftColor: '#D66B27', backgroundColor: '#FFF8F0' }}>
            <div className="flex items-start gap-3">
              <span style={{ fontSize: '20px' }}>✏️</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#D66B27' }}>Você está enviando uma reescrita</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B5B4E' }}>
                  Esta redação ficará vinculada à versão anterior. A professora poderá comparar as duas versões.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Recado para a professora */}
        <Card className="p-5 bg-white border">
          <Label htmlFor="student-note" className="font-semibold" style={{ color: '#7C1805' }}>
            Recado para a professora <span className="text-sm font-normal" style={{ color: '#6B5B4E' }}>(opcional)</span>
          </Label>
          <Textarea
            id="student-note"
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            maxLength={300}
            rows={3}
            className="mt-2"
            placeholder="Deixe um recado, dúvida ou contexto para a sua professora..."
            data-testid="student-note-textarea"
          />
          <p className="text-xs mt-1 text-right" style={{ color: '#6B5B4E' }}>{studentNote.length}/300</p>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3" data-testid="submission-tabs">
            <TabsTrigger value="editor" data-testid="tab-editor">
              <Edit3 size={16} className="mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="paste" data-testid="tab-paste">
              <FileText size={16} className="mr-2" />
              Colar Texto
            </TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload size={16} className="mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-6">
            <Card className="border bg-white shadow-sm" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <EditorContent editor={editor} data-testid="tiptap-editor" />
            </Card>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => handleSubmit('editor')}
                disabled={submitting || (credits && credits.mode !== 'unlimited' && credits.remaining === 0)}
                size="lg"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="submit-editor-button"
              >
                {submitting ? 'Enviando...' : credits?.remaining === 0 ? 'Sem créditos' : 'Enviar Redação'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-6">
            <Card className="p-6 border bg-white" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <Label htmlFor="paste-content">Cole o texto da sua redação</Label>
              <Textarea
                id="paste-content"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={15}
                className="mt-2 font-essay text-lg"
                placeholder="Cole o texto da sua redação aqui..."
                data-testid="paste-textarea"
              />
            </Card>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => handleSubmit('paste')}
                disabled={submitting || !pasteContent.trim() || (credits && credits.mode !== 'unlimited' && credits.remaining === 0)}
                size="lg"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="submit-paste-button"
              >
                {submitting ? 'Enviando...' : credits?.remaining === 0 ? 'Sem créditos' : 'Enviar Redação'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <Card className="p-8 border bg-white text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <Upload size={48} className="mx-auto mb-4" style={{ color: '#525252' }} />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-md p-8 hover:bg-slate-50 transition-colors">
                  <p className="text-slate-700 mb-2">Clique para fazer upload ou arraste o arquivo</p>
                  <p className="text-sm text-slate-500">PDF, DOCX ou imagem</p>
                </div>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="hidden"
                data-testid="file-upload-input"
              />
              {uploadFile && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">
                    ✅ Arquivo selecionado: <strong>{uploadFile.name}</strong>
                  </p>
                  {uploadFile.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid #E8DDD0', objectFit: 'contain' }}
                    />
                  )}
                  {uploadFile.type === 'application/pdf' && (
                    <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FDF3E8', color: '#7C1805' }}>
                      📄 PDF selecionado — será convertido automaticamente para imagem ao enviar, permitindo que o professor corrija diretamente.
                    </p>
                  )}
                  {uploadProgress && (
                    <p className="text-xs px-3 py-2 rounded mt-2" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
                      ⏳ {uploadProgress}
                    </p>
                  )}
                </div>
              )}
              {uploadUrl && (
                <p className="mt-2 text-xs font-semibold" style={{ color: '#36555A' }}>
                  ✓ Arquivo enviado com sucesso! Clique em "Enviar Redação" para concluir.
                </p>
              )}
            </Card>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => handleSubmit('upload')}
                disabled={submitting || !uploadFile || (credits && credits.mode !== 'unlimited' && credits.remaining === 0)}
                size="lg"
                style={{ backgroundColor: '#7C1805' }}
                data-testid="submit-upload-button"
              >
                {submitting ? 'Enviando...' : credits?.remaining === 0 ? 'Sem créditos' : 'Enviar Redação'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
