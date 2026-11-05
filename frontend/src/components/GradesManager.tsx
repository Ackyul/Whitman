'use client';

import React, { useState } from 'react';
import { GradeRecord, User, UserRole, EvaluationType } from '../types';
import {
  GraduationCap,
  PlusCircle,
  Trophy,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  Trash2,
} from 'lucide-react';
import { createGrade, deleteGradeApi } from '../lib/api';

interface GradesManagerProps {
  grades: GradeRecord[];
  students: User[];
  currentRole: UserRole;
  onRefresh: () => void;
}

export const GradesManager: React.FC<GradesManagerProps> = ({
  grades,
  students,
  currentRole,
  onRefresh,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [course, setCourse] = useState('Matemática');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('SIMULACRO');
  const [feedback, setFeedback] = useState('');
  const [teacherName, setTeacherName] = useState('Lic. Ricardo Mendoza');
  const [filterLevel, setFilterLevel] = useState<'TODOS' | 'PRIMARIA' | 'SECUNDARIA' | 'ACADEMIA' | 'COLEGIO'>('TODOS');
  const [filterType, setFilterType] = useState<'TODOS' | EvaluationType>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Cursos típicos Whitman
  const coursesList = [
    'Matemática',
    'Comunicación',
    'Ciencia y Tecnología',
    'Personal Social',
    'Física Preuniversitaria',
    'Álgebra y Aritmética',
    'Geometría y Trigonometría',
    'Razonamiento Matemático (RM)',
    'Razonamiento Verbal (RV)',
    'Química y Biología',
    'Lenguaje y Literatura',
    'Historia del Perú y Universal',
    'Inglés',
  ];

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !course || !title || !score) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 20) {
      alert('La nota debe ser un número entre 0 y 20.');
      return;
    }

    const selectedStudent = students.find((s) => s.id === selectedStudentId);

    setSaving(true);
    try {
      await createGrade({
        userId: selectedStudentId,
        userName: selectedStudent?.name,
        userDni: selectedStudent?.dni,
        userLevel: selectedStudent?.level,
        userGrade: selectedStudent?.gradeOrClass,
        course,
        title,
        score: numScore,
        maxScore: 20,
        evaluationType,
        period: 'I Bimestre / Ciclo 2026',
        teacherName,
        feedback,
      });

      setShowModal(false);
      setTitle('');
      setScore('');
      setFeedback('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar calificación en la base de datos');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrade = async (gradeId: string, title: string) => {
    if (!confirm(`¿Eliminar la calificación "${title}" de la base de datos?`)) return;
    try {
      await deleteGradeApi(gradeId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar calificación');
    }
  };

  const getScoreBadge = (val: number) => {
    if (val >= 17) {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2.5 py-1 rounded-lg text-sm flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          {val.toFixed(1)} / 20
        </span>
      );
    }
    if (val >= 14) {
      return (
        <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-2.5 py-1 rounded-lg text-sm">
          {val.toFixed(1)} / 20
        </span>
      );
    }
    if (val >= 11) {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-1 rounded-lg text-sm">
          {val.toFixed(1)} / 20
        </span>
      );
    }
    return (
      <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2.5 py-1 rounded-lg text-sm">
        {val.toFixed(1)} / 20
      </span>
    );
  };

  const filteredGrades = grades.filter((g) => {
    if (filterLevel !== 'TODOS' && g.level !== filterLevel) return false;
    if (filterType !== 'TODOS' && g.evaluationType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = g.userName.toLowerCase().includes(q);
      const matchCourse = g.course.toLowerCase().includes(q);
      const matchTitle = g.title.toLowerCase().includes(q);
      if (!matchName && !matchCourse && !matchTitle) return false;
    }
    return true;
  });

  // Top estudiantes (Cuadro de honor de los Leones de Whitman)
  const topRecords = [...grades]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      
      {/* Banner de Cuadro de Honor Whitman */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 rounded-2xl p-6 text-white shadow-lg border border-lionGold-500/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lionGold-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lionGold-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4 text-lionGold-400" />
              <span>Cuadro de Honor • Rugido de los Leones Whitman</span>
            </div>
            <h2 className="text-2xl font-black font-serif tracking-wide">
              Calificaciones & Simulacros Tipo Admisión
            </h2>
            <p className="text-burgundy-200 text-xs max-w-xl mt-1">
              Monitoreo continuo del rendimiento académico en el Colegio y preparación intensiva para la Universidad (UNI, San Marcos, Villarreal, PUCP).
            </p>
          </div>

          {(currentRole === 'ADMIN' || currentRole === 'DOCENTE') && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-5 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
            >
              <PlusCircle className="w-5 h-5 text-burgundy-950" />
              <span>Registrar Calificación</span>
            </button>
          )}
        </div>

        {/* Top 3 Destacados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-burgundy-800">
          {topRecords.map((top, idx) => (
            <div
              key={top.id}
              className="bg-burgundy-900/60 border border-lionGold-400/30 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm"
            >
              <div className="w-9 h-9 rounded-full bg-lionGold-500/20 text-lionGold-300 font-black flex items-center justify-center border border-lionGold-400/40 shrink-0 text-sm">
                #{idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{top.userName}</p>
                <p className="text-[11px] text-burgundy-200 truncate">{top.course}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-lionGold-300">
                  {top.score.toFixed(1)}
                </span>
                <span className="text-[10px] text-burgundy-300 block">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controles de filtro y búsqueda */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-burgundy-800" />
          <h3 className="font-bold text-slate-800">
            Registro de Notas ({filteredGrades.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar curso o alumno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-burgundy-600 w-44"
            />
          </div>

          {/* Filtro Nivel */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="PRIMARIA">🎒 Primaria</option>
            <option value="SECUNDARIA">🎓 Secundaria</option>
          </select>

          {/* Filtro Tipo Evaluación */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
          >
            <option value="TODOS">Todas las evaluaciones</option>
            <option value="SIMULACRO">Simulacro Tipo Admisión</option>
            <option value="PRACTICA">Práctica Calificada</option>
            <option value="EXAMEN_PARCIAL">Examen Parcial</option>
            <option value="TAREA">Tarea / Trabajo</option>
          </select>
        </div>
      </div>

      {/* Grid de Tarjetas de Notas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGrades.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold">No se encontraron notas registradas con esos filtros.</p>
          </div>
        ) : (
          filteredGrades.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-burgundy-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {g.evaluationType}
                  </span>
                  {getScoreBadge(g.score)}
                </div>

                <h4 className="font-bold text-slate-900 group-hover:text-burgundy-800 transition-colors text-base line-clamp-1">
                  {g.title}
                </h4>

                <p className="text-xs font-semibold text-burgundy-700 mt-0.5">
                  {g.course}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-burgundy-100 text-burgundy-900 font-bold flex items-center justify-center text-xs">
                      {g.userName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{g.userName}</p>
                      <p className="text-[11px] text-slate-400">{g.gradeOrClass}</p>
                    </div>
                  </div>
                </div>

                {g.feedback && (
                  <p className="mt-3 text-xs bg-slate-50 p-2.5 rounded-xl text-slate-600 italic border border-slate-100">
                    "{g.feedback}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {g.date}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-600 truncate max-w-[120px]">
                    {g.teacherName}
                  </span>
                  {(currentRole === 'ADMIN' || currentRole === 'DOCENTE') && (
                    <button
                      onClick={() => handleDeleteGrade(g.id, g.title)}
                      title="Eliminar calificación"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para registrar calificación */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-lionGold-400" />
                <h3 className="font-bold text-base">Registrar Calificación Whitman</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-burgundy-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGrade} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Seleccionar Estudiante *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-600"
                >
                  <option value="">-- Elige un estudiante --</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.name} - {stu.level} ({stu.gradeOrClass || 'Sin aula'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Curso *
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-600"
                  >
                    {coursesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Evaluación
                  </label>
                  <select
                    value={evaluationType}
                    onChange={(e) => setEvaluationType(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-600"
                  >
                    <option value="SIMULACRO">Simulacro Tipo Admisión</option>
                    <option value="PRACTICA">Práctica Calificada</option>
                    <option value="EXAMEN_PARCIAL">Examen Parcial</option>
                    <option value="EXAMEN_FINAL">Examen Final</option>
                    <option value="TAREA">Tarea o Ensayo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Título / Tema Evaluado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Simulacro Admisión 02 o Vectores"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-burgundy-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nota (0 a 20) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    required
                    placeholder="18.5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full text-sm font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-burgundy-600 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Profesor Evaluador
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-burgundy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Comentario / Feedback Pedagógico
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Muy buen razonamiento en cinemática..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-burgundy-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-burgundy-800 hover:bg-burgundy-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Publicando...' : 'Publicar Nota en Vivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

