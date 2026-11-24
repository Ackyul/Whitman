'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GradeRecord, User, UserRole, EvaluationType, Course, AcademicClass } from '../types';
import {
  BookOpen,
  PlusCircle,
  Search,
  Award,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Edit2,
  Save,
  Check,
  AlertCircle,
  ClipboardList,
  Layers,
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

const COLEGIO_PERIODS = [
  'Bimestre I',
  'Bimestre II',
  'Bimestre III',
  'Bimestre IV',
];

const ACADEMIA_PERIODS = [
  'Examen Ranking 1',
  'Examen Ranking 2',
  'Examen Ranking 3',
  'Examen Ranking 4',
  'Examen Ranking 5',
  'Examen Ranking 6',
  'Simulacro General',
];

export const GradesManager: React.FC<GradesManagerProps> = ({
  grades,
  students,
  currentRole,
  currentUser,
  linkedStudents = [],
  onRefresh,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicGrades, setAcademicGrades] = useState<Array<{ id: string; name: string; level: string }>>([]);
  const [academicClasses, setAcademicClasses] = useState<AcademicClass[]>([]);

  // Pestaña activa: 'planilla' | 'excel' | 'cursos'
  const [teacherViewTab, setTeacherViewTab] = useState<'planilla' | 'excel' | 'cursos'>('planilla');

  // Filtros
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('TODAS');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Selector para Padre
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<string>('');

  // Modales
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);

  // Formulario Individual
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [modalCourse, setModalCourse] = useState('');
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [score, setScore] = useState('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('PRACTICA');
  const [feedback, setFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Formulario Edición
  const [editScore, setEditScore] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Planilla Rápida
  const [rosterCourse, setRosterCourse] = useState('');
  const [rosterEvalType, setRosterEvalType] = useState<EvaluationType>('PRACTICA');
  const [rosterEvalTitle, setRosterEvalTitle] = useState('');
  const [rosterScores, setRosterScores] = useState<Record<string, string>>({});
  const [rosterFeedbacks, setRosterFeedbacks] = useState<Record<string, string>>({});
  const [savingRoster, setSavingRoster] = useState(false);

  // Excel
  const [excelPasteText, setExcelPasteText] = useState('');
  const [excelCourse, setExcelCourse] = useState('');
  const [excelEvalType, setExcelEvalType] = useState<EvaluationType>('PRACTICA');
  const [excelEvalTitle, setExcelEvalTitle] = useState('');
  const [excelSaving, setExcelSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nuevo Curso
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTeacher, setNewCourseTeacher] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  const loadAcademicStructure = async () => {
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
    }
  };

  useEffect(() => {
    loadAcademicStructure();
  }, []);

  const extractGradeAndSection = (gradeOrClass?: string) => {
    if (!gradeOrClass) return { grade: '', section: '' };
    const parts = gradeOrClass.split(' - ');
    return {
      grade: parts[0]?.trim() || '',
      section: parts[1]?.trim() || '',
    };
  };

  const activeStudent = useMemo(() => {
    if (currentRole === 'ALUMNO') return currentUser;
    if (currentRole === 'PADRE') {
      if (selectedStudentForParent) {
        return linkedStudents.find((s) => s.id === selectedStudentForParent) || linkedStudents[0] || null;
      }
      return linkedStudents[0] || null;
    }
    return null;
  }, [currentRole, currentUser, linkedStudents, selectedStudentForParent]);

  const isAcademiaMode = useMemo(() => {
    if (currentRole === 'ALUMNO' || currentRole === 'PADRE') {
      const gr = activeStudent?.gradeOrClass?.toUpperCase() || '';
      return gr.includes('ACADEMIA') || gr.includes('UNSA') || gr.includes('CICLO') || activeStudent?.level === 'ACADEMIA' || true;
    }
    const currentGradeObj = academicGrades.find((g) => g.name === selectedGrade);
    const lvl = currentGradeObj?.level?.toUpperCase() || '';
    const gName = selectedGrade?.toUpperCase() || '';
    return lvl.includes('ACADEMIA') || gName.includes('ACADEMIA') || gName.includes('UNSA') || gName.includes('CICLO');
  }, [currentRole, activeStudent, academicGrades, selectedGrade]);

  const activePeriods = isAcademiaMode ? ACADEMIA_PERIODS : COLEGIO_PERIODS;

  const availableSections = useMemo(() => {
    if (!selectedGrade) return [];
    const classesOfGrade = academicClasses.filter(
      (c) => c.grade.trim().toLowerCase() === selectedGrade.trim().toLowerCase()
    );
    const sections = classesOfGrade.map((c) => c.section.trim());
    return Array.from(new Set(sections));
  }, [selectedGrade, academicClasses]);

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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !selectedGrade) return;

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

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`¿Eliminar el curso "${courseName}"?`)) return;
    try {
      await deleteCourseApi(courseId);
      await loadAcademicStructure();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar curso');
    }
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !modalCourse || !evaluationTitle.trim() || score === '') {
      alert('Completa todos los campos obligatorios.');
      return;
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 20) {
      alert('La nota debe ser de 0 a 20.');
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
        period: selectedPeriod === 'TODOS' ? activePeriods[0] : selectedPeriod,
        teacherName: currentUser?.name || 'Docente Whitman',
        feedback: feedback.trim(),
      });

      setScore('');
      setEvaluationTitle('');
      setFeedback('');
      setShowGradeModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleSaveRosterGrades = async () => {
    if (!rosterCourse) {
      alert('Selecciona un curso.');
      return;
    }
    const title = rosterEvalTitle.trim() || `${rosterEvalType} - ${new Date().toLocaleDateString('es-PE')}`;

    const gradesToSubmit: any[] = [];
    for (const student of studentsInSelection) {
      const val = rosterScores[student.id];
      if (val !== undefined && val !== '') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 20) {
          alert(`Nota inválida para ${student.name}`);
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
          period: selectedPeriod === 'TODOS' ? activePeriods[0] : selectedPeriod,
          teacherName: currentUser?.name || 'Docente Whitman',
          feedback: rosterFeedbacks[student.id] || '',
        });
      }
    }

    if (gradesToSubmit.length === 0) {
      alert('Ingresa al menos una nota.');
      return;
    }

    setSavingRoster(true);
    try {
      const res = await createGradesBulk(gradesToSubmit);
      alert(res.message || '¡Notas guardadas!');
      setRosterScores({});
      setRosterFeedbacks({});
      setRosterEvalTitle('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar notas');
    } finally {
      setSavingRoster(false);
    }
  };

  const handleDownloadExcelTemplate = () => {
    const headers = ['DNI', 'Nombre', 'Nota', 'Observacion'];
    const rows =
      studentsInSelection.length > 0
        ? studentsInSelection.map((s) => [s.dni, `"${s.name.replace(/"/g, '""')}"`, '', ''])
        : [
            ['71234561', '"Juan Pérez"', '18', ''],
            ['71234562', '"María Gómez"', '16', ''],
          ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSection = selectedSection.replace(/\s+/g, '_');
    const cleanGrade = selectedGrade.replace(/\s+/g, '_');
    link.setAttribute('download', `Plantilla_${cleanGrade}_${cleanSection}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      if (i === 0 && (line.toLowerCase().includes('dni') || line.toLowerCase().includes('nombre') || line.toLowerCase().includes('nota'))) {
        continue;
      }

      let parts: string[] = [];
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes(';')) parts = line.split(';');
      else parts = line.split(',');

      const rawDni = String(parts[0] || '').replace(/["']/g, '').trim();
      const rawName = String(parts[1] || '').replace(/["']/g, '').trim();
      const rawScore = String(parts[2] || '').replace(/["']/g, '').trim();
      const rawFeedback = String(parts[3] || '').replace(/["']/g, '').trim();

      if (!rawDni) continue;

      const foundStudent = students.find((s) => s.dni.trim() === rawDni);
      let scoreNum: number | null = null;
      let valid = true;
      let error = '';

      if (rawScore !== '') {
        scoreNum = parseFloat(rawScore);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 20) {
          valid = false;
          error = 'Nota inválida (0-20)';
        }
      } else {
        valid = false;
        error = 'Falta nota';
      }

      if (!foundStudent) {
        valid = false;
        error = 'DNI no encontrado';
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

  const handleSaveExcelImport = async () => {
    if (!excelCourse) {
      alert('Selecciona un curso.');
      return;
    }

    const validRows = parsedExcelRows.filter((r) => r.valid && r.studentObj && r.score !== null);
    if (validRows.length === 0) {
      alert('No hay filas válidas.');
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
      period: selectedPeriod === 'TODOS' ? activePeriods[0] : selectedPeriod,
      teacherName: currentUser?.name || 'Docente Whitman',
      feedback: r.feedback || '',
    }));

    setExcelSaving(true);
    try {
      const res = await createGradesBulk(bulkPayload);
      alert(res.message || '¡Notas registradas!');
      setExcelPasteText('');
      setExcelEvalTitle('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar notas');
    } finally {
      setExcelSaving(false);
    }
  };

  const handleOpenEdit = (grade: GradeRecord) => {
    setEditingGrade(grade);
    setEditScore(String(grade.score));
    setEditTitle(grade.title);
    setEditFeedback(grade.feedback || '');
    setEditPeriod(grade.period || (selectedPeriod === 'TODOS' ? activePeriods[0] : selectedPeriod));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    const num = parseFloat(editScore);
    if (isNaN(num) || num < 0 || num > 20) {
      alert('La nota debe ser de 0 a 20.');
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
      alert(err.message || 'Error al actualizar');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteGrade = async (gradeId: string, title: string) => {
    if (!confirm(`¿Eliminar la calificación "${title}"?`)) return;
    try {
      await deleteGradeApi(gradeId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const getScoreBadge = (val: number) => {
    const color =
      val >= 14
        ? 'bg-blue-50 text-blue-800 border-blue-200'
        : val >= 11
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';

    return (
      <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs border ${color}`}>
        {val.toFixed(1)} / 20
      </span>
    );
  };

  // ==========================================
  // VISTA 1: ALUMNO O APODERADO
  // ==========================================
  if (currentRole === 'ALUMNO' || currentRole === 'PADRE') {
    const studentInfo = activeStudent;
    const { grade: studentGrade, section: studentSection } = extractGradeAndSection(
      studentInfo?.gradeOrClass
    );

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
      <div className="space-y-5">
        {currentRole === 'PADRE' && linkedStudents.length > 1 && (
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500">Hijo(a):</span>
            {linkedStudents.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedStudentForParent(child.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  studentInfo?.id === child.id
                    ? 'bg-burgundy-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {/* Tarjeta de Resumen */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {studentInfo?.name || 'Estudiante Whitman'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {studentGrade || 'Grado pendiente'} • {studentSection || 'Sin aula'} • DNI: {studentInfo?.dni}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800 rounded-xl px-3 py-2"
            >
              <option value="TODOS">
                {isAcademiaMode ? 'Todos los Exámenes Ranking' : 'Todos los Periodos'}
              </option>
              {activePeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <div className="bg-burgundy-900 text-white px-4 py-2 rounded-xl text-right">
              <span className="text-xs text-lionGold-400 font-bold uppercase block">Promedio</span>
              <span className="text-lg font-black">
                {overallAverage ? `${overallAverage} / 20` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Cursos */}
        {coursesForCurrentGrade.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400">
            <p className="text-sm font-bold">No hay cursos registrados para este grado.</p>
          </div>
        ) : (
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
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{crs.courseName}</h4>
                      {crs.teacherName && (
                        <p className="text-xs text-slate-400">Prof. {crs.teacherName}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-burgundy-900">
                      Promedio: {courseAvg ? `${courseAvg} / 20` : '—'}
                    </span>
                  </div>

                  {courseEvals.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Sin notas registradas</p>
                  ) : (
                    <div className="space-y-1.5">
                      {courseEvals.map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-slate-50 p-2 rounded-xl flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{ev.title}</span>
                            <span className="text-slate-400 ml-2">({ev.evaluationType})</span>
                          </div>
                          <div>{getScoreBadge(ev.score)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA 2: DOCENTE / DIRECTOR / ADMIN
  // ==========================================
  return (
    <div className="space-y-5">
      {/* Controles Principales */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-burgundy-800" />
            <span>Calificaciones Whitman</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExcelTemplate}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Plantilla Excel</span>
            </button>

            <button
              onClick={() => setShowCourseModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nuevo Curso</span>
            </button>

            <button
              onClick={() => {
                if (coursesForCurrentGrade.length > 0) {
                  setModalCourse(coursesForCurrentGrade[0].courseName);
                }
                setShowGradeModal(true);
              }}
              className="bg-burgundy-900 hover:bg-burgundy-850 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Award className="w-3.5 h-3.5 text-lionGold-400" />
              <span>Calificar Alumno</span>
            </button>
          </div>
        </div>

        {/* Selectores */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Grado</label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedSection('TODAS');
              }}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
            >
              {academicGrades.map((g) => (
                <option key={g.id} value={g.name}>{g.name} ({g.level})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Aula / Sección</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
            >
              <option value="TODAS">Todas las secciones</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
              <option value="Sin Asignar">Sin Asignar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {isAcademiaMode ? 'Examen Ranking' : 'Periodo'}
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-burgundy-900"
            >
              <option value="TODOS">
                {isAcademiaMode ? 'Todos los Exámenes Ranking' : 'Todos los Periodos'}
              </option>
              {activePeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Buscar Alumno</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nombre o tema..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Pestañas de Vista */}
        <div className="flex border-b border-slate-200 gap-6 pt-1 text-xs font-bold">
          <button
            onClick={() => setTeacherViewTab('planilla')}
            className={`pb-2 flex items-center gap-1.5 border-b-2 transition ${
              teacherViewTab === 'planilla'
                ? 'border-burgundy-900 text-burgundy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Planilla por Aula</span>
          </button>

          <button
            onClick={() => setTeacherViewTab('excel')}
            className={`pb-2 flex items-center gap-1.5 border-b-2 transition ${
              teacherViewTab === 'excel'
                ? 'border-burgundy-900 text-burgundy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Cargar desde Excel</span>
          </button>

          <button
            onClick={() => setTeacherViewTab('cursos')}
            className={`pb-2 flex items-center gap-1.5 border-b-2 transition ${
              teacherViewTab === 'cursos'
                ? 'border-burgundy-900 text-burgundy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Cursos y Notas</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA A: PLANILLA RÁPIDA POR AULA */}
      {teacherViewTab === 'planilla' && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Planilla: {selectedGrade} ({selectedSection})
              </h3>
              <p className="text-xs text-slate-500">Ingresa notas directamente en la tabla y guarda en lote.</p>
            </div>

            <button
              onClick={handleSaveRosterGrades}
              disabled={savingRoster || studentsInSelection.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingRoster ? 'Guardando...' : 'Guardar Notas'}</span>
            </button>
          </div>

          {/* Configuración rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Curso *</label>
              <select
                value={rosterCourse}
                onChange={(e) => setRosterCourse(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white"
              >
                {coursesForCurrentGrade.map((c) => (
                  <option key={c.id} value={c.courseName}>{c.courseName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Evaluación *</label>
              <select
                value={rosterEvalType}
                onChange={(e) => setRosterEvalType(e.target.value as any)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white"
              >
                <option value="PRACTICA">Práctica Calificada</option>
                <option value="EXAMEN_PARCIAL">Examen Mensual</option>
                <option value="EXAMEN_FINAL">Examen Bimestral</option>
                <option value="TAREA">Tarea / Trabajo</option>
                <option value="SIMULACRO">Simulacro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tema / Título *</label>
              <input
                type="text"
                placeholder="Ej: Práctica de Polinomios"
                value={rosterEvalTitle}
                onChange={(e) => setRosterEvalTitle(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
              />
            </div>
          </div>

          {/* Tabla de Alumnos */}
          {studentsInSelection.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No hay alumnos en esta sección.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">DNI</th>
                    <th className="py-2.5 px-3">Alumno</th>
                    <th className="py-2.5 px-3 w-28">Nota (0-20)</th>
                    <th className="py-2.5 px-3">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsInSelection.map((student, idx) => {
                    const currentScore = rosterScores[student.id] || '';
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{student.dni}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{student.name}</td>
                        <td className="py-2.5 px-3">
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
                            className="w-20 text-center font-mono font-bold text-sm px-2 py-1 rounded-lg border border-slate-300 focus:border-burgundy-700 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Comentario opcional..."
                            value={rosterFeedbacks[student.id] || ''}
                            onChange={(e) =>
                              setRosterFeedbacks((prev) => ({ ...prev, [student.id]: e.target.value }))
                            }
                            className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA B: CARGA DESDE EXCEL */}
      {teacherViewTab === 'excel' && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Carga desde Excel</h3>
              <p className="text-xs text-slate-500">Pega los datos copiados de Excel o sube tu archivo CSV.</p>
            </div>

            <button
              onClick={handleDownloadExcelTemplate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla (.csv)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Curso *</label>
              <select
                value={excelCourse}
                onChange={(e) => setExcelCourse(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white"
              >
                {coursesForCurrentGrade.map((c) => (
                  <option key={c.id} value={c.courseName}>{c.courseName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Evaluación *</label>
              <select
                value={excelEvalType}
                onChange={(e) => setExcelEvalType(e.target.value as any)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white"
              >
                <option value="PRACTICA">Práctica Calificada</option>
                <option value="EXAMEN_PARCIAL">Examen Mensual</option>
                <option value="EXAMEN_FINAL">Examen Bimestral</option>
                <option value="TAREA">Tarea</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Título *</label>
              <input
                type="text"
                placeholder="Ej: Examen Bimestral"
                value={excelEvalTitle}
                onChange={(e) => setExcelEvalTitle(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Pega aquí las celdas (DNI [Tab] Nombre [Tab] Nota):</label>
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
                  className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo .csv</span>
                </button>
                {excelPasteText && (
                  <button
                    type="button"
                    onClick={() => setExcelPasteText('')}
                    className="text-xs text-rose-600 hover:underline px-1"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="71234561	Juan Pérez	18.5	Buen examen&#10;71234562	María Gómez	16	"
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50"
            />
          </div>

          {parsedExcelRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{parsedExcelRows.filter((r) => r.valid).length} notas válidas para registrar</span>
                <button
                  onClick={handleSaveExcelImport}
                  disabled={excelSaving || !parsedExcelRows.some((r) => r.valid)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Notas Validadas</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA C: CURSOS */}
      {teacherViewTab === 'cursos' && (
        <div className="space-y-4">
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
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{crs.courseName}</h4>
                      {crs.teacherName && (
                        <p className="text-xs text-slate-400">Prof. {crs.teacherName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setModalCourse(crs.courseName);
                          setShowGradeModal(true);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg"
                      >
                        + Calificar
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(crs.id, crs.courseName)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Eliminar curso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {courseGrades.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center italic">Sin calificaciones</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {courseGrades.map((g) => (
                        <div
                          key={g.id}
                          className="bg-slate-50 p-2 rounded-xl flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{g.userName}</p>
                            <p className="text-slate-400 truncate text-[11px]">{g.title}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getScoreBadge(g.score)}
                            <button
                              onClick={() => handleOpenEdit(g)}
                              className="text-slate-400 hover:text-slate-800 p-1"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteGrade(g.id, g.title)}
                              className="text-slate-300 hover:text-rose-600 p-1"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Individual */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-5 space-y-3 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Registrar Calificación</h3>

            <form onSubmit={handleSubmitGrade} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Curso</label>
                <select
                  value={modalCourse}
                  onChange={(e) => setModalCourse(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  {coursesForCurrentGrade.map((c) => (
                    <option key={c.id} value={c.courseName}>{c.courseName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Alumno</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">Selecciona alumno...</option>
                  {studentsInSelection.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} - DNI: {s.dni}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Evaluación</label>
                  <select
                    value={evaluationType}
                    onChange={(e) => setEvaluationType(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="PRACTICA">Práctica</option>
                    <option value="EXAMEN_PARCIAL">Examen</option>
                    <option value="TAREA">Tarea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nota (0-20)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    required
                    placeholder="0-20"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Práctica de Funciones"
                  value={evaluationTitle}
                  onChange={(e) => setEvaluationTitle(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="bg-burgundy-900 text-white font-bold px-4 py-1.5 rounded-xl text-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edición Directa */}
      {editingGrade && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-5 space-y-3 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Modificar Nota</h3>
            <p className="text-xs text-slate-600 font-semibold">{editingGrade.userName} - {editingGrade.course}</p>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nota (0-20)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    required
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {isAcademiaMode ? 'Examen Ranking' : 'Periodo'}
                  </label>
                  <select
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    {activePeriods.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-burgundy-900 text-white font-bold px-4 py-1.5 rounded-xl text-xs"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Curso */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-5 space-y-3 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Nuevo Curso en {selectedGrade}</h3>

            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Curso</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Álgebra"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Profesor(a) (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Lic. Carlos Morales"
                  value={newCourseTeacher}
                  onChange={(e) => setNewCourseTeacher(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  className="bg-burgundy-900 text-white font-bold px-4 py-1.5 rounded-xl text-xs"
                >
                  Crear Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
