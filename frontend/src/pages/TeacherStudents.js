import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Users, Search, TrendingUp, FileText, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getScoreColor = (score) => {
  if (!score) return '#6B5B4E';
  if (score >= 800) return '#36555A';
  if (score >= 600) return '#D66B27';
  if (score >= 400) return '#DAB257';
  return '#7C1805';
};

export const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/teacher/students`, { withCredentials: true });
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  ), [students, search]);

  if (loading) return (
    <Layout>
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-muted rounded w-1/3" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading font-bold text-3xl" style={{ color: '#7C1805' }}>
            Acompanhamento de Alunos
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B5B4E' }}>
            {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Busca */}
        <Card className="p-3 bg-white border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B5B4E' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar aluno por nome ou email..."
              style={{
                width: '100%', padding: '7px 10px 7px 30px',
                borderRadius: '6px', border: '1px solid #E8DDD0',
                fontSize: '13px', color: '#2C1A0E', outline: 'none',
              }}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <Users size={40} className="mx-auto mb-3" style={{ color: '#D66B27' }} />
            <p style={{ color: '#6B5B4E' }}>Nenhum aluno encontrado</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(student => (
              <Card
                key={student.id}
                className="p-4 bg-white border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/teacher/student/${student.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: '#2C1A0E' }}>{student.name}</p>
                    <p className="text-xs" style={{ color: '#6B5B4E' }}>{student.email}</p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>REDAÇÕES</p>
                      <p className="text-lg font-bold" style={{ color: '#7C1805' }}>{student.total_essays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>PENDENTES</p>
                      <p className="text-lg font-bold" style={{ color: student.pending_count > 0 ? '#D97706' : '#6B5B4E' }}>
                        {student.pending_count}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>MÉDIA</p>
                      <p className="text-lg font-bold" style={{ color: getScoreColor(student.average_score) }}>
                        {student.average_score ? Math.round(student.average_score) : '—'}
                      </p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="text-xs font-semibold" style={{ color: '#6B5B4E' }}>MELHOR</p>
                      <p className="text-lg font-bold" style={{ color: getScoreColor(student.best_score) }}>
                        {student.best_score || '—'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#FDF3E8', color: '#D66B27' }}>
                      Ver detalhes →
                    </span>
                  </div>
                </div>

                {/* Mini gráfico de notas */}
                {student.scores_history?.length > 1 && (
                  <div className="mt-2 pt-2 flex items-center gap-1" style={{ borderTop: '1px solid #F0EBE3' }}>
                    <p className="text-xs mr-1" style={{ color: '#6B5B4E' }}>Evolução:</p>
                    {student.scores_history.map((s, i) => (
                      <span key={i} className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#FDF3E8', color: getScoreColor(s.score) }}>
                        {s.score}
                      </span>
                    ))}
                    {student.scores_history.length >= 2 && (() => {
                      const first = student.scores_history[0].score;
                      const last = student.scores_history[student.scores_history.length - 1].score;
                      const diff = last - first;
                      return (
                        <span className="text-xs font-bold ml-1" style={{ color: diff >= 0 ? '#36555A' : '#7C1805' }}>
                          {diff >= 0 ? `▲ +${diff}` : `▼ ${diff}`}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
