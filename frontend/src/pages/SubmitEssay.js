import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
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
  }, [promptId]);

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

  const handleFileUpload = async (file) => {
    try {
      const sigRes = await axios.get(`${API_URL}/api/cloudinary/signature?resource_type=auto`, {
        withCredentials: true,
      });
      const sig = sigRes.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.api_key);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${sig.resource_type}/upload`,
        { method: 'POST', body: formData }
      );

      const result = await uploadRes.json();
      setUploadUrl(result.secure_url);
      toast.success('Arquivo enviado com sucesso!');
      return result.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload do arquivo');
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
        if (uploadFile && !uploadUrl) {
          fileUrl = await handleFileUpload(uploadFile);
          if (!fileUrl) {
            setSubmitting(false);
            return;
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
          <h1 className="font-heading font-black text-3xl md:text-4xl" style={{ color: '#002147' }} data-testid="submit-essay-title">
            {prompt.title}
          </h1>
          <p className="text-lg mt-2 text-slate-600">{prompt.theme}</p>
        </div>

        <Card className="p-6 bg-white border" style={{ backgroundColor: '#F9F8F6' }}>
          <h3 className="font-semibold mb-2" style={{ color: '#002147' }}>
            Textos de Apoio
          </h3>
          <p className="text-slate-700 whitespace-pre-line leading-relaxed">{prompt.supporting_texts}</p>
        </Card>

        <Card className="p-6 bg-white border">
          <h3 className="font-semibold mb-2" style={{ color: '#002147' }}>
            Instruções
          </h3>
          <p className="text-slate-700 leading-relaxed">{prompt.instructions}</p>
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
                disabled={submitting}
                size="lg"
                style={{ backgroundColor: '#002147' }}
                data-testid="submit-editor-button"
              >
                {submitting ? 'Enviando...' : 'Enviar Redação'}
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
                disabled={submitting || !pasteContent.trim()}
                size="lg"
                style={{ backgroundColor: '#002147' }}
                data-testid="submit-paste-button"
              >
                {submitting ? 'Enviando...' : 'Enviar Redação'}
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
                <p className="mt-4 text-sm text-slate-600">Arquivo selecionado: {uploadFile.name}</p>
              )}
            </Card>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => handleSubmit('upload')}
                disabled={submitting || !uploadFile}
                size="lg"
                style={{ backgroundColor: '#002147' }}
                data-testid="submit-upload-button"
              >
                {submitting ? 'Enviando...' : 'Enviar Redação'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};