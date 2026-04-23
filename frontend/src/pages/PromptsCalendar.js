import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export const PromptsCalendar = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState([]);
  const [myEssays, setMyEssays] = useState([]);
  const [today] = useState(new Date());
  const [current, setCurrent] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [loading, setLoading] = useState(true); // U-02
  const [error, setError] = useState(false);    // U-02

  useEffect(() => {
    const load = async () => {
      try {
        const [promptsRes, essaysRes] = await Promise.all([
          axios.get(`${API_URL}/api/prompts`, { withCredentials: true }),
          axios.get(`${API_URL}/api/essays/my`, { withCredentials: true }),
        ]);
        setPrompts(promptsRes.data || []);
        setMyEssays(essaysRes.data || []);
      } catch {
        setError(true);
        toast.error('Erro ao carregar o calendário. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const submittedPromptIds = new Set(myEssays.map(e => e.prompt_id));

  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const firstDay = new Date(current.year, current.month, 1).getDay();
  const prevMonth = () => setCurrent(p => p.month === 0 ? { year: p.year-1, month: 11 } : { ...p, month: p.month-1 });
  const nextMonth = () => setCurrent(p => p.month === 11 ? { year: p.year+1, month: 0 } : { ...p, month: p.month+1 });
  const isToday = (d) => d === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();

  // Map prompts to days using start_date / end_date or created_at
  const getPromptsForDay = (day) => {
    const date = new Date(current.year, current.month, day);
    return prompts.filter(p => {
      if (!p.is_active) return false;
      if (p.start_date && p.end_date) {
        const start = new Date(p.start_date);
        const end = new Date(p.end_date);
        end.setHours(23,59,59);
        return date >= start && date <= end;
      }
      if (p.start_date) {
        const start = new Date(p.start_date);
        return date >= start;
      }
      // Sem datas: mostrar na data de criação
      if (p.created_at) {
        const created = new Date(p.created_at);
        return created.getFullYear() === current.year &&
               created.getMonth() === current.month &&
               created.getDate() === day;
      }
      return false;
    });
  };

  // U-02: loading e erro
  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-96 bg-muted rounded" />
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold mb-2" style={{ color: '#7C1805' }}>Erro ao carregar o calendário</p>
        <p className="text-sm mb-4" style={{ color: '#6B5B4E' }}>Verifique sua conexão e tente novamente.</p>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#7C1805' }}>
          Tentar novamente
        </button>
      </div>
    </Layout>
  );

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const activePrompts = prompts.filter(p => p.is_active);
  const noDatePrompts = activePrompts.filter(p => !p.start_date && !p.end_date);

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
            Calendário de Propostas
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            {activePrompts.length} proposta{activePrompts.length !== 1 ? 's' : ''} disponíve{activePrompts.length !== 1 ? 'is' : 'l'}
          </p>
        </div>

        <Card className="p-5 bg-white border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
              <ChevronLeft size={18} style={{ color: '#6B5B4E' }} />
            </button>
            <h2 className="font-semibold" style={{ color: '#2C1A0E' }}>
              {MONTHS[current.month]} {current.year}
            </h2>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
              <ChevronRight size={18} style={{ color: '#6B5B4E' }} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#6B5B4E' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const dayPrompts = day ? getPromptsForDay(day) : [];
              return (
                <div key={i} className="min-h-[72px] p-1 rounded-lg"
                  style={{
                    backgroundColor: day && isToday(day) ? '#FDF3E8' : 'transparent',
                    border: day && isToday(day) ? '2px solid #D66B27' : '1px solid transparent',
                  }}>
                  {day && (
                    <>
                      <p className="text-xs font-semibold mb-1" style={{ color: isToday(day) ? '#7C1805' : '#6B5B4E' }}>
                        {day}
                      </p>
                      {dayPrompts.map(p => {
                        const done = submittedPromptIds.has(p.id);
                        return (
                          <div key={p.id}
                            onClick={() => navigate(`/submit/${p.id}`)}
                            className="cursor-pointer mb-0.5 truncate rounded px-1 py-0.5"
                            title={p.title}
                            style={{
                              backgroundColor: done ? '#EAF3DE' : '#FFF0E0',
                              color: done ? '#27500A' : '#7C1805',
                              border: `1px solid ${done ? '#C0DD97' : '#D66B27'}`,
                              fontSize: '10px',
                            }}>
                            {done ? '✓ ' : ''}{p.title.length > 10 ? p.title.substring(0,10)+'…' : p.title}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex gap-4 text-xs" style={{ color: '#6B5B4E' }}>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#FFF0E0', border: '1px solid #D66B27' }} /> Disponível
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#EAF3DE', border: '1px solid #C0DD97' }} /> Já enviou
          </span>
        </div>

        {/* Propostas sem data definida */}
        {noDatePrompts.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-sm" style={{ color: '#6B5B4E' }}>
              Propostas sem período definido (sempre disponíveis)
            </h2>
            <div className="space-y-2">
              {noDatePrompts.map(p => {
                const done = submittedPromptIds.has(p.id);
                return (
                  <Card key={p.id} className="p-4 bg-white border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/submit/${p.id}`)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} style={{ color: '#D66B27' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>{p.title}</p>
                          <p className="text-xs" style={{ color: '#6B5B4E' }}>
                            {p.theme?.substring(0,60)}{p.theme?.length > 60 ? '…' : ''}
                          </p>
                        </div>
                      </div>
                      {done
                        ? <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#EAF3DE', color: '#27500A' }}>✓ Enviada</span>
                        : <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#FFF0E0', color: '#7C1805' }}>Escrever</span>
                      }
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
