'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { User, GradeRecord, AttendanceRecord, Course } from '../types';
import { fetchCoursesApi, fetchSessionsApi } from '../lib/api';
import { StudentCardModal } from './StudentCardModal';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  Trophy,
  ChevronRight,
  X,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  AlertCircle,
  CalendarCheck,
  IdCard,
  ExternalLink,
  Download,
  GraduationCap,
} from 'lucide-react';

interface Props {
  currentUser: User;
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  today: string;
}

type TabType = 'cursos' | 'ranking' | 'simulacros' | 'practicas' | 'asistencia';

export const StudentAcademyDashboard: React.FC<Props> = ({
  currentUser,
  attendance,
  grades,
  today,
}) => {
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<TabType>('cursos');

  // Estado del Modal de Carnet Estudiantil
  const [showCardModal, setShowCardModal] = useState(false);

  // Extraer ciclo y aula asignados al alumno desde su perfil
  const gradeOrClassRaw = currentUser.gradeOrClass || 'Academia - Sin Asignar';
  const cycleName = gradeOrClassRaw.includes(' - ')
    ? gradeOrClassRaw.split(' - ')[0].trim()
    : gradeOrClassRaw;
  const classroomName = gradeOrClassRaw.includes(' - ')
    ? gradeOrClassRaw.split(' - ')[1].trim()
    : 'Sin Aula Asignada';

  // Asistencia de hoy
  const studentAttendance = attendance.filter(
    (a) => a.userId === currentUser.id || a.userDni === currentUser.dni
  );
  const todayRecord = studentAttendance.find((a) => a.date === today);

  // Calificaciones reales del alumno desde la base de datos
  const studentGrades = useMemo(() => {
    return grades.filter(
      (g) => g.userId === currentUser.id || g.userDni === currentUser.dni
    );
  }, [grades, currentUser]);

  // Exámenes Ranking (en academia sustituyen a los bimestres escolares)
  const studentRankingGrades = useMemo(() => {
    return studentGrades.filter(
      (g) =>
        (g.period && g.period.toLowerCase().includes('ranking')) ||
        g.title.toLowerCase().includes('ranking') ||
        g.evaluationType === 'EXAMEN_PARCIAL' ||
        g.evaluationType === 'EXAMEN_FINAL'
    );
  }, [studentGrades]);

  // Simulacros reales subidos para este alumno (fines de semana)
  const studentSimulacros = useMemo(() => {
    return studentGrades.filter((g) => g.evaluationType === 'SIMULACRO');
  }, [studentGrades]);

  // Prácticas reales del alumno
  const studentPracticas = useMemo(() => {
    return studentGrades.filter(
      (g) => g.evaluationType === 'PRACTICA' || g.evaluationType === 'TAREA'
    );
  }, [studentGrades]);

  // Cursos reales cargados desde la base de datos para este ciclo/grado
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Modal para ver detalle de un curso específico
  const [selectedCourse, setSelectedCourse] = useState<{
    id: string;
    code: string;
    subject: string;
    teacher: string;
  } | null>(null);

  // Sesiones de clase del curso seleccionado
  const [courseSessions, setCourseSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [courseDetailTab, setCourseDetailTab] = useState<'sesiones' | 'notas'>('sesiones');

  // Cargar cursos desde Neon PostgreSQL para el grado/ciclo asignado
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
            const allCourses = await fetchCoursesApi();
            const filtered = (allCourses || []).filter(
              (c) =>
                c.gradeName.toLowerCase().trim() === cycleName.toLowerCase().trim() ||
                cycleName.toLowerCase().includes(c.gradeName.toLowerCase().trim())
            );
            setCoursesList(filtered);
          }
        }
      } catch (err) {
        console.warn('Error al obtener cursos del alumno:', err);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    }

    loadStudentCourses();
    return () => {
      isMounted = false;
    };
  }, [cycleName]);

  // Cargar sesiones cuando se abre un curso
  useEffect(() => {
    if (!selectedCourse) {
      setCourseSessions([]);
      return;
    }
    let isMounted = true;
    setLoadingSessions(true);
    fetchSessionsApi(selectedCourse.subject, cycleName)
      .then((data) => {
        if (isMounted) {
          setCourseSessions(data || []);
        }
      })
      .catch((err) => {
        console.warn('Error cargando sesiones:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingSessions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourse, cycleName]);

  // Desglosar código y asignatura de los cursos reales
  const displayCourses = useMemo(() => {
    return coursesList.map((c, idx) => {
      const full = c.courseName || '';
      let code = '';
      let subject = full;

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
        teacher: c.teacherName || 'Sin docente asignado',
      };
    });
  }, [coursesList]);

  // Notas vinculadas al curso seleccionado
  const selectedCourseGrades = useMemo(() => {
    if (!selectedCourse) return [];
    const subjNorm = selectedCourse.subject.toLowerCase().trim();
    const codeNorm = selectedCourse.code.toLowerCase().trim();
    return studentGrades.filter((g) => {
      const cNorm = (g.course || '').toLowerCase().trim();
      return cNorm.includes(subjNorm) || subjNorm.includes(cNorm) || cNorm.includes(codeNorm);
    });
  }, [selectedCourse, studentGrades]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8">
      {/* ========================================================================= */}
      {/* 1. CABECERA LIMPIA Y COMPACTA (ADAPTADA A CELULAR)                        */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md border border-lionGold-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-lionGold-500 text-burgundy-950">
                <Sparkles className="w-3 h-3" />
                <span>Alumno</span>
              </span>
              <span className="bg-white/10 text-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                {cycleName}
              </span>
              <span className="bg-white/10 text-lionGold-300 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
                {classroomName}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-serif text-white tracking-wide">
              ¡Hola León, {currentUser.name}!
            </h1>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              DNI: {currentUser.dni} • Cód: {currentUser.studentCode || `WHT-2026-${currentUser.dni.slice(-4)}`}
            </p>
          </div>

          {/* Acciones de Cabecera: Carnet Digital + Estado Hoy */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCardModal(true)}
              className="px-3.5 py-2 rounded-xl bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <IdCard className="w-4 h-4" />
              <span>Mi Carnet Digital</span>
            </button>

            <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/15 flex items-center gap-2 text-xs">
              <span className="text-slate-300 font-bold text-[11px]">Hoy:</span>
              {todayRecord ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{todayRecord.time}</span>
                </span>
              ) : (
                <span className="text-amber-300 font-medium">Ingreso pendiente</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SELECTOR DE ESPACIOS (TABS LIMPIOS PARA MÓVIL Y ESCRITORIO)            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex overflow-x-auto gap-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('cursos')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'cursos'
              ? 'bg-burgundy-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cursos ({displayCourses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'ranking'
              ? 'bg-burgundy-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Exámenes Ranking ({studentRankingGrades.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulacros')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'simulacros'
              ? 'bg-burgundy-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Simulacros ({studentSimulacros.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practicas')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'practicas'
              ? 'bg-burgundy-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Prácticas ({studentPracticas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('asistencia')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'asistencia'
              ? 'bg-burgundy-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Asistencia</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. ESPACIO 1: MIS CURSOS REALES DE LA BASE DE DATOS                       */}
      {/* ========================================================================= */}
      {activeTab === 'cursos' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-burgundy-900" />
                <span>Mis Cursos Registrados</span>
              </h2>
              <p className="text-xs text-slate-500">
                Asignaturas oficiales para {cycleName}. Haz clic en un curso para ver sus sesiones, temas y notas.
              </p>
            </div>
            <span className="text-xs font-bold font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {displayCourses.length} materias
            </span>
          </div>

          {loadingCourses ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-burgundy-800 border-t-transparent rounded-full mx-auto" />
              <p>Consultando cursos asignados en la base de datos...</p>
            </div>
          ) : displayCourses.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">
                Aún no tienes cursos asignados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tus cursos aparecerán aquí una vez que la dirección o coordinación los registre para <strong className="text-slate-700">{cycleName}</strong> desde la consola de gestión académica.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayCourses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCourse(c);
                    setCourseDetailTab('sesiones');
                  }}
                  className="bg-slate-50 hover:bg-white rounded-2xl p-4 border border-slate-200 hover:border-burgundy-300 hover:shadow-sm transition cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black bg-burgundy-900 text-white px-2 py-0.5 rounded-lg shadow-2xs">
                        {c.code}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Oficial</span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 group-hover:text-burgundy-950 transition line-clamp-1">
                      {c.subject}
                    </h3>

                    <p className="text-xs text-slate-600 font-medium truncate">
                      {c.teacher}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">Ver sesiones & notas</span>
                    <span className="inline-flex items-center gap-1 text-burgundy-900 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Abrir</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ESPACIO 2: EXÁMENES RANKING (SUSTITUYEN BIMESTRES EN ACADEMIA)          */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-burgundy-900" />
                <span>Exámenes Ranking Oficiales</span>
              </h2>
              <p className="text-xs text-slate-500">
                Evaluaciones de posición y puntajes ranking programados en la Academia Whitman.
              </p>
            </div>
            <span className="text-xs font-bold font-mono bg-burgundy-100 text-burgundy-950 px-2.5 py-1 rounded-lg">
              {studentRankingGrades.length} rendidos
            </span>
          </div>

          {studentRankingGrades.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">
                Aún no tienes exámenes ranking registrados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Los resultados de tus Exámenes Ranking (Ranking 1, 2, 3...) serán cargados por tus docentes y coordinación general aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentRankingGrades.map((rk, idx) => (
                <div
                  key={rk.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider bg-burgundy-900 text-white px-2 py-0.5 rounded">
                        {rk.period || `Examen Ranking ${idx + 1}`}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{rk.date}</span>
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">
                      {rk.title || `Evaluación Ranking`}
                    </h4>

                    {rk.course && (
                      <p className="text-xs text-slate-500 font-medium">
                        Asignatura / Área: <strong className="text-slate-700">{rk.course}</strong>
                      </p>
                    )}

                    {rk.feedback && (
                      <p className="text-xs text-slate-500 italic">
                        "{rk.feedback}"
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-400 block font-bold uppercase">Nota / Puntaje</span>
                    <span
                      className={`text-xl font-black font-serif px-3 py-1 rounded-xl border inline-block ${
                        rk.score >= 14
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : rk.score >= 11
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      {rk.score.toFixed(1)}
                      <span className="text-xs font-normal text-slate-400"> / {rk.maxScore || 20}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ESPACIO 3: EXÁMENES SIMULACRO DE FIN DE SEMANA (SOLO DB REAL)           */}
      {/* ========================================================================= */}
      {activeTab === 'simulacros' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-lionGold-600" />
                <span>Exámenes Simulacro de Fin de Semana</span>
              </h2>
              <p className="text-xs text-slate-500">
                Puntajes y notas de simulacro subidas por la administración al término de cada fin de semana.
              </p>
            </div>
            <span className="text-xs font-bold font-mono bg-lionGold-100 text-burgundy-950 px-2.5 py-1 rounded-lg">
              {studentSimulacros.length} simulacros
            </span>
          </div>

          {studentSimulacros.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">
                Aún no tienes simulacros calificados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Los resultados de los exámenes simulacro se suben al finalizar cada jornada de fin de semana desde la consola de gestión.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentSimulacros.map((sim, idx) => (
                <div
                  key={sim.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-lionGold-100 text-burgundy-950 px-2 py-0.5 rounded">
                        Simulacro #{idx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{sim.date}</span>
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 mt-1">
                      {sim.title || `Simulacro Tipo Examen`}
                    </h4>

                    {sim.feedback && (
                      <p className="text-xs text-slate-500 italic mt-0.5">
                        "{sim.feedback}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-bold uppercase">Puntaje</span>
                      <span className="text-xl font-black text-burgundy-950 font-serif">
                        {sim.score}
                        <span className="text-xs font-normal text-slate-400"> / {sim.maxScore || 1000}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ESPACIO 4: NOTAS DE PRÁCTICA REALES (SOLO DB)                          */}
      {/* ========================================================================= */}
      {activeTab === 'practicas' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-burgundy-900" />
                <span>Notas de Práctica Calificada</span>
              </h2>
              <p className="text-xs text-slate-500">
                En academia, las prácticas se aplican periódicamente según el plan de cada profesor.
              </p>
            </div>
            <span className="text-xs font-bold font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {studentPracticas.length} notas
            </span>
          </div>

          {studentPracticas.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">
                Sin notas de práctica registradas aún
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No todos los cursos llevan nota de práctica todas las semanas. Tus profesores las registrarán aquí cuando corresponda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentPracticas.map((pr) => (
                <div
                  key={pr.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        {pr.course}
                      </span>
                      <span className="text-xs text-slate-400">{pr.date}</span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 mt-1">
                      {pr.title}
                    </h4>

                    {pr.feedback && (
                      <p className="text-xs text-slate-500 italic mt-0.5">
                        "{pr.feedback}"
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-base font-black px-2.5 py-1 rounded-xl border ${
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

      {/* ========================================================================= */}
      {/* 7. ESPACIO 5: ASISTENCIAS Y MARCADO                                       */}
      {/* ========================================================================= */}
      {activeTab === 'asistencia' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-burgundy-900" />
                <span>Control de Asistencia</span>
              </h2>
              <p className="text-xs text-slate-500">
                Registro biométrico y de lectora de garita.
              </p>
            </div>
            <Link
              href="/asistencia"
              className="text-xs font-bold text-burgundy-900 hover:underline flex items-center gap-1"
            >
              <span>Ver Calendario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-burgundy-900 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Ingreso de Hoy</span>
                <p className="text-sm font-black text-slate-900">
                  {todayRecord ? `${todayRecord.status} (${todayRecord.time})` : 'Pendiente'}
                </p>
                <p className="text-[11px] text-slate-400">{todayRecord?.notes || 'Marcado en garita'}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lionGold-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Salida de Hoy</span>
                <p className="text-sm font-black text-slate-900">
                  {todayRecord?.exitTime || 'Pendiente'}
                </p>
                <p className="text-[11px] text-slate-400">Se registra en portería al salir</p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-right">
            <span className="text-xs font-bold text-slate-500 mr-2">
              Total días asistidos: <strong className="text-burgundy-900">{studentAttendance.length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL DETALLE DE UN CURSO (SESIONES Y NOTAS DEL CURSO)                 */}
      {/* ========================================================================= */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header del Curso */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-burgundy-950 to-burgundy-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-black bg-lionGold-500 text-burgundy-950 px-2 py-1 rounded-lg">
                  {selectedCourse.code}
                </span>
                <div>
                  <h3 className="font-serif font-black text-base sm:text-lg text-white">
                    {selectedCourse.subject}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Docente: {selectedCourse.teacher}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas internas del curso: Sesiones vs Notas */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCourseDetailTab('sesiones')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  courseDetailTab === 'sesiones'
                    ? 'border-burgundy-900 text-burgundy-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Sesiones ({courseSessions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCourseDetailTab('notas')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  courseDetailTab === 'notas'
                    ? 'border-burgundy-900 text-burgundy-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Notas del Curso ({selectedCourseGrades.length})</span>
              </button>
            </div>

            {/* Contenido: Sesiones o Notas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {courseDetailTab === 'sesiones' && (
                <>
                  {loadingSessions ? (
                    <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                      <div className="animate-spin w-6 h-6 border-2 border-burgundy-800 border-t-transparent rounded-full mx-auto" />
                      <p>Consultando sesiones y materiales...</p>
                    </div>
                  ) : courseSessions.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-700">
                        El profesor aún no ha publicado sesiones o materiales
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
                        Las guías de clase, separatas y boletines que suba {selectedCourse.teacher} aparecerán en esta sección.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courseSessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 hover:bg-white transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black bg-burgundy-900 text-white px-2 py-0.5 rounded">
                              Sesión #{sess.sessionNumber}
                            </span>
                            {sess.date && (
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{sess.date}</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-sm text-slate-900">
                            {sess.title}
                          </h4>

                          {sess.topic && (
                            <p className="text-xs text-slate-600">
                              {sess.topic}
                            </p>
                          )}

                          {sess.homework && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-900">
                              <strong>Tarea / Actividad:</strong> {sess.homework}
                            </div>
                          )}

                          {sess.materials && Array.isArray(sess.materials) && sess.materials.length > 0 && (
                            <div className="pt-1.5 flex flex-wrap gap-2">
                              {sess.materials.map((mat: any, mIdx: number) => (
                                <a
                                  key={mIdx}
                                  href={mat.url || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-burgundy-900 hover:bg-burgundy-50 transition"
                                >
                                  <Download className="w-3 h-3 text-burgundy-800" />
                                  <span>{mat.title || `Material ${mIdx + 1}`}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {courseDetailTab === 'notas' && (
                <>
                  {selectedCourseGrades.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Award className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-700">
                        Sin calificaciones registradas para este curso
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
                        Cuando el docente registre una práctica o examen de este curso, la verás aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedCourseGrades.map((gr) => (
                        <div
                          key={gr.id}
                          className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                {gr.evaluationType}
                              </span>
                              <span className="text-[11px] text-slate-400">{gr.date}</span>
                            </div>
                            <h5 className="font-bold text-xs sm:text-sm text-slate-900 mt-0.5">
                              {gr.title}
                            </h5>
                            {gr.feedback && (
                              <p className="text-xs text-slate-500 italic mt-0.5">"{gr.feedback}"</p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-sm font-black px-2 py-0.5 rounded-lg border ${
                                gr.score >= 14
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : gr.score >= 11
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {gr.score.toFixed(1)} / {gr.maxScore || 20}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
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
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL DE CARNET OFICIAL ESTUDIANTIL CON CÓDIGO QR                       */}
      {/* ========================================================================= */}
      {showCardModal && (
        <StudentCardModal
          student={currentUser}
          onClose={() => setShowCardModal(false)}
        />
      )}
    </div>
  );
};
