'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Download,
  Upload,
  FileSpreadsheet,
  Edit2,
  Save,
  Check,
  AlertCircle,
  Clock,
  ClipboardList,
} from 'lucide-react';
import {
  createGrade,
  createGradesBulk,
  updateGradeApi,
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

const PERIODS = [
  'Bimestre I',
  'Bimestre II',
  'Bimestre III',
  'Bimestre IV',
  'Simulacro Mensual',
];

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

  // Pestaña principal para Docente: 'planilla' | 'excel' | 'cursos'
  const [teacherViewTab, setTeacherViewTab] = useState<'planilla' | 'excel' | 'cursos'>('planilla');

  // Filtros para Docente / Admin
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('TODAS');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Bimestre I');
  const [searchQuery, setSearchQuery] = useState('');

  // Selector para Padre con múltiples hijos
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<string>('');

  // Modales
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);

  // Formulario de Calificación Individual
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [modalCourse, setModalCourse] = useState('');
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [score, setScore] = useState('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('PRACTICA');
  const [feedback, setFeedback] = useState('');
  const [teacherName, setTeacherName] = useState(currentUser?.name || 'Docente Whitman');
  const [savingGrade, setSavingGrade] = useState(false);

  // Formulario de Edición Directa de Calificación
  const [editScore, setEditScore] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Planilla Rápida por Aula
  const [rosterCourse, setRosterCourse] = useState('');
  const [rosterEvalType, setRosterEvalType] = useState<EvaluationType>('PRACTICA');
  const [rosterEvalTitle, setRosterEvalTitle] = useState('');
  const [rosterScores, setRosterScores] = useState<Record<string, string>>({});
  const [rosterFeedbacks, setRosterFeedbacks] = useState<Record<string, string>>({});
  const [savingRoster, setSavingRoster] = useState(false);

  // Importar Excel / Pegar Texto
  const [excelPasteText, setExcelPasteText] = useState('');
  const [excelCourse, setExcelCourse] = useState('');
  const [excelEvalType, setExcelEvalType] = useState<EvaluationType>('PRACTICA');
  const [excelEvalTitle, setExcelEvalTitle] = useState('');
  const [excelSaving, setExcelSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Actualizar curso por defecto de planilla y excel cuando cambian los cursos del grado
  useEffect(() => {
    if (coursesForCurrentGrade.length > 0) {
      if (!rosterCourse || !coursesForCurrentGrade.some((c) => c.courseName === rosterCourse)) {
        setRosterCourse(coursesForCurrentGrade[0].courseName);
      }
      if (!excelCourse || !coursesForCurrentGrade.some((c) => c.courseName === excelCourse)) {
        setExcelCourse(coursesForCurrentGrade[0].courseName);
      }
    }
  }, [coursesForCurrentGrade, rosterCourse, excelCourse]);

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

  // Registrar Calificación Individual
  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !modalCourse || !evaluationTitle.trim() || score === '') {
      alert('Por favor completa todos los campos requeridos (Alumno, Curso, Título y Nota).');
      return;
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 20) {
      alert('La nota debe ser un número válido entre 0 y 20.');
      return;
    }

    setSavingGrade(true);
    try {
      await createGrade({
        userId: selectedStudentId,
        course: modalCourse,
        title: evaluationTitle.trim(),
        score: numScore,
        maxScore: 20,
        evaluationType,
        period: selectedPeriod,
        teacherName: teacherName.trim() || currentUser?.name || 'Docente Whitman',
        feedback: feedback.trim(),
      });

      setScore('');
      setEvaluationTitle('');
      setFeedback('');
      setShowGradeModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar calificación');
    } finally {
      setSavingGrade(false);
    }
  };

  // Guardar Planilla Rápida por Aula
  const handleSaveRosterGrades = async () => {
    if (!rosterCourse) {
      alert('Selecciona el curso para la planilla.');
      return;
    }
    const title = rosterEvalTitle.trim() || `${rosterEvalType} - ${new Date().toLocaleDateString('es-PE')}`;

    // Recolectar todas las notas digitadas
    const gradesToSubmit: any[] = [];
    for (const student of studentsInSelection) {
      const val = rosterScores[student.id];
      if (val !== undefined && val !== '') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 20) {
          alert(`La nota para ${student.name} debe ser un número entre 0 y 20.`);
          return;
        }
        gradesToSubmit.push({
          userId: student.id,
          userName: student.name,
          userDni: student.dni,
          course: rosterCourse,
          title,
          score: num,
          maxScore: 20,
          evaluationType: rosterEvalType,
          period: selectedPeriod,
          teacherName: currentUser?.name || 'Docente Whitman',
          feedback: rosterFeedbacks[student.id] || '',
        });
      }
    }

    if (gradesToSubmit.length === 0) {
      alert('Ingresa la nota de al menos un estudiante antes de guardar.');
      return;
    }

    setSavingRoster(true);
    try {
      const res = await createGradesBulk(gradesToSubmit);
      alert(res.message || `¡${gradesToSubmit.length} notas guardadas exitosamente en Neon PostgreSQL!`);
      setRosterScores({});
      setRosterFeedbacks({});
      setRosterEvalTitle('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar planilla de notas');
    } finally {
      setSavingRoster(false);
    }
  };

  // Descargar Plantilla en Formato Excel (.csv con BOM UTF-8)
  const handleDownloadExcelTemplate = () => {
    const headers = ['DNI', 'Nombre', 'Nota', 'Observacion'];
    const rows =
      studentsInSelection.length > 0
        ? studentsInSelection.map((s) => [s.dni, `"${s.name.replace(/"/g, '""')}"`, '', ''])
        : [
            ['71234561', '"Ejemplo Alumno 1"', '18', '"Buen examen"'],
            ['71234562', '"Ejemplo Alumno 2"', '15', '"Participativo"'],
            ['71234563', '"Ejemplo Alumno 3"', '12', '"Reforzar álgebra"'],
          ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSection = selectedSection.replace(/\s+/g, '_');
    const cleanGrade = selectedGrade.replace(/\s+/g, '_');
    link.setAttribute('download', `Plantilla_Notas_${cleanGrade}_${cleanSection}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parsear texto copiado desde Excel o archivo CSV
  const parsedExcelRows = useMemo(() => {
    if (!excelPasteText.trim()) return [];

    const lines = excelPasteText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const results: Array<{
      dni: string;
      name: string;
      score: number | null;
      feedback: string;
      valid: boolean;
      error?: string;
      studentObj?: User;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Ignorar encabezados si el usuario copió encabezado de columna
      if (i === 0 && (line.toLowerCase().includes('dni') || line.toLowerCase().includes('nombre') || line.toLowerCase().includes('nota'))) {
        continue;
      }

      // Separar por tabulaciones (copiado directo de Excel) o por comas o punto y coma
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else {
        parts = line.split(',');
      }

      const rawDni = String(parts[0] || '').replace(/["']/g, '').trim();
      const rawName = String(parts[1] || '').replace(/["']/g, '').trim();
      const rawScore = String(parts[2] || '').replace(/["']/g, '').trim();
      const rawFeedback = String(parts[3] || '').replace(/["']/g, '').trim();

      if (!rawDni) continue;

      // Buscar si el DNI existe entre los alumnos
      const foundStudent = students.find((s) => s.dni.trim() === rawDni);

      let scoreNum: number | null = null;
      let valid = true;
      let error = '';

      if (rawScore !== '') {
        scoreNum = parseFloat(rawScore);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 20) {
          valid = false;
          error = 'Nota debe estar entre 0 y 20';
        }
      } else {
        valid = false;
        error = 'Falta ingresar la nota';
      }

      if (!foundStudent) {
        valid = false;
        error = error ? `${error} • DNI no encontrado` : 'DNI no matriculado';
      }

      results.push({
        dni: rawDni,
        name: foundStudent ? foundStudent.name : rawName || 'No identificado',
        score: scoreNum,
        feedback: rawFeedback,
        valid,
        error: error || undefined,
        studentObj: foundStudent,
      });
    }

    return results;
  }, [excelPasteText, students]);

  // Manejar subida de archivo CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || '');
      setExcelPasteText(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Guardar Calificaciones Importadas desde Excel
  const handleSaveExcelImport = async () => {
    if (!excelCourse) {
      alert('Selecciona el curso para registrar las notas.');
      return;
    }

    const validRows = parsedExcelRows.filter((r) => r.valid && r.studentObj && r.score !== null);
    if (validRows.length === 0) {
      alert('No hay filas válidas para guardar. Corrige los errores en la previsualización.');
      return;
    }

    const title = excelEvalTitle.trim() || `${excelEvalType} - Carga Excel (${new Date().toLocaleDateString('es-PE')})`;

    const bulkPayload = validRows.map((r) => ({
      userId: r.studentObj!.id,
      userName: r.studentObj!.name,
      userDni: r.studentObj!.dni,
      course: excelCourse,
      title,
      score: r.score!,
      maxScore: 20,
      evaluationType: excelEvalType,
      period: selectedPeriod,
      teacherName: currentUser?.name || 'Docente Whitman',
      feedback: r.feedback || '',
    }));

    setExcelSaving(true);
    try {
      const res = await createGradesBulk(bulkPayload);
      alert(res.message || `¡${validRows.length} calificaciones registradas desde Excel!`);
      setExcelPasteText('');
      setExcelEvalTitle('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar notas de Excel');
    } finally {
      setExcelSaving(false);
    }
  };

  // Abrir Modal de Edición Directa de Nota
  const handleOpenEdit = (grade: GradeRecord) => {
    setEditingGrade(grade);
    setEditScore(String(grade.score));
    setEditTitle(grade.title);
    setEditFeedback(grade.feedback || '');
    setEditPeriod(grade.period || selectedPeriod);
  };

  // Guardar Edición Directa
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    const num = parseFloat(editScore);
    if (isNaN(num) || num < 0 || num > 20) {
      alert('La nota debe ser un número entre 0 y 20.');
      return;
    }

    setSavingEdit(true);
    try {
      await updateGradeApi(editingGrade.id, {
        score: num,
        title: editTitle.trim(),
        feedback: editFeedback.trim(),
        period: editPeriod,
      });
      setEditingGrade(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar calificación');
    } finally {
      setSavingEdit(false);
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

    // Notas de este alumno filtradas por periodo si se desea
    const myGrades = grades.filter(
      (g) =>
        (g.userId === studentInfo?.id || g.userDni === studentInfo?.dni) &&
        (selectedPeriod === 'TODOS' || !g.period || g.period === selectedPeriod)
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
              Boletín Académico Oficial • Whitman
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {studentInfo?.name || 'Estudiante Whitman'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Grado: <strong className="text-slate-800">{studentGrade || 'Por Asignar'}</strong> • Aula:{' '}
              <strong className="text-slate-800">{studentSection || 'Sin Asignar'}</strong> • DNI: {studentInfo?.dni}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Periodo Bimestral */}
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <label className="text-[10px] font-black text-slate-400 uppercase block">Periodo Escolar</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs font-bold bg-transparent text-burgundy-900 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos los Periodos</option>
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Promedio Ponderado</span>
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
              <span className="text-xs font-bold text-slate-500">
                Mostrando: <strong className="text-burgundy-900">{selectedPeriod}</strong>
              </span>
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
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {crs.teacherName ? `Profesor(a): ${crs.teacherName}` : 'Profesor(a) por asignar'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Promedio Curso</span>
                          <span className="text-sm font-black text-burgundy-900">
                            {courseAvg ? `${courseAvg} / 20` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Evaluaciones de este Curso */}
                      {courseEvals.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">
                          Aún no hay calificaciones en {selectedPeriod} para este curso.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {courseEvals.map((ev) => (
                            <div
                              key={ev.id}
                              className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block">{ev.title}</span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>{ev.date}</span>
                                  <span>•</span>
                                  <span className="font-bold text-burgundy-800 uppercase">{ev.evaluationType}</span>
                                  {ev.period && <span>• {ev.period}</span>}
                                </div>
                                {ev.feedback && (
                                  <p className="text-[11px] text-slate-600 italic mt-1 bg-white/70 p-1 rounded border border-slate-200">
                                    💬 {ev.feedback}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0">{getScoreBadge(ev.score)}</div>
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
              <span>Sistema de Calificaciones • Colegio Whitman</span>
            </h2>
            <p className="text-xs text-slate-500">
              Planilla rápida por aula, carga masiva desde Excel, corrección directa de notas y cálculo automático de promedios.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExcelTemplate}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Descargar Formato Excel (.csv)</span>
            </button>

            <button
              onClick={() => setShowCourseModal(true)}
              className="bg-white hover:bg-slate-50 text-burgundy-900 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-burgundy-800" />
              <span>Nuevo Curso</span>
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
              <span>Calificar Individual</span>
            </button>
          </div>
        </div>

        {/* Controles de Selección: Grado, Sección y Periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
              2. Sección / Aula
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

          {/* Selector de Periodo Bimestral */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              3. Periodo Escolar *
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-burgundy-900 focus:outline-none focus:border-burgundy-700"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
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
                placeholder="Filtrar por nombre o título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-burgundy-700"
              />
            </div>
          </div>
        </div>

        {/* Pestañas de Vista para el Docente */}
        <div className="flex border-b border-slate-200 gap-4 pt-2">
          <button
            onClick={() => setTeacherViewTab('planilla')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              teacherViewTab === 'planilla'
                ? 'border-burgundy-900 text-burgundy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Planilla Rápida por Aula (Registro Masivo)</span>
          </button>

          <button
            onClick={() => setTeacherViewTab('excel')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              teacherViewTab === 'excel'
                ? 'border-burgundy-900 text-burgundy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Carga desde Excel / Pegar (Ctrl+V)</span>
          </button>

          <button
            onClick={() => setTeacherViewTab('cursos')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition ${
              teacherViewTab === 'cursos'
                ? 'border-burgundy-900 text-burgundy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ver Tarjetas de Cursos y Notas</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA A: PLANILLA RÁPIDA POR AULA (REGISTRO MASIVO)     */}
      {/* ======================================================== */}
      {teacherViewTab === 'planilla' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase bg-burgundy-100 text-burgundy-900 px-2.5 py-0.5 rounded">
                Ingreso Rápido de Calificaciones
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Planilla de Notas: {selectedGrade} ({selectedSection === 'TODAS' ? 'Todas las secciones' : selectedSection})
              </h3>
              <p className="text-xs text-slate-500">
                Digita las notas de los alumnos y guarda todas con un solo clic.
              </p>
            </div>

            <button
              onClick={handleSaveRosterGrades}
              disabled={savingRoster || studentsInSelection.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingRoster ? 'Guardando en Neon DB...' : 'Guardar Notas del Aula'}</span>
            </button>
          </div>

          {/* Parámetros de la Evaluación para la Planilla */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Curso a Calificar *
              </label>
              <select
                value={rosterCourse}
                onChange={(e) => setRosterCourse(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
              >
                {coursesForCurrentGrade.map((c) => (
                  <option key={c.id} value={c.courseName}>
                    {c.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Tipo de Evaluación *
              </label>
              <select
                value={rosterEvalType}
                onChange={(e) => setRosterEvalType(e.target.value as any)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
              >
                <option value="PRACTICA">Práctica Calificada</option>
                <option value="EXAMEN_PARCIAL">Examen Mensual / Parcial</option>
                <option value="EXAMEN_FINAL">Examen Bimestral</option>
                <option value="TAREA">Tarea / Trabajo Escolar</option>
                <option value="SIMULACRO">Simulacro Tipo Admisión</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Título de la Evaluación *
              </label>
              <input
                type="text"
                placeholder="Ej: Práctica 2: Polinomios"
                value={rosterEvalTitle}
                onChange={(e) => setRosterEvalTitle(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white"
              />
            </div>
          </div>

          {/* Tabla de Alumnos para digitar notas */}
          {studentsInSelection.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">
              No hay alumnos matriculados en {selectedGrade} ({selectedSection}).
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">DNI</th>
                    <th className="py-3 px-4">Apellidos y Nombres</th>
                    <th className="py-3 px-4">Aula / Sección</th>
                    <th className="py-3 px-4 w-32">Nota (0 a 20)</th>
                    <th className="py-3 px-4">Observación / Retroalimentación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsInSelection.map((student, idx) => {
                    const currentScore = rosterScores[student.id] || '';
                    const isPassed = currentScore !== '' && parseFloat(currentScore) >= 11;
                    const isFailed = currentScore !== '' && parseFloat(currentScore) < 11;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{student.dni}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{student.name}</td>
                        <td className="py-3 px-4 text-slate-500">{student.gradeOrClass}</td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            placeholder="0-20"
                            value={currentScore}
                            onChange={(e) =>
                              setRosterScores((prev) => ({ ...prev, [student.id]: e.target.value }))
                            }
                            className={`w-24 text-center font-mono font-black text-sm px-3 py-1.5 rounded-xl border focus:outline-none transition ${
                              isPassed
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 focus:ring-2 focus:ring-emerald-200'
                                : isFailed
                                ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-200'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-burgundy-700'
                            }`}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Comentario opcional..."
                            value={rosterFeedbacks[student.id] || ''}
                            onChange={(e) =>
                              setRosterFeedbacks((prev) => ({ ...prev, [student.id]: e.target.value }))
                            }
                            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {studentsInSelection.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">
                {Object.keys(rosterScores).filter((k) => rosterScores[k] !== '').length} de{' '}
                {studentsInSelection.length} alumnos con nota ingresada
              </span>
              <button
                onClick={handleSaveRosterGrades}
                disabled={savingRoster}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingRoster ? 'Guardando...' : 'Guardar Planilla de Notas'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA B: CARGA DESDE EXCEL / PEGAR TEXTO               */}
      {/* ======================================================== */}
      {teacherViewTab === 'excel' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded">
                Importador Masivo de Notas
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Carga Masiva de Notas desde Excel / Archivo CSV
              </h3>
              <p className="text-xs text-slate-500">
                Descarga la plantilla oficial, ábrela en Excel, llena las notas y pega o sube el archivo.
              </p>
            </div>

            <button
              onClick={handleDownloadExcelTemplate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla Excel (.csv)</span>
            </button>
          </div>

          {/* Configuración de la Evaluación a Registrar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Curso para estas notas *
              </label>
              <select
                value={excelCourse}
                onChange={(e) => setExcelCourse(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
              >
                {coursesForCurrentGrade.map((c) => (
                  <option key={c.id} value={c.courseName}>
                    {c.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Tipo de Evaluación *
              </label>
              <select
                value={excelEvalType}
                onChange={(e) => setExcelEvalType(e.target.value as any)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800"
              >
                <option value="PRACTICA">Práctica Calificada</option>
                <option value="EXAMEN_PARCIAL">Examen Mensual / Parcial</option>
                <option value="EXAMEN_FINAL">Examen Bimestral</option>
                <option value="TAREA">Tarea / Trabajo Escolar</option>
                <option value="SIMULACRO">Simulacro Tipo Admisión</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Título de la Evaluación *
              </label>
              <input
                type="text"
                placeholder="Ej: Examen Bimestral I"
                value={excelEvalTitle}
                onChange={(e) => setExcelEvalTitle(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white"
              />
            </div>
          </div>

          {/* Zona de Pegar o Subir Archivo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Pega aquí las celdas de Excel (DNI [Tab] Nombre [Tab] Nota) o sube el .csv:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-burgundy-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo .csv</span>
                </button>
                {excelPasteText && (
                  <button
                    type="button"
                    onClick={() => setExcelPasteText('')}
                    className="text-xs font-bold text-rose-600 hover:underline px-2"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              placeholder={`Ejemplo de copiado directo desde Excel:\n71234561\tJuan Pérez Gómez\t18.5\tExcelente resolución\n71234562\tMaría Rodríguez\t16\tBuen desempeño`}
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              className="w-full font-mono text-xs p-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-100 bg-slate-50/50"
            />
          </div>

          {/* Previsualización y Validación de Datos */}
          {parsedExcelRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Previsualización y Validación ({parsedExcelRows.length} filas detectadas)
                </h4>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ {parsedExcelRows.filter((r) => r.valid).length} válidas
                  </span>
                  {parsedExcelRows.some((r) => !r.valid) && (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      ⚠ {parsedExcelRows.filter((r) => !r.valid).length} con error
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">DNI</th>
                      <th className="py-2.5 px-3">Alumno en Whitman</th>
                      <th className="py-2.5 px-3">Nota</th>
                      <th className="py-2.5 px-3">Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedExcelRows.map((row, i) => (
                      <tr key={i} className={row.valid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="py-2 px-3">
                          {row.valid ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Válido
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]" title={row.error}>
                              <AlertCircle className="w-3.5 h-3.5" /> {row.error}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold">{row.dni}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                        <td className="py-2 px-3 font-mono font-black">{row.score !== null ? row.score : '—'}</td>
                        <td className="py-2 px-3 text-slate-500 italic truncate max-w-xs">{row.feedback || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveExcelImport}
                  disabled={excelSaving || !parsedExcelRows.some((r) => r.valid)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {excelSaving
                      ? 'Procesando en Neon DB...'
                      : `Registrar ${parsedExcelRows.filter((r) => r.valid).length} Notas Validadas`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA C: TARJETAS DE CURSOS Y CALIFICACIONES (ACTUAL)  */}
      {/* ======================================================== */}
      {teacherViewTab === 'cursos' && (
        <>
          {coursesForCurrentGrade.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
              <BookMarked className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-800 text-base">
                No hay cursos creados para "{selectedGrade || 'este grado'}"
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Cada grado debe tener sus propios cursos asignados (ej: Matemática, Comunicación, Ciencia y Tecnología).
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
                  const courseGrades = grades.filter((g) => {
                    if (g.course.trim().toLowerCase() !== crs.courseName.trim().toLowerCase()) return false;
                    const { grade, section } = extractGradeAndSection(g.gradeOrClass);
                    if (grade.toLowerCase() !== selectedGrade.toLowerCase()) return false;
                    if (selectedSection !== 'TODAS' && section.toLowerCase() !== selectedSection.toLowerCase()) {
                      return false;
                    }
                    if (selectedPeriod !== 'TODOS' && g.period && g.period !== selectedPeriod) {
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
                              {crs.teacherName ? `Profesor(a): ${crs.teacherName}` : 'Profesor(a) por asignar'}
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
                            Sin calificaciones registradas para {selectedSection === 'TODAS' ? 'este grado' : `la sección ${selectedSection}`}{' '}
                            en {selectedPeriod}.
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

                                  {/* Botón de Edición Rápida (Lápiz) */}
                                  <button
                                    onClick={() => handleOpenEdit(g)}
                                    className="text-slate-400 hover:text-burgundy-900 p-1 transition rounded hover:bg-slate-200"
                                    title="Editar nota y comentario"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteGrade(g.id, g.title)}
                                    className="text-slate-300 hover:text-rose-600 p-1 transition rounded hover:bg-rose-50"
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
                        <span>{courseGrades.length} evaluación(es) registradas</span>
                        <span>{selectedGrade}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REGISTRAR CALIFICACIÓN INDIVIDUAL               */}
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

              {/* Selección del Alumno */}
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
      {/* MODAL 2: EDICIÓN DIRECTA / CORRECCIÓN DE NOTA            */}
      {/* ======================================================== */}
      {editingGrade && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-850 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-lionGold-400" />
                <h3 className="font-bold text-base">Modificar Calificación</h3>
              </div>
              <button
                onClick={() => setEditingGrade(null)}
                className="text-burgundy-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Estudiante</span>
                <p className="text-sm font-black text-slate-900">{editingGrade.userName}</p>
                <p className="text-xs text-slate-500">{editingGrade.course} • DNI: {editingGrade.userDni}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Título de la Evaluación *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    className="w-full text-sm font-mono font-black border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-burgundy-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Periodo Escolar
                  </label>
                  <select
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                  >
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observación / Retroalimentación
                </label>
                <input
                  type="text"
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  placeholder="Comentario sobre la nota..."
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-burgundy-900 hover:bg-burgundy-850 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingEdit ? 'Actualizando...' : 'Guardar Corrección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREAR CURSO PARA ESTE GRADO                     */}
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
                  placeholder="Ej: Álgebra, Comunicación, Inglés, etc."
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Profesor(a) Responsable (Opcional)
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
