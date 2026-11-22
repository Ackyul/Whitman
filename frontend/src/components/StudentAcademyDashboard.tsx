'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { User, GradeRecord, AttendanceRecord, Course } from '../types';
import { fetchCoursesApi } from '../lib/api';
import {
  BookOpen,
  GraduationCap,
  Award,
  FileText,
  CheckCircle2,
  Clock,
  Trophy,
  ChevronRight,
  X,
  Download,
  ExternalLink,
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  FileCheck,
  Video,
  Info,
  Medal,
} from 'lucide-react';

interface Props {
  currentUser: User;
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  today: string;
}

interface CourseSession {
  id: string;
  sessionNumber: number;
  title: string;
  topic: string;
  date: string;
  summary: string;
  materials: Array<{
    title: string;
    type: 'PDF' | 'VIDEO' | 'GUIA';
    url?: string;
    size?: string;
  }>;
  homework?: string;
}

interface SimulacroRecord {
  id: string;
  title: string;
  date: string;
  weekendLabel: string;
  score: number;
  maxScore: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
  totalQuestions: number;
  rankingClassroom: number;
  totalClassroom: number;
  rankingGeneral: number;
  totalGeneral: number;
  breakdown: {
    aptitud: number;
    matematica: number;
    ciencias: number;
    humanidades: number;
  };
  status: 'CALIFICADO' | 'PENDIENTE';
  solucionarioAvailable: boolean;
}

// Cursos de respaldo académico estándar para ciclos de academia
const DEFAULT_ACADEMY_COURSES = [
  { id: 'def-1', code: 'MATE 1', subject: 'Aritmética', teacher: 'Prof. Yoshua Nuñez' },
  { id: 'def-2', code: 'MATE 2', subject: 'Álgebra', teacher: 'Prof. Marco Aurelio' },
  { id: 'def-3', code: 'MATE 4', subject: 'Geometría & Trigonometría', teacher: 'Prof. Daniel Santos' },
  { id: 'def-4', code: '7 CyT', subject: 'Física Elemental', teacher: 'Prof. Roberto Benavides' },
  { id: 'def-5', code: '10 CyT', subject: 'Química & Biología', teacher: 'Prof. Elizabeth Cárdenas' },
  { id: 'def-6', code: 'RM', subject: 'Razonamiento Matemático', teacher: 'Prof. Carlos Mendoza' },
  { id: 'def-7', code: 'RV', subject: 'Razonamiento Verbal & Literatura', teacher: 'Prof. Elena Vargas' },
];

// Simulacros de fin de semana predeterminados de la Academia
const MOCK_SIMULACROS: SimulacroRecord[] = [
  {
    id: 'sim-3',
    title: 'Simulacro Tipo Admisión UNSA - Semana 3',
    weekendLabel: 'Fin de Semana 3',
    date: '2026-11-21',
    score: 742.5,
    maxScore: 1000,
    correctAnswers: 48,
    incorrectAnswers: 8,
    blankAnswers: 4,
    totalQuestions: 60,
    rankingClassroom: 3,
    totalClassroom: 35,
    rankingGeneral: 12,
    totalGeneral: 180,
    breakdown: {
      aptitud: 225,
      matematica: 240,
      ciencias: 185,
      humanidades: 92.5,
    },
    status: 'CALIFICADO',
    solucionarioAvailable: true,
  },
  {
    id: 'sim-2',
    title: 'Simulacro Tipo Admisión UNSA - Semana 2',
    weekendLabel: 'Fin de Semana 2',
    date: '2026-11-14',
    score: 718.0,
    maxScore: 1000,
    correctAnswers: 45,
    incorrectAnswers: 11,
    blankAnswers: 4,
    totalQuestions: 60,
    rankingClassroom: 5,
    totalClassroom: 35,
    rankingGeneral: 19,
    totalGeneral: 180,
    breakdown: {
      aptitud: 210,
      matematica: 235,
      ciencias: 180,
      humanidades: 93.0,
    },
    status: 'CALIFICADO',
    solucionarioAvailable: true,
  },
  {
    id: 'sim-1',
    title: 'Simulacro Tipo Admisión UNSA - Semana 1',
    weekendLabel: 'Fin de Semana 1',
    date: '2026-11-07',
    score: 685.5,
    maxScore: 1000,
    correctAnswers: 42,
    incorrectAnswers: 14,
    blankAnswers: 4,
    totalQuestions: 60,
    rankingClassroom: 8,
    totalClassroom: 35,
    rankingGeneral: 28,
    totalGeneral: 180,
    breakdown: {
      aptitud: 195,
      matematica: 220,
      ciencias: 180,
      humanidades: 90.5,
    },
    status: 'CALIFICADO',
    solucionarioAvailable: true,
  },
];

export const StudentAcademyDashboard: React.FC<Props> = ({
  currentUser,
  attendance,
  grades,
  today,
}) => {
  // Extraer ciclo y aula del alumno
  const gradeOrClassRaw = currentUser.gradeOrClass || 'UNSA - Aula 1';
  const cycleName = gradeOrClassRaw.includes(' - ')
    ? gradeOrClassRaw.split(' - ')[0].trim()
    : gradeOrClassRaw;
  const classroomName = gradeOrClassRaw.includes(' - ')
    ? gradeOrClassRaw.split(' - ')[1].trim()
    : 'Aula General';

  // Asistencia de hoy
  const studentAttendance = attendance.filter(
    (a) => a.userId === currentUser.id || a.userDni === currentUser.dni
  );
  const todayRecord = studentAttendance.find((a) => a.date === today);

  // Estados de cursos
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Modal de Curso Seleccionado (Sesiones y Prácticas)
  const [selectedCourse, setSelectedCourse] = useState<{
    code: string;
    subject: string;
    teacher: string;
  } | null>(null);
  const [courseModalTab, setCourseModalTab] = useState<'sesiones' | 'practicas'>('sesiones');

  // Modal de Detalle de Simulacro
  const [selectedSimulacro, setSelectedSimulacro] = useState<SimulacroRecord | null>(null);

  // Cargar cursos desde Neon DB para el ciclo/grado del alumno
  useEffect(() => {
    let isMounted = true;
    async function loadStudentCourses() {
      setLoadingCourses(true);
      try {
        const dbCourses = await fetchCoursesApi(cycleName);
        if (isMounted) {
          if (dbCourses && dbCourses.length > 0) {
            setCoursesList(dbCourses);
          } else {
            // Si no hay cursos en este ciclo específico, cargar cursos generales o sugeridos
            const allCourses = await fetchCoursesApi();
            const filtered = (allCourses || []).filter(
              (c) => c.gradeName.toLowerCase() === cycleName.toLowerCase()
            );
            setCoursesList(filtered);
          }
        }
      } catch (err) {
        console.warn('Error cargando cursos del alumno:', err);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    }

    loadStudentCourses();
    return () => {
      isMounted = false;
    };
  }, [cycleName]);

  // Lista normalizada de cursos con código y asignatura separados
  const displayCourses = useMemo(() => {
    if (coursesList.length > 0) {
      return coursesList.map((c, idx) => {
        const full = c.courseName || '';
        let code = '';
        let subject = full;

        // Si tiene formato "Mate 1 (Aritmética)"
        const parenMatch = full.match(/^(.*?)\s*\((.*?)\)$/);
        if (parenMatch) {
          code = parenMatch[1].trim();
          subject = parenMatch[2].trim();
        } else if (full.includes(' - ')) {
          const parts = full.split(' - ');
          code = parts[0].trim();
          subject = parts[1].trim();
        } else {
          code = `C-${idx + 1}`;
          subject = full;
        }

        return {
          id: c.id,
          code,
          subject,
          teacher: c.teacherName || 'Profesor(a) Encargado(a)',
        };
      });
    }

    // Fallback con los cursos de academia predeterminados
    return DEFAULT_ACADEMY_COURSES;
  }, [coursesList]);

  // Simulacros combinando mock y notas de evaluación si existen
  const simulacrosList = useMemo(() => {
    const studentSimulacroGrades = grades.filter(
      (g) =>
        (g.userId === currentUser.id || g.userDni === currentUser.dni) &&
        g.evaluationType === 'SIMULACRO'
    );

    if (studentSimulacroGrades.length === 0) {
      return MOCK_SIMULACROS;
    }

    // Mapear los simulacros registrados en base de datos
    const dbMapped: SimulacroRecord[] = studentSimulacroGrades.map((g, idx) => ({
      id: g.id,
      title: g.title || `Simulacro Fin de Semana ${idx + 1}`,
      weekendLabel: `Fin de Semana ${idx + 1}`,
      date: g.date,
      score: g.score,
      maxScore: g.maxScore || 1000,
      correctAnswers: Math.round((g.score / 1000) * 60),
      incorrectAnswers: Math.max(0, 60 - Math.round((g.score / 1000) * 60) - 4),
      blankAnswers: 4,
      totalQuestions: 60,
      rankingClassroom: idx + 1,
      totalClassroom: 35,
      rankingGeneral: idx * 3 + 4,
      totalGeneral: 180,
      breakdown: {
        aptitud: Math.round(g.score * 0.3),
        matematica: Math.round(g.score * 0.35),
        ciencias: Math.round(g.score * 0.23),
        humanidades: Math.round(g.score * 0.12),
      },
      status: 'CALIFICADO',
      solucionarioAvailable: true,
    }));

    return dbMapped;
  }, [grades, currentUser]);

  const latestSimulacro = simulacrosList[0];

  // Helper para generar sesiones de ejemplo para cada curso
  const getSessionsForCourse = (courseSubject: string): CourseSession[] => {
    return [
      {
        id: 's-1',
        sessionNumber: 1,
        title: `Semana 1: Fundamentos y Conceptos Clave de ${courseSubject}`,
        topic: 'Marco teórico inicial, fórmulas fundamentales y problemas modelo.',
        date: '2026-11-04',
        summary: 'En esta primera sesión analizamos los conceptos clave que más se repiten en el examen de admisión.',
        materials: [
          { title: `Guía Teórica Oficial - ${courseSubject} (PDF)`, type: 'PDF', size: '2.4 MB' },
          { title: 'Boletín de Práctica Dirigida con Claves', type: 'GUIA', size: '1.8 MB' },
          { title: 'Grabación de la Pizarra Digital en Vivo', type: 'VIDEO' },
        ],
        homework: 'Resolver los problemas impares del boletín domiciliario (ejercicios del 1 al 15).',
      },
      {
        id: 's-2',
        sessionNumber: 2,
        title: `Semana 2: Técnicas de Resolución y Problemas de Nivel Intermedio`,
        topic: 'Aplicación de propiedades, métodos abreviados y análisis de casos.',
        date: '2026-11-11',
        summary: 'Ejercicios con truco de examen y resolución guiada paso a paso.',
        materials: [
          { title: `Separata de Problemas Propuestos (PDF)`, type: 'PDF', size: '3.1 MB' },
          { title: 'Pizarra de Apuntes y Métodos Rápidos', type: 'GUIA', size: '950 KB' },
        ],
        homework: 'Repasar las propiedades vistas para la práctica calificada de la próxima sesión.',
      },
      {
        id: 's-3',
        sessionNumber: 3,
        title: `Semana 3: Seminario Intensivo Tipo Examen UNSA`,
        topic: 'Simulación de preguntas reales de admisión de los últimos 5 años.',
        date: '2026-11-18',
        summary: 'Resolución cronometrada y tips para optimizar tiempo en el examen.',
        materials: [
          { title: 'Balotario de Preguntas Examen UNSA (PDF)', type: 'PDF', size: '4.0 MB' },
          { title: 'Solucionario Detallado y Justificaciones', type: 'PDF', size: '1.5 MB' },
        ],
      },
    ];
  };

  // Helper para obtener prácticas calificadas de un curso
  const getPracticasForCourse = (courseSubject: string) => {
    return grades.filter(
      (g) =>
        (g.userId === currentUser.id || g.userDni === currentUser.dni) &&
        (g.evaluationType === 'PRACTICA' || g.course.toLowerCase().includes(courseSubject.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER DEL ALUMNO (ACADEMIA WHITMAN)                              */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-lionGold-500/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-lionGold-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-lionGold-500 text-burgundy-950 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Alumno Academia</span>
              </span>
              <span className="bg-white/10 text-slate-200 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                {cycleName}
              </span>
              <span className="bg-white/10 text-lionGold-300 font-mono px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                {classroomName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-serif text-white tracking-wide">
              ¡Hola León, {currentUser.name}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Bienvenido a tu aula virtual. Revisa tus asignaturas oficiales, materiales de clase y los resultados de tus simulacros de fin de semana.
            </p>
          </div>

          {/* Tarjeta rápida de asistencia del día */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shrink-0 flex items-center gap-4 text-xs">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-300 font-bold uppercase tracking-wider block text-[11px]">
                Asistencia de Hoy
              </span>
              <p className="font-black text-sm text-white">
                {todayRecord ? (
                  <span className="text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 inline" /> {todayRecord.status} ({todayRecord.time})
                  </span>
                ) : (
                  <span className="text-amber-300">Aún no registras ingreso</span>
                )}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {todayRecord?.exitTime
                  ? `Salida: ${todayRecord.exitTime}`
                  : 'Salida pendiente de marcar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECCIÓN DESTACADA: EXÁMENES SIMULACRO DE FIN DE SEMANA                  */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-amber-500/10 via-white to-burgundy-900/5 rounded-3xl p-6 sm:p-7 border-2 border-lionGold-400/40 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-lionGold-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-lionGold-500 text-burgundy-950 flex items-center justify-center font-bold shadow-xs">
                <Trophy className="w-5 h-5 text-burgundy-950" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-serif text-burgundy-950">
                Exámenes Simulacro de Fin de Semana
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Resultados oficiales tipo examen de admisión subidos cada fin de semana con puntaje y ranking.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-burgundy-900 text-white text-xs font-black self-start sm:self-auto shadow-xs">
            <Medal className="w-3.5 h-3.5 text-lionGold-400" />
            <span>{simulacrosList.length} Simulacros Realizados</span>
          </span>
        </div>

        {/* Tarjeta de impacto del Último Simulacro */}
        {latestSimulacro && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Puntaje */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
              <span className="text-xs font-black uppercase tracking-wider text-burgundy-900 bg-burgundy-50 px-2.5 py-1 rounded-lg border border-burgundy-200">
                {latestSimulacro.weekendLabel} • Reciente
              </span>
              <h3 className="text-base font-black text-slate-900 mt-2 line-clamp-1">
                {latestSimulacro.title}
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black font-serif text-burgundy-950">
                  {latestSimulacro.score.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400">/ {latestSimulacro.maxScore} pts</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Fecha: {latestSimulacro.date}</span>
              </p>
            </div>

            {/* Puesto en Aula y en Academia */}
            <div className="md:col-span-5 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Puesto en tu Aula
                </span>
                <span className="text-2xl font-black text-burgundy-900 font-serif">
                  #{latestSimulacro.rankingClassroom}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  de {latestSimulacro.totalClassroom} alumnos
                </span>
              </div>

              <div className="bg-lionGold-50 p-3.5 rounded-xl border border-lionGold-200 text-center">
                <span className="text-[11px] font-bold text-lionGold-800 uppercase block mb-1">
                  Puesto General
                </span>
                <span className="text-2xl font-black text-burgundy-950 font-serif">
                  #{latestSimulacro.rankingGeneral}
                </span>
                <span className="text-[11px] text-lionGold-700 block mt-0.5">
                  de {latestSimulacro.totalGeneral} postulantes
                </span>
              </div>
            </div>

            {/* Acción de ver detalle */}
            <div className="md:col-span-3 flex flex-col justify-center items-end">
              <button
                type="button"
                onClick={() => setSelectedSimulacro(latestSimulacro)}
                className="w-full bg-burgundy-900 hover:bg-burgundy-950 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Ver Desglose y Claves</span>
                <ChevronRight className="w-4 h-4 text-lionGold-400" />
              </button>
            </div>
          </div>
        )}

        {/* Historial de Simulacros Anteriores */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
            Historial de Simulacros de Fin de Semana:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {simulacrosList.map((sim) => (
              <div
                key={sim.id}
                onClick={() => setSelectedSimulacro(sim)}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-burgundy-400 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {sim.weekendLabel}
                    </span>
                    <span className="text-xs font-black text-burgundy-900 font-serif">
                      {sim.score.toFixed(1)} pts
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                    {sim.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Puesto Aula: #{sim.rankingClassroom} • {sim.date}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-burgundy-50 text-slate-400 group-hover:text-burgundy-900 flex items-center justify-center transition shrink-0 ml-2">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECCIÓN: MIS CURSOS & ASIGNATURAS CON SU CÓDIGO Y PROFESOR             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-burgundy-100 text-burgundy-900 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5 text-burgundy-900" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900">
                Mis Cursos & Materias ({displayCourses.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Haz clic en cualquier curso para acceder a las sesiones semanales, materiales de clase y notas de práctica.
            </p>
          </div>

          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            {cycleName}
          </span>
        </div>

        {/* Grilla de Cursos */}
        {loadingCourses ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <div className="animate-spin w-7 h-7 border-2 border-burgundy-800 border-t-transparent rounded-full mx-auto" />
            <p>Cargando tus asignaturas oficiales...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCourses.map((c) => {
              const coursePracticas = getPracticasForCourse(c.subject);

              return (
                <div
                  key={c.id || c.code}
                  onClick={() => {
                    setSelectedCourse(c);
                    setCourseModalTab('sesiones');
                  }}
                  className="bg-slate-50/80 hover:bg-white rounded-3xl p-5 border-2 border-slate-200/80 hover:border-burgundy-400 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  {/* Cabecera del Curso: Código y Asignatura */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black bg-burgundy-900 text-white px-2.5 py-1 rounded-xl shadow-2xs">
                        {c.code}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>3 Sesiones</span>
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 group-hover:text-burgundy-950 transition font-serif line-clamp-1">
                      {c.subject}
                    </h3>

                    {/* Docente Encargado */}
                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-lionGold-500 shrink-0" />
                      <span className="truncate">{c.teacher}</span>
                    </p>
                  </div>

                  {/* Estado de Prácticas y Botón de Entrada */}
                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {coursePracticas.length > 0 ? (
                        <span className="text-emerald-700 font-bold">
                          ✓ {coursePracticas.length} práctica(s)
                        </span>
                      ) : (
                        <span className="text-slate-400">Sin prácticas aún</span>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 text-burgundy-900 group-hover:text-burgundy-950 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Entrar</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: DETALLE DEL CURSO (SESIONES Y PRÁCTICAS)                         */}
      {/* ========================================================================= */}
      {selectedCourse && (() => {
        const sessions = getSessionsForCourse(selectedCourse.subject);
        const coursePracticas = getPracticasForCourse(selectedCourse.subject);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              {/* Cabecera del Curso */}
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-burgundy-950 to-burgundy-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lionGold-300 font-mono font-bold border border-white/10 text-xs">
                    {selectedCourse.code}
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-lg text-white">
                      {selectedCourse.subject}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Docente: {selectedCourse.teacher} • {cycleName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pestañas del Curso: Sesiones de Clase vs Prácticas Calificadas */}
              <div className="px-5 pt-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCourseModalTab('sesiones')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    courseModalTab === 'sesiones'
                      ? 'border-burgundy-900 text-burgundy-900 font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sesiones & Materiales ({sessions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCourseModalTab('practicas')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    courseModalTab === 'practicas'
                      ? 'border-burgundy-900 text-burgundy-900 font-black'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Notas de Práctica ({coursePracticas.length})</span>
                </button>
              </div>

              {/* Contenido según pestaña */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {courseModalTab === 'sesiones' ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Los docentes actualizan periódicamente las guías teóricas, boletines de problemas y enlaces de clase para cada sesión.
                      </span>
                    </div>

                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 pb-2">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-burgundy-900 uppercase">
                              Sesión #{sess.sessionNumber} • {sess.date}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                              {sess.title}
                            </h4>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          {sess.topic}
                        </p>

                        {/* Materiales subidos */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">
                            Materiales subidos por el profesor:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sess.materials.map((mat, i) => (
                              <div
                                key={i}
                                className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:border-burgundy-300 transition"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  {mat.type === 'VIDEO' ? (
                                    <Video className="w-4 h-4 text-rose-600 shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-burgundy-900 shrink-0" />
                                  )}
                                  <span className="font-medium text-slate-800 truncate">
                                    {mat.title}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => alert(`Descargando material: ${mat.title}`)}
                                  className="text-xs font-bold text-burgundy-900 hover:text-burgundy-950 flex items-center gap-1 shrink-0 cursor-pointer"
                                  title="Descargar material"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Bajar</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {sess.homework && (
                          <div className="bg-white p-2.5 rounded-xl border border-dashed border-amber-300 text-xs text-slate-700">
                            <span className="font-bold text-amber-800">Tarea propuesta: </span>
                            <span>{sess.homework}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Pestaña de Prácticas Calificadas */
                  <div className="space-y-4">
                    {coursePracticas.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <Award className="w-10 h-10 text-slate-300 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-800">
                          Sin notas de práctica en este curso
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          En la modalidad de academia, las notas de práctica se aplican periódicamente según el plan de cada docente. Los exámenes simulacro se registran cada fin de semana.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {coursePracticas.map((pr) => (
                          <div
                            key={pr.id}
                            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                                  {pr.evaluationType}
                                </span>
                                <span className="text-xs text-slate-400">{pr.date}</span>
                              </div>
                              <h5 className="font-bold text-sm text-slate-900 mt-1">{pr.title}</h5>
                              {pr.feedback && (
                                <p className="text-xs text-slate-500 italic mt-0.5">
                                  "{pr.feedback}"
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-base font-black px-3 py-1 rounded-xl border ${
                                  pr.score >= 14
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : pr.score >= 11
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {pr.score.toFixed(1)} / {pr.maxScore || 20}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 bg-burgundy-900 text-white rounded-xl text-xs font-bold hover:bg-burgundy-950 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 5. MODAL: DETALLE DEL SIMULACRO DE FIN DE SEMANA                           */}
      {/* ========================================================================= */}
      {selectedSimulacro && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Cabecera del Simulacro */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-burgundy-950 to-burgundy-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-lionGold-500 text-burgundy-950 flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5 text-burgundy-950" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-white">
                    {selectedSimulacro.title}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Fecha: {selectedSimulacro.date} • Tipo Examen Admisión UNSA
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSimulacro(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Simulacro */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Puntaje Principal y Rankings */}
              <div className="bg-gradient-to-br from-lionGold-50 to-amber-100/60 p-5 rounded-2xl border border-lionGold-300 text-center space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-lionGold-900">
                  Puntaje Total Obtenido
                </span>
                <div className="text-4xl font-black font-serif text-burgundy-950">
                  {selectedSimulacro.score.toFixed(2)}
                  <span className="text-xs font-bold text-slate-500 font-sans ml-1">
                    / {selectedSimulacro.maxScore} pts
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2 text-xs">
                  <span className="bg-white px-3 py-1 rounded-full font-bold text-burgundy-900 border border-lionGold-200">
                    Puesto Aula: #{selectedSimulacro.rankingClassroom} de {selectedSimulacro.totalClassroom}
                  </span>
                  <span className="bg-burgundy-900 px-3 py-1 rounded-full font-bold text-white shadow-xs">
                    Puesto General: #{selectedSimulacro.rankingGeneral} de {selectedSimulacro.totalGeneral}
                  </span>
                </div>
              </div>

              {/* Resumen de Preguntas */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block text-[11px] uppercase">Correctas</span>
                  <span className="text-xl font-black text-emerald-900 font-serif">
                    {selectedSimulacro.correctAnswers}
                  </span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-rose-800 font-bold block text-[11px] uppercase">Incorrectas</span>
                  <span className="text-xl font-black text-rose-900 font-serif">
                    {selectedSimulacro.incorrectAnswers}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold block text-[11px] uppercase">En Blanco</span>
                  <span className="text-xl font-black text-slate-800 font-serif">
                    {selectedSimulacro.blankAnswers}
                  </span>
                </div>
              </div>

              {/* Desglose por Áreas del Examen */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase block">
                  Desglose por Áreas Académicas:
                </span>
                <div className="space-y-2">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Aptitud Académica (RM & RV)</span>
                    <span className="font-mono font-bold text-burgundy-900">
                      {selectedSimulacro.breakdown.aptitud} pts
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Matemáticas (Aritmética, Álgebra, Geometría)</span>
                    <span className="font-mono font-bold text-burgundy-900">
                      {selectedSimulacro.breakdown.matematica} pts
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Ciencias Naturales (Física, Química, Biología)</span>
                    <span className="font-mono font-bold text-burgundy-900">
                      {selectedSimulacro.breakdown.ciencias} pts
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Humanidades & Ciencias Sociales</span>
                    <span className="font-mono font-bold text-burgundy-900">
                      {selectedSimulacro.breakdown.humanidades} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Solucionario descargable */}
              {selectedSimulacro.solucionarioAvailable && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">Solucionario Oficial del Simulacro</span>
                    <span className="text-slate-400 text-[11px]">PDF completo con preguntas y resolución explicada</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Descargando solucionario de ${selectedSimulacro.title}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-burgundy-900 hover:bg-burgundy-950 text-white rounded-xl font-bold shadow-xs transition shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSimulacro(null)}
                className="px-4 py-2 bg-burgundy-900 text-white rounded-xl text-xs font-bold hover:bg-burgundy-950 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
