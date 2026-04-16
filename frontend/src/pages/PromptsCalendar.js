import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export const PromptsCalendar = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState([]);
  const [myEssays, setMyEssays] = useState([]);
  const [today] = useState(new Date());
  const [current, setCurrent] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  useEffect(() => {
    axios.get(`${API_URL}/api/prompts`, { withCredentials: true })
      .then(r => setPrompts(r.data || [])).catch(() => {});
    axios.get(`${API_URL}/api/essays/my`, { withCredentials: true })
      .then(r => setMyEssays(r.data || [])).catch(() => {});
  }, []);

  const submittedPromptIds = new Set(myEssays.map(e => e.prompt_id));
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const firstDay = new Date(current.year, current.month, 1).getDay();
  const prevMonth = () => setCurrent(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setCurrent(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  // Distribute prompts across month days (by creation order)
  const activePrompts = prompts.filter(p => p.is_active);
  const promptsPerDay = {};
  activePrompts.forEach((p, i) => {
    const day = (i % daysInMonth) + 1;
    if (!promptsPerDay[day]) promptsPerDay[day] = [];
    promptsPerDay[day].push(p);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();

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
          {/* Header */}
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

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: '#6B5B4E' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
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
                    {(promptsPerDay[day] || []).map(p => {
                      const done = submittedPromptIds.has(p.id);
                      return (
                        <div key={p.id}
                          onClick={() => navigate(`/submit/${p.id}`)}
                          className="text-xs px-1.5 py-0.5 rounded cursor-pointer mb-0.5 truncate"
                          title={p.title}
                          style={{
                            backgroundColor: done ? '#EAF3DE' : '#FFF0E0',
                            color: done ? '#27500A' : '#7C1805',
                            border: `1px solid ${done ? '#C0DD97' : '#D66B27'}`,
                            fontSize: '10px',
                          }}>
                          {done ? '✓ ' : ''}{p.title.length > 12 ? p.title.substring(0,12)+'…' : p.title}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Legend + list */}
        <div className="flex gap-4 text-xs" style={{ color: '#6B5B4E' }}>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#FFF0E0', border: '1px solid #D66B27', display:'inline-block' }} /> Pendente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#EAF3DE', border: '1px solid #C0DD97', display:'inline-block' }} /> Já enviou
          </span>
        </div>

        {/* All prompts list */}
        <div>
          <h2 className="font-semibold mb-3" style={{ color: '#7C1805' }}>Todas as propostas</h2>
          <div className="space-y-2">
            {activePrompts.map(p => {
              const done = submittedPromptIds.has(p.id);
              return (
                <Card key={p.id} className="p-4 bg-white border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/submit/${p.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} style={{ color: '#D66B27' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#2C1A0E' }}>{p.title}</p>
                        <p className="text-xs" style={{ color: '#6B5B4E' }}>{p.theme?.substring(0, 60)}{p.theme?.length > 60 ? '…' : ''}</p>
                      </div>
                    </div>
                    {done ? (
                      <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#EAF3DE', color: '#27500A' }}>✓ Enviada</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#FFF0E0', color: '#7C1805' }}>Escrever</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};
