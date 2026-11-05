'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GradeRecord, User, UserRole, EvaluationType, Course, AcademicClass } from '../types';
import {
  BookOpen,
  PlusCircle,
  Search,
  Calendar,
  Sparkles,
  Award,
  Trash2,
  GraduationCap,
  Users,
  CheckCircle2,
  Filter,
  Layers,
  ChevronRight,
  BookMarked,
  Wand2,
} from 'lucide-react';
import {
  createGrade,
  deleteGradeApi,
  fetchCoursesApi,
  createCourseApi,
  deleteCourseApi,
  fetchAcademicGradesApi,
  fetchAcademicClasses,
} from '../lib/api';

interface GradesManagerProps {
  grades: GradeRecord[];
  students: User[];
  currentRole: UserRole;
  currentUser?: User | null;
  linkedStudents?: User[];
  onRefresh: () => void;
}

export const GradesManager: React.FC<GradesManagerProps> = ({
  grades,
  students,
  currentRole,
  currentUser,
  linkedStudents = [],
  onRefresh,
}) => {
  // Datos académicos desde Neon PostgreSQL
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicGrades, setAcademicGrades] = useState<Array<{ id: string; name: string; level: string }>>([]);
  const [academicClasses, setAcademicClasses] = useState<AcademicClass[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filtros para Docente / Admin
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState('');

  // Selector para Padre con múltiples hijos
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<string>('');

  // Modales
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);

  // Formulario de Calificación
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [modalCourse, setModalCourse] = useState('');
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [score, setScore] = useState('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('PRACTICA');
  const [feedback, setFeedback] = useState('');
  const [teacherName, setTeacherName] = useState(currentUser?.name || 'Docente Whitman');
  const [savingGrade, setSavingGrade] = useState(false);

  // Formulario de Nuevo Curso
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTeacher, setNewCourseTeacher] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  // Cargar cursos, grados y aulas desde la base de datos
  const loadAcademicStructure = async () => {
    setLoadingData(true);
    try {
      const [crs, grds, cls] = await Promise.all([
        fetchCoursesApi(),
        fetchAcademicGradesApi(),
        fetchAcademicClasses(),
      ]);
      setCourses(crs);
      setAcademicGrades(grds);
      setAcademicClasses(cls);

      if (grds.length > 0 && !selectedGrade) {
        setSelectedGrade(grds[0].name);
      }
    } catch (e) {
      console.warn('Error cargando estructura académica:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAcademicStructure();
  }, []);

  // Extraer Grado y Sección de un texto tipo "1ro Primaria - Sección A"
  const extractGradeAndSection = (gradeOrClass?: string) => {
    if (!gradeOrClass) return { grade: '', section: '' };
    const parts = gradeOrClass.split(' - ');
    return {
      grade: parts[0]?.trim() || '',
      section: parts[1]?.trim() || '',
    };
  };

  // Alumno activo cuando es vista de estudiante o de padre
  const activeStudent = useMemo(() => {
    if (currentRole === 'ALUMNO') {
      return currentUser;
    }
    if (currentRole === 'PADRE') {
      if (selectedStudentForParent) {
        return linkedStudents.find((s) => s.id === selectedStudentForParent) || linkedStudents[0] || null;
      }
      return linkedStudents[0] || null;
    }
    return null;
  }, [currentRole, currentUser, linkedStudents, selectedStudentForParent]);

  // Secciones disponibles para el grado seleccionado en vista docente
  const availableSections = useMemo(() => {
    if (!selectedGrade) return [];
    const classesOfGrade = academicClasses.filter(
      (c) => c.grade.trim().toLowerCase() === selectedGrade.trim().toLowerCase()
    );
    const sections = classesOfGrade.map((c) => c.section.trim());
    return Array.from(new Set(sections));
  }, [selectedGrade, academicClasses]);

  // Cursos disponibles para el grado seleccionado
  const coursesForCurrentGrade = useMemo(() => {
    const targetGrade =
      currentRole === 'ALUMNO' || currentRole === 'PADRE'
        ? extractGradeAndSection(activeStudent?.gradeOrClass).grade
        : selectedGrade;

    if (!targetGrade) return [];
    return courses.filter(
      (c) => c.gradeName.trim().toLowerCase() === targetGrade.trim().toLowerCase()
    );
  }, [courses, currentRole, activeStudent, selectedGrade]);

  // Alumnos del grado y sección seleccionada (para Docente)
  const studentsInSelection = useMemo(() => {
    if (!selectedGrade) return [];
    return students.filter((s) => {
      if (s.role !== 'ALUMNO') return false;
      const { grade, section } = extractGradeAndSection(s.gradeOrClass);
      if (grade.toLowerCase() !== selectedGrade.toLowerCase()) return false;
      if (selectedSection !== 'TODAS' && section.toLowerCase() !== selectedSection.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [students, selectedGrade, selectedSection]);

  // Cursos sugeridos oficiales por nivel
  const handleAutoSeedSuggestedCourses = async () => {
    if (!selectedGrade) return;
    const currentGradeObj = academicGrades.find((g) => g.name === selectedGrade);
    const lvl = currentGradeObj?.level || (selectedGrade.includes('Secundaria') ? 'SECUNDARIA' : 'PRIMARIA');

    const defaultCourses =
      lvl === 'PRIMARIA'
        ? [
            'Matemática',
            'Comunicación',
            'Ciencia y Tecnología',
            'Personal Social',
            'Inglés',
            'Arte y Cultura',
            'Educación Física',
            'Religión',
          ]
        : [
            'Álgebra y Aritmética',
            'Geometría y Trigonometría',
            'Lenguaje y Literatura',
            'Física y Química',
            'Biología y Anatomía',
            'Historia y Geografía',
            'Inglés',
            'Razonamiento Matemático',
            'Razonamiento Verbal',
          ];

    if (!confirm(`¿Deseas agregar ${defaultCourses.length} cursos oficiales sugeridos para ${selectedGrade}?`)) {
      return;
    }

    try {
      for (const cName of defaultCourses) {
        await createCourseApi({
          gradeName: selectedGrade,
          courseName: cName,
          level: lvl,
        });
      }
      await loadAcademicStructure();
      alert('¡Cursos del grado creados exitosamente en Neon DB!');
    } catch (err: any) {
      alert(err.message || 'Error al generar cursos');
    }
  };

  // Crear un nuevo curso en el grado seleccionado
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !selectedGrade) {
      alert('El nombre del curso y el grado son obligatorios.');
      return;
    }

    const currentGradeObj = academicGrades.find((g) => g.name === selectedGrade);
    const lvl = currentGradeObj?.level || (selectedGrade.includes('Secundaria') ? 'SECUNDARIA' : 'PRIMARIA');

    setSavingCourse(true);
    try {
      await createCourseApi({
        gradeName: selectedGrade,
        courseName: newCourseName.trim(),
        level: lvl,
        teacherName: newCourseTeacher.trim() || undefined,
      });

      setNewCourseName('');
      setNewCourseTeacher('');
      setShowCourseModal(false);
      await loadAcademicStructure();
    } catch (err: any) {
      alert(err.message || 'Error al crear curso');
    } finally {
      setSavingCourse(false);
    }
  };

  // Eliminar curso de un grado
  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`¿Eliminar el curso "${courseName}" de ${selectedGrade}?`)) return;
    try {
      await deleteCourseApi(courseId);
      await loadAcademicStructure();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar curso');
    }
  };

  // Guardar calificación
  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !modalCourse || !evaluationTitle || !score) {
      alert('Completa todos los campos obligatorios para registrar la nota.');
      return;
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 20) {
      alert('La nota debe ser un número válido entre 0 y 20.');
      return;
    }

    const studentObj = students.find((s) => s.id === selectedStudentId);

    setSavingGrade(true);
    try {
      await createGrade({
        userId: selectedStudentId,
        userName: studentObj?.name,
        userDni: studentObj?.dni,
        userLevel: studentObj?.level,
        userGrade: studentObj?.gradeOrClass,
        course: modalCourse,
        title: evaluationTitle.trim(),
        score: numScore,
        maxScore: 20,
        evaluationType,
        period: 'I Bimestre / Año Escolar 2026',
        teacherName,
        feedback: feedback.trim(),
      });

      setShowGradeModal(false);
      setEvaluationTitle('');
      setScore('');
      setFeedback('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar calificación');
    } finally {
      setSavingGrade(false);
    }
  };

  // Eliminar nota
  const handleDeleteGrade = async (gradeId: string, title: string) => {
    if (!confirm(`¿Eliminar la calificación "${title}" de la base de datos?`)) return;
    try {
      await deleteGradeApi(gradeId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const getScoreBadge = (val: number) => {
    if (val >= 17) {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2 py-0.5 rounded-lg text-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          {val.toFixed(1)} / 20
        </span>
      );
    }
    if (val >= 14) {
      return (
        <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-2 py-0.5 rounded-lg text-xs">
          {val.toFixed(1)} / 20
        </span>
      );
    }
    if (val >= 11) {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-lg text-xs">
          {val.toFixed(1)} / 20
        </span>
      );
    }
    return (
      <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded-lg text-xs">
        {val.toFixed(1)} / 20
      </span>
    );
  };

  // ==========================================
  // VISTA 1: ALUMNO O PADRE DE FAMILIA
  // ==========================================
  if (currentRole === 'ALUMNO' || currentRole === 'PADRE') {
    const studentInfo = activeStudent;
    const { grade: studentGrade, section: studentSection } = extractGradeAndSection(
      studentInfo?.gradeOrClass
    );

    // Notas de este alumno
    const myGrades = grades.filter(
      (g) => g.userId === studentInfo?.id || g.userDni === studentInfo?.dni
    );

    const overallAverage =
      myGrades.length > 0
        ? (myGrades.reduce((acc, curr) => acc + curr.score, 0) / myGrades.length).toFixed(1)
        : null;

    return (
      <div className="space-y-6">
        {/* Selector de Hijo si es Padre con más de 1 alumno */}
        {currentRole === 'PADRE' && linkedStudents.length > 1 && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Hijo(a):</span>
            {linkedStudents.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedStudentForParent(child.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  studentInfo?.id === child.id
                    ? 'bg-burgundy-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {/* Resumen del Estudiante y su Grado Escolar */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-burgundy-800 bg-burgundy-50 px-2.5 py-0.5 rounded-md border border-burgundy-200">
              Boletín Académico Oficial
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {studentInfo?.name || 'Estudiante Whitman'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Grado: <strong className="text-slate-800">{studentGrade || 'Por Asignar'}</strong> • Aula:{' '}
              <strong className="text-slate-800">{studentSection || 'Sin Asignar'}</strong> • DNI: {studentInfo?.dni}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Promedio General</span>
              <span className="text-xl font-black text-burgundy-900">
                {overallAverage ? `${overallAverage} / 20` : 'Sin notas'}
              </span>
            </div>
          </div>
        </div>

        {/* Cursos Asignados al Grado del Alumno */}
        {coursesForCurrentGrade.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-2">
            <BookMarked className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="font-bold text-slate-700 text-base">Aún no hay cursos creados para {studentGrade || 'este grado'}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              La dirección académica registrará próximamente el plan de cursos y calificaciones correspondientes a este año escolar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 font-serif flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-burgundy-800" />
                <span>Cursos de {studentGrade} ({coursesForCurrentGrade.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coursesForCurrentGrade.map((crs) => {
                const courseEvals = myGrades.filter(
                  (g) => g.course.trim().toLowerCase() === crs.courseName.trim().toLowerCase()
                );
                const courseAvg =
                  courseEvals.length > 0
                    ? (courseEvals.reduce((a, b) => a + b.score, 0) / courseEvals.length).toFixed(1)
                    : null;

                return (
                  <div
                    key={crs.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-burgundy-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabecera del Curso */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div>
                          <h4 className="font-black text-slate-900 text-base">{crs.courseName}</h4>
                          <p className="text-[11px] text-slate-400">
                            {crs.teacherName ? `Docente: ${crs.teacherName}` : 'Plana Docente Whitman'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Promedio</span>
                          <span
                            className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                              courseAvg && parseFloat(courseAvg) >= 14
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : courseAvg && parseFloat(courseAvg) >= 11
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {courseAvg ? `${courseAvg} / 20` : 'Sin notas'}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Evaluaciones en este Curso */}
                      {courseEvals.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          Aún no se han publicado calificaciones en este curso.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {courseEvals.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                    {ev.evaluationType}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 truncate">{ev.title}</span>
                                </div>
                                {ev.feedback && (
                                  <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                                    "{ev.feedback}"
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {getScoreBadge(ev.score)}
                                <span className="text-[9px] text-slate-400 block mt-0.5">{ev.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA 2: DOCENTE / DIRECTOR / ADMIN
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Barra de Filtro por Grado y Sección */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 font-serif flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-burgundy-800" />
              <span>Calificaciones y Cursos por Grado Escolar</span>
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona el grado escolar para ver sus cursos y registrar notas divididas por sección.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCourseModal(true)}
              className="bg-white hover:bg-slate-50 text-burgundy-900 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-burgundy-800" />
              <span>Nuevo Curso en este Grado</span>
            </button>

            <button
              onClick={() => {
                if (coursesForCurrentGrade.length > 0) {
                  setModalCourse(coursesForCurrentGrade[0].courseName);
                }
                setShowGradeModal(true);
              }}
              className="bg-burgundy-900 hover:bg-burgundy-850 text-white font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Award className="w-4 h-4 text-lionGold-400" />
              <span>Registrar Calificación</span>
            </button>
          </div>
        </div>

        {/* Controles de Selección: Grado y Sección */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Selector de Grado Escolar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              1. Grado Escolar *
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedSection('TODAS');
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
            >
              {academicGrades.length === 0 ? (
                <option value="">No hay grados en la base de datos (Créalos en Gestión)</option>
              ) : (
                academicGrades.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name} ({g.level})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Selector de Sección / Aula */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              2. Sección / Aula (División)
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
            >
              <option value="TODAS">Todas las Secciones de {selectedGrade}</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
              <option value="Sin Asignar">Sin Asignar (Pendientes)</option>
            </select>
          </div>

          {/* Buscador de Alumno */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Buscar Alumno o Nota
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-burgundy-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cursos del Grado */}
      {coursesForCurrentGrade.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
          <BookMarked className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-800 text-base">
            No hay cursos creados para "{selectedGrade || 'este grado'}"
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cada grado debe tener sus propios cursos asignados (ej: Matemática, Comunicación, Ciencia y Tecnología). Todos los alumnos de este grado tendrán acceso a estos cursos.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setShowCourseModal(true)}
              className="bg-burgundy-900 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-burgundy-850 transition"
            >
              + Crear Primer Curso para {selectedGrade}
            </button>

            <button
              onClick={handleAutoSeedSuggestedCourses}
              className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Generar Cursos Oficiales Sugeridos</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Cursos Registrados en {selectedGrade} ({coursesForCurrentGrade.length})
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Alumnos en {selectedSection === 'TODAS' ? 'todas las secciones' : selectedSection}:{' '}
              <strong className="text-slate-700">{studentsInSelection.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coursesForCurrentGrade.map((crs) => {
              // Filtrar notas que pertenezcan a este curso y a los alumnos del grado y sección
              const courseGrades = grades.filter((g) => {
                if (g.course.trim().toLowerCase() !== crs.courseName.trim().toLowerCase()) return false;
                const { grade, section } = extractGradeAndSection(g.gradeOrClass);
                if (grade.toLowerCase() !== selectedGrade.toLowerCase()) return false;
                if (selectedSection !== 'TODAS' && section.toLowerCase() !== selectedSection.toLowerCase()) {
                  return false;
                }
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  if (!g.userName.toLowerCase().includes(q) && !g.title.toLowerCase().includes(q)) {
                    return false;
                  }
                }
                return true;
              });

              return (
                <div
                  key={crs.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-burgundy-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header del Curso */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-base">{crs.courseName}</h4>
                          <span className="text-[10px] font-bold text-burgundy-800 bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200 uppercase">
                            {crs.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {crs.teacherName ? `Docente: ${crs.teacherName}` : 'Docente por asignar'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setModalCourse(crs.courseName);
                            setShowGradeModal(true);
                          }}
                          title="Calificar a un alumno en este curso"
                          className="bg-slate-100 hover:bg-burgundy-100 hover:text-burgundy-900 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                        >
                          + Calificar
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(crs.id, crs.courseName)}
                          title="Eliminar curso de este grado"
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Evaluaciones Registradas en este curso */}
                    {courseGrades.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 italic">
                        Sin calificaciones registradas para {selectedSection === 'TODAS' ? 'este grado' : `la sección ${selectedSection}`}.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {courseGrades.map((g) => (
                          <div
                            key={g.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">{g.userName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-500">
                                  {g.evaluationType}
                                </span>
                                <span className="text-[11px] text-slate-600 truncate">{g.title}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {getScoreBadge(g.score)}
                              <button
                                onClick={() => handleDeleteGrade(g.id, g.title)}
                                className="text-slate-300 hover:text-rose-600 p-1 transition"
                                title="Eliminar nota"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{courseGrades.length} evaluación(es) en esta sección</span>
                    <span>{selectedGrade}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REGISTRAR CALIFICACIÓN                          */}
      {/* ======================================================== */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-850 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-lionGold-400" />
                <h3 className="font-bold text-base">Registrar Calificación por Curso</h3>
              </div>
              <button
                onClick={() => setShowGradeModal(false)}
                className="text-burgundy-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGrade} className="p-6 space-y-4">
              {/* Selección del Curso */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Curso ({selectedGrade}) *
                </label>
                <select
                  value={modalCourse}
                  onChange={(e) => setModalCourse(e.target.value)}
                  required
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                >
                  <option value="">-- Selecciona el curso --</option>
                  {coursesForCurrentGrade.map((c) => (
                    <option key={c.id} value={c.courseName}>
                      {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección del Alumno (Filtrado por Grado y Sección) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alumno de {selectedGrade} ({selectedSection === 'TODAS' ? 'Todas las secciones' : selectedSection}) *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                >
                  <option value="">-- Elige un estudiante --</option>
                  {studentsInSelection.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.name} - DNI: {stu.dni} ({stu.gradeOrClass})
                    </option>
                  ))}
                </select>
                {studentsInSelection.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    ⚠️ No hay alumnos matriculados en {selectedGrade} ({selectedSection}).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo de Evaluación */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Evaluación
                  </label>
                  <select
                    value={evaluationType}
                    onChange={(e) => setEvaluationType(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-700 font-medium"
                  >
                    <option value="PRACTICA">Práctica Calificada</option>
                    <option value="EXAMEN_PARCIAL">Examen Mensual / Parcial</option>
                    <option value="EXAMEN_FINAL">Examen Bimestral</option>
                    <option value="TAREA">Tarea / Trabajo de Clase</option>
                    <option value="SIMULACRO">Simulacro Tipo Admisión</option>
                  </select>
                </div>

                {/* Nota (0-20) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nota (0 a 20) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    required
                    placeholder="Ej: 18.5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full text-sm font-mono font-black border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-burgundy-700"
                  />
                </div>
              </div>

              {/* Título de la Evaluación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Título / Tema de la Evaluación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Práctica 1: Operaciones con Fracciones"
                  value={evaluationTitle}
                  onChange={(e) => setEvaluationTitle(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              {/* Retroalimentación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Comentario / Retroalimentación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Excelente razonamiento y procedimiento ordenado."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="bg-burgundy-900 hover:bg-burgundy-850 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingGrade ? 'Guardando en Neon DB...' : 'Guardar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREAR CURSO PARA ESTE GRADO                     */}
      {/* ======================================================== */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-850 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-lionGold-400" />
                <h3 className="font-bold text-base">Crear Curso para {selectedGrade}</h3>
              </div>
              <button
                onClick={() => setShowCourseModal(false)}
                className="text-burgundy-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Grado Asignado
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedGrade}
                  className="w-full text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre del Curso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Matemática, Comunicación, Inglés, etc."
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Docente Responsable (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Lic. Ricardo Mendoza"
                  value={newCourseTeacher}
                  onChange={(e) => setNewCourseTeacher(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  className="bg-burgundy-900 hover:bg-burgundy-850 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingCourse ? 'Creando...' : 'Crear Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
