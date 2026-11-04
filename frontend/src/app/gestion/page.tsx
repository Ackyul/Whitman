'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import {
  fetchAcademicClasses,
  fetchAcademicGradesApi,
  createAcademicGradeApi,
  deleteAcademicGradeApi,
  enrollStudentApi,
  bulkEnrollStudentsApi,
  createStaffApi,
  createAcademicClassApi,
  deleteAcademicClassApi,
  moveStudentClassApi,
  autoBalanceStudentsApi,
} from '../../lib/api';
import { AcademicClass, EducationLevel, HierarchyLevel, User } from '../../types';
import {
  GraduationCap,
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building,
  Check,
  Lock,
  ShieldCheck,
  Layers,
  Sparkles,
  Shuffle,
  Plus,
  Trash2,
  ArrowRightLeft,
  School,
  Clock,
  ArrowRight,
  LogOut,
} from 'lucide-react';

interface GoogleAdminProfile {
  email: string;
  name: string;
  picture?: string;
}

const BASE_GRADES_BY_LEVEL: Record<'PRIMARIA' | 'SECUNDARIA', string[]> = {
  PRIMARIA: [
    '1ro Primaria',
    '2do Primaria',
    '3ro Primaria',
    '4to Primaria',
    '5to Primaria',
    '6to Primaria',
  ],
  SECUNDARIA: [
    '1ro Secundaria',
    '2do Secundaria',
    '3ro Secundaria',
    '4to Secundaria',
    '5to Secundaria',
  ],
};

export default function GestionAcademicaPage() {
  const { users, refreshData } = useWhitman();
  const [activeTab, setActiveTab] = useState<'individual' | 'classes' | 'staff' | 'bulk'>('individual');

  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- SEGURIDAD CON GOOGLE (ACCESO EXCLUSIVO PARA EL DIRECTOR) ---
  const AUTHORIZED_ADMIN_EMAIL = '949237217yoshua@gmail.com';

  const [googleAdmin, setGoogleAdmin] = useState<GoogleAdminProfile | null>(null);
  const [googleClientId] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '213494948984-lb44lfqtdpujebr0osd34dgjmdq46c5l.apps.googleusercontent.com'
  );
  const [googleBtnRendered, setGoogleBtnRendered] = useState(false);

  // Cargar sesión de Google guardada
  useEffect(() => {
    try {
      const savedGoogle = localStorage.getItem('whitman_google_admin_session');
      if (savedGoogle) {
        const parsed = JSON.parse(savedGoogle);
        if (parsed?.email && parsed.email.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL) {
          setGoogleAdmin(parsed);
        } else {
          localStorage.removeItem('whitman_google_admin_session');
        }
      }
    } catch (e) {
      console.warn('Error al leer sesión de Google:', e);
    }
  }, []);

  // Cargar Google GSI e inicializar renderButton y prompt
  useEffect(() => {
    if (googleAdmin) return;

    let isMounted = true;

    const setupGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return false;

      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        const container = document.getElementById('googleSignInBtnContainer');
        if (container) {
          container.innerHTML = '';
          google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 280,
          });
          if (isMounted) setGoogleBtnRendered(true);
        }

        try {
          google.accounts.id.prompt();
        } catch {}

        return true;
      } catch (e) {
        console.warn('Error inicializando Google Auth:', e);
        return false;
      }
    };

    if (setupGoogle()) return;

    // Si aún no está window.google, cargar el script
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    script.onload = () => {
      setupGoogle();
    };

    const interval = setInterval(() => {
      if (setupGoogle()) {
        clearInterval(interval);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [googleAdmin, googleClientId]);

  const handleCustomGoogleLogin = () => {
    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const info = await res.json();
                const email = (info.email || '').toLowerCase().trim();
                if (email !== AUTHORIZED_ADMIN_EMAIL) {
                  notify('error', '⛔ Acceso denegado: Esta cuenta de Google no está autorizada para la gestión académica.');
                  return;
                }
                const profile: GoogleAdminProfile = {
                  email: info.email,
                  name: info.name || 'Director General',
                  picture: info.picture,
                };
                setGoogleAdmin(profile);
                localStorage.setItem('whitman_google_admin_session', JSON.stringify(profile));
                notify('success', `¡Bienvenido Director! Acceso verificado.`);
              } catch (err: any) {
                notify('error', 'Error al obtener datos de Google.');
              }
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('Token client error:', err);
      }
    }

    if (google?.accounts?.id) {
      google.accounts.id.prompt();
    } else {
      notify('error', 'Cargando servicio de Google... Intenta de nuevo en unos segundos.');
    }
  };

  const handleGoogleCredentialResponse = (response: any) => {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const email = (payload.email || '').toLowerCase().trim();

      if (email !== AUTHORIZED_ADMIN_EMAIL) {
        notify(
          'error',
          '⛔ Acceso denegado: Esta cuenta de Google no está autorizada para la gestión académica.'
        );
        return;
      }

      const profile: GoogleAdminProfile = {
        email: payload.email,
        name: payload.name || payload.given_name || 'Director General',
        picture: payload.picture,
      };

      setGoogleAdmin(profile);
      localStorage.setItem('whitman_google_admin_session', JSON.stringify(profile));
      notify('success', `¡Bienvenido Director! Acceso verificado.`);
    } catch (err) {
      console.error('Error decodificando credencial de Google:', err);
      notify('error', 'Error al procesar la autenticación de Google.');
    }
  };

  const handleLogoutGoogle = () => {
    setGoogleAdmin(null);
    localStorage.removeItem('whitman_google_admin_session');
    notify('success', 'Sesión de seguridad de Google cerrada.');
  };

  // 1. Estado Formulario Alumno (Matrícula en Grado)
  const [studentForm, setStudentForm] = useState({
    dni: '',
    name: '',
    level: 'PRIMARIA' as EducationLevel,
    grade: '1ro Primaria',
    phone: '',
    // Datos de la Madre
    motherDni: '',
    motherName: '',
    motherPhone: '',
    // Datos del Padre
    fatherDni: '',
    fatherName: '',
    fatherPhone: '',
    // Apoderado Legal / Tutor
    hasSeparateGuardian: false,
    parentDni: '',
    parentName: '',
    parentPhone: '',
    parentRelationship: 'Tutor Legal',
  });
  const [lastEnrolledStudent, setLastEnrolledStudent] = useState<User | null>(null);

  // 2. Estado para pestaña de Grados y Aulas (Directo de Neon DB)
  const [gradesList, setGradesList] = useState<Array<{ id: string; name: string; level: string }>>([]);

  const [isCreatingGrade, setIsCreatingGrade] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState<'PRIMARIA' | 'SECUNDARIA'>('PRIMARIA');

  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'TODOS' | 'PRIMARIA' | 'SECUNDARIA'>('TODOS');
  const [selectedGrade, setSelectedGrade] = useState<string>('1ro Primaria');
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [redistributeAll, setRedistributeAll] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    section: '',
    shift: 'MAÑANA' as 'MAÑANA' | 'TARDE',
    capacity: 35,
    classroomNumber: '',
  });

  // 3. Estado Formulario Docente
  const [staffForm, setStaffForm] = useState({
    dni: '',
    name: '',
    email: '',
    hierarchy: 'PROFESOR' as HierarchyLevel,
    hierarchyTitle: 'Profesor de Aula',
    level: 'SECUNDARIA' as EducationLevel,
    gradeOrClass: 'Matemática y Ciencias',
    phone: '',
  });

  // 4. Estado Carga Masiva
  const [rawCsvText, setRawCsvText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<Array<any>>([]);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  // Cargar Grados dinámicos directamente desde Neon DB
  const loadGrades = async () => {
    try {
      const g = await fetchAcademicGradesApi();
      if (g) {
        const cleaned = g.filter((item) => item.level !== 'ACADEMIA');
        setGradesList(cleaned);
        if (cleaned.length > 0) {
          setSelectedGrade((prev) => {
            const exists = cleaned.some((x) => x.name === prev);
            return exists ? prev : cleaned[0].name;
          });
          setStudentForm((prev) => ({
            ...prev,
            grade: prev.grade || cleaned[0].name,
          }));
        }
      }
    } catch (e) {
      console.warn('Error cargando grados desde Neon:', e);
    }
  };

  // Cargar Aulas directamente desde Neon DB (Solo Colegio: Primaria y Secundaria)
  const loadAcademicClasses = async () => {
    try {
      const cls = await fetchAcademicClasses();
      if (cls) {
        const schoolClasses = cls.filter(
          (c) =>
            c.level !== 'ACADEMIA' &&
            !c.grade.toLowerCase().includes('pre') &&
            !c.grade.toLowerCase().includes('acad') &&
            !c.grade.toLowerCase().includes('repaso')
        );
        setClasses(schoolClasses);
      }
    } catch (e) {
      console.warn('Error cargando aulas desde Neon:', e);
    }
  };

  useEffect(() => {
    loadGrades();
    loadAcademicClasses();
  }, []);

  // --- CREAR GRADO EN NEON DB ---
  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newGradeName.trim();
    if (!cleanName) {
      notify('error', 'El nombre del grado es obligatorio (ej: Inicial 5 años, 1ro Primaria).');
      return;
    }
    setLoading(true);
    try {
      const res = await createAcademicGradeApi(cleanName, newGradeLevel);
      notify('success', res.message || `¡Grado "${cleanName}" creado correctamente!`);
      setIsCreatingGrade(false);
      setNewGradeName('');
      await loadGrades();
      setSelectedGrade(cleanName);
    } catch (err: any) {
      notify('error', err.message || 'Error al crear grado');
    } finally {
      setLoading(false);
    }
  };

  // --- ELIMINAR GRADO EN NEON DB ---
  const handleDeleteGrade = async (gradeNameToDelete: string) => {
    if (!confirm(`¿Estás seguro de eliminar el grado "${gradeNameToDelete}"? Esta acción borrará también sus aulas vacías.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await deleteAcademicGradeApi(undefined, gradeNameToDelete);
      notify('success', res.message || `Grado "${gradeNameToDelete}" eliminado.`);
      await loadGrades();
      await loadAcademicClasses();
      const remaining = gradesList.filter((g) => g.name !== gradeNameToDelete);
      if (remaining.length > 0) {
        setSelectedGrade(remaining[0].name);
      }
    } catch (err: any) {
      notify('error', err.message || 'Error al eliminar grado.');
    } finally {
      setLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5500);
  };

  // Helper para deducir el nivel de un grado (Colegio: Primaria o Secundaria)
  const getLevelForGrade = (gradeName: string): EducationLevel => {
    const lower = gradeName.toLowerCase();
    if (lower.includes('prim')) return 'PRIMARIA';
    return 'SECUNDARIA';
  };

  // --- MATRÍCULA INDIVIDUAL (Madre, Padre y/o Apoderado) ---
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasFamilyDni =
      studentForm.motherDni?.trim() ||
      studentForm.fatherDni?.trim() ||
      studentForm.parentDni?.trim();

    if (!studentForm.dni || !studentForm.name || !hasFamilyDni) {
      notify(
        'error',
        'El DNI del alumno, nombre y al menos un DNI familiar (Madre, Padre o Apoderado) son obligatorios.'
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...studentForm,
        gradeOrClass: `${studentForm.grade} - Sin Asignar`,
      };
      const res = await enrollStudentApi(payload);
      notify('success', `¡Matrícula exitosa! ${res.message || 'Alumno registrado en la base de datos'}`);
      if (res.data?.user) {
        setLastEnrolledStudent(res.data.user);
      }
      refreshData();
      setStudentForm((prev) => ({
        ...prev,
        dni: '',
        name: '',
        phone: '',
        motherDni: '',
        motherName: '',
        motherPhone: '',
        fatherDni: '',
        fatherName: '',
        fatherPhone: '',
        parentDni: '',
        parentName: '',
        parentPhone: '',
        hasSeparateGuardian: false,
      }));
    } catch (err: any) {
      notify('error', err.message || 'Error al matricular alumno');
    } finally {
      setLoading(false);
    }
  };

  // --- CREAR NUEVA AULA / SECCIÓN EN NEON ---
  const handleCreateNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.section.trim()) {
      notify('error', 'El nombre de la sección o aula es obligatorio (ej: Sección A, Alfa, Beta).');
      return;
    }

    setLoading(true);
    try {
      const lvl = getLevelForGrade(selectedGrade);
      const res = await createAcademicClassApi({
        grade: selectedGrade,
        section: newClassForm.section.trim(),
        name: `${selectedGrade} - ${newClassForm.section.trim()}`,
        level: lvl,
        shift: newClassForm.shift,
        capacity: Number(newClassForm.capacity) || 35,
        classroomNumber: newClassForm.classroomNumber.trim() || undefined,
      });

      notify('success', res.message || `¡Aula creada para ${selectedGrade}!`);
      setIsCreatingClass(false);
      setNewClassForm({
        section: '',
        shift: 'MAÑANA',
        capacity: 35,
        classroomNumber: '',
      });
      await loadAcademicClasses();
    } catch (err: any) {
      notify('error', err.message || 'Error al crear aula');
    } finally {
      setLoading(false);
    }
  };

  // --- ELIMINAR AULA ---
  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`¿Estás seguro de eliminar el aula "${className}"?`)) return;
    setLoading(true);
    try {
      await deleteAcademicClassApi(classId);
      notify('success', `Aula "${className}" eliminada.`);
      await loadAcademicClasses();
    } catch (err: any) {
      notify('error', err.message || 'Error al eliminar aula');
    } finally {
      setLoading(false);
    }
  };

  // --- MOVER ALUMNO A OTRA CLASE O SIN ASIGNAR ---
  const handleMoveStudent = async (studentId: string, studentName: string, newGradeOrClass: string) => {
    try {
      await moveStudentClassApi(studentId, newGradeOrClass);
      notify('success', `✓ ${studentName} asignado a: ${newGradeOrClass}`);
      refreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error al mover alumno');
    }
  };

  // --- MEZCLA / BALANCEO AUTOMÁTICO DE ALUMNOS ---
  const handleAutoBalance = async () => {
    const lvl = getLevelForGrade(selectedGrade);
    const classesForThisGrade = classes.filter(
      (c) => c.grade.toLowerCase() === selectedGrade.toLowerCase() && c.active !== false
    );

    if (classesForThisGrade.length === 0) {
      notify(
        'error',
        `No hay aulas creadas para ${selectedGrade}. Primero crea al menos 2 aulas (ej: Sección A y Sección B) con el botón "+ Crear Aula".`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await autoBalanceStudentsApi(selectedGrade, lvl, redistributeAll);
      notify('success', res.message || '¡Mezcla y balanceo completado con éxito!');
      refreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error al balancear aulas');
    } finally {
      setLoading(false);
    }
  };

  // --- CREAR DOCENTE ---
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.dni || !staffForm.name) {
      notify('error', 'DNI y Nombre son obligatorios para el personal.');
      return;
    }

    setLoading(true);
    try {
      const res = await createStaffApi(staffForm);
      notify('success', res.message || '¡Personal registrado exitosamente en Neon DB!');
      refreshData();
      setStaffForm({
        dni: '',
        name: '',
        email: '',
        hierarchy: 'PROFESOR',
        hierarchyTitle: 'Profesor de Aula',
        level: 'SECUNDARIA',
        gradeOrClass: 'Matemática y Ciencias',
        phone: '',
      });
    } catch (err: any) {
      notify('error', err.message || 'Error al registrar personal');
    } finally {
      setLoading(false);
    }
  };

  // --- PARSEAR CSV / EXCEL ---
  const handleParseCsv = (text: string) => {
    setRawCsvText(text);
    if (!text.trim()) {
      setParsedStudents([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/);
    const parsed: any[] = [];

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toUpperCase().includes('DNI')) return;

      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length >= 3) {
        const dni = parts[0];
        const name = parts[1];
        let levelRaw = (parts[2] || 'SECUNDARIA').toUpperCase();
        let level: EducationLevel = levelRaw.includes('PRIM') ? 'PRIMARIA' : 'SECUNDARIA';

        // Si no se especificó aula, o dice "Sin Asignar", se matricula como Sin Asignar
        let gradeOrClass = parts[3] || `${level === 'PRIMARIA' ? '1ro Primaria' : '1ro Secundaria'} - Sin Asignar`;
        if (gradeOrClass && !gradeOrClass.includes(' - ')) {
          gradeOrClass = `${gradeOrClass} - Sin Asignar`;
        }

        const parentDni = parts[4] || '40000000';
        const parentName = parts[5] || `Apoderado de ${name}`;
        const phone = parts[6] || '';
        const parentPhone = parts[7] || phone;

        parsed.push({
          dni,
          name,
          level,
          gradeOrClass,
          parentDni,
          parentName,
          phone,
          parentPhone,
        });
      }
    });

    setParsedStudents(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExecuteBulkEnroll = async () => {
    if (parsedStudents.length === 0) {
      notify('error', 'No hay registros válidos para importar.');
      return;
    }

    setLoading(true);
    setBulkStatus('Subiendo y matriculando alumnos en Neon PostgreSQL...');

    try {
      const res = await bulkEnrollStudentsApi(parsedStudents);
      notify('success', `🎉 ¡Éxito! ${res.enrolledCount} alumnos matriculados y sincronizados en la base de datos.`);
      setBulkStatus(`Completado: ${res.enrolledCount} alumnos matriculados.`);
      setParsedStudents([]);
      setRawCsvText('');
      refreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error en carga masiva.');
      setBulkStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'DNI,Nombre Completo,Nivel,Grado o Aula (Opcional),DNI Apoderado,Nombre Apoderado,Celular\n' +
      '78123001,Alonso Ramos Flores,PRIMARIA,3ro Primaria,40119901,Don Pedro Ramos,991001122\n' +
      '78123002,Mariana Salas Cuadros,PRIMARIA,3ro Primaria,40119902,Sra. Elena Cuadros,991001133\n' +
      '75123001,Bryan Mendoza Ortiz,SECUNDARIA,5to Secundaria - Alfa,40119903,Don Julio Mendoza,991001144\n' +
      '75123002,Andrea Carpio Luna,SECUNDARIA,3ro Secundaria,40119904,Sra. Sonia Luna,991001155\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Matricula_Whitman_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CÁLCULOS DINÁMICOS PARA LA PESTAÑA DE GRADOS Y AULAS (DESDE NEON DB)
  const filteredGrades = gradesList
    .filter((g) => {
      if (selectedLevelFilter === 'TODOS') return true;
      return g.level === selectedLevelFilter;
    })
    .map((g) => g.name);

  // Alumnos del grado seleccionado
  const studentsInSelectedGrade = users.filter((u) => {
    if (u.role !== 'ALUMNO') return false;
    const gOrC = (u.gradeOrClass || '').toLowerCase();
    const targetG = selectedGrade.toLowerCase();
    return gOrC.includes(targetG) || (u.level === getLevelForGrade(selectedGrade) && gOrC.includes('sin asignar'));
  });

  // Alumnos que están 'Sin Asignar'
  const unassignedStudents = studentsInSelectedGrade.filter((u) => {
    const gOrC = (u.gradeOrClass || '').toLowerCase();
    return gOrC.includes('sin asignar') || gOrC === selectedGrade.toLowerCase() || !gOrC.includes(' - ');
  });

  // Aulas activas de este grado
  const classesForSelectedGrade = classes.filter(
    (c) => c.grade.toLowerCase() === selectedGrade.toLowerCase() && c.active !== false
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. ENCABEZADO INSTITUCIONAL */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-3xl p-5 sm:p-7 shadow-xl border-2 border-lionGold-500/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-lionGold-500/20 text-lionGold-300 text-[10px] sm:text-xs font-black px-3 py-0.5 rounded-full border border-lionGold-400/30 mb-1">
            <span>SISTEMA DE GESTIÓN ACADÉMICA 2026</span>
            <span>•</span>
            <span className="text-emerald-400">● Base de Datos Neon PostgreSQL</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-serif tracking-tight">
            Gestión, Matrícula & Cuentas Whitman
          </h1>
          <p className="text-xs text-burgundy-200 mt-0.5 max-w-xl">
            Crea alumnos, organiza grados, configura secciones y realiza mezclas automáticas equitativas para las aulas.
          </p>
        </div>

        {googleAdmin ? (
          <div className="flex items-center gap-3 bg-burgundy-950/70 p-2.5 rounded-2xl border border-lionGold-500/40">
            {googleAdmin.picture ? (
              <img src={googleAdmin.picture} alt="Google Avatar" className="w-9 h-9 rounded-full border border-lionGold-400" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center text-xs">
                👤
              </div>
            )}
            <div className="text-left pr-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block">✓ VERIFICADO CON GOOGLE</span>
              <p className="text-xs font-bold text-white max-w-[180px] truncate">{googleAdmin.email}</p>
            </div>
            <button
              onClick={handleLogoutGoogle}
              title="Cerrar sesión de Google"
              className="p-1.5 text-burgundy-200 hover:text-white hover:bg-burgundy-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-burgundy-950/50 p-2.5 rounded-2xl border border-lionGold-500/20 text-xs text-lionGold-300">
            <Lock className="w-4 h-4 text-lionGold-400" />
            <span>Seguridad: Requiere cuenta autorizada</span>
          </div>
        )}
      </div>

      {/* NOTIFICACIÓN FLOTANTE */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* BLOQUEO DE SEGURIDAD SI NO ESTÁ AUTENTICADO CON GOOGLE */}
      {!googleAdmin ? (
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-burgundy-100 text-burgundy-900 flex items-center justify-center mx-auto border-2 border-burgundy-300">
            <Lock className="w-8 h-8 text-burgundy-800" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              ACCESO RESTRINGIDO A DIRECCIÓN
            </span>
            <h2 className="text-2xl font-black font-serif text-slate-900 mt-2">
              Gestión Académica Whitman
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Inicia sesión con tu cuenta oficial de Google para acceder a la matrícula y administración de cuentas.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center pt-2 w-full space-y-2">
            {/* Contenedor oficial para el botón de Google Identity Services */}
            <div id="googleSignInBtnContainer" className="flex justify-center w-full" />

            {/* Botón directo con icono de Google si el iframe de Google tarda en cargar */}
            {!googleBtnRendered && (
              <button
                type="button"
                onClick={handleCustomGoogleLogin}
                className="w-full max-w-[280px] py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-full shadow-sm flex items-center justify-center gap-3 transition text-sm hover:shadow active:scale-[0.98]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continuar con Google</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ACCESO PERMITIDO - MÓDULO ADMINISTRATIVO COMPLETO */
        <div className="space-y-6">

          {/* 2. PESTAÑAS DE NAVEGACIÓN (4 PESTAÑAS: MATRÍCULA, GRADOS Y AULAS, PERSONAL, CARGA MASIVA) */}
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'individual'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-4 h-4 text-lionGold-400" />
              <span>1. Matricular Alumno</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'classes'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4 text-lionGold-400" />
              <span>2. Grados, Aulas & Mezcla</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'staff'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building className="w-4 h-4 text-lionGold-400" />
              <span>3. Docente / Directivo</span>
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'bulk'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>4. Carga Masiva (Excel)</span>
            </button>
          </div>

          {/* TAB 1: MATRÍCULA INDIVIDUAL DE ALUMNO (AULA OPCIONAL) */}
          {activeTab === 'individual' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-serif font-black text-xl text-slate-900 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-burgundy-900" />
                    <span>Ficha de Matrícula de Alumno</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registra los datos del alumno y su grado escolar. La asignación de aulas se realiza desde la pestaña "Grados, Aulas & Mezcla".
                  </p>
                </div>

                <form onSubmit={handleEnrollStudent} className="space-y-6">
                  
                  {/* Sección Alumno */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-black uppercase text-burgundy-900 tracking-wider">
                      A. Datos del Alumno
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          DNI del Alumno *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          placeholder="Ej: 78912304"
                          value={studentForm.dni}
                          onChange={(e) => setStudentForm({ ...studentForm, dni: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm focus:outline-none focus:border-burgundy-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Nombres y Apellidos Completos *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Matías Salazar Vega"
                          value={studentForm.name}
                          onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-burgundy-700 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Nivel Educativo *
                        </label>
                        <select
                          value={studentForm.level}
                          onChange={(e) => {
                            const lvl = (e.target.value as 'PRIMARIA' | 'SECUNDARIA');
                            const gradesOfLvl = gradesList.filter((g) => g.level === lvl);
                            const firstGrade = gradesOfLvl[0]?.name || (lvl === 'PRIMARIA' ? '1ro Primaria' : '1ro Secundaria');
                            setStudentForm({
                              ...studentForm,
                              level: lvl,
                              grade: firstGrade,
                            });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                        >
                          <option value="PRIMARIA">🎒 Primaria</option>
                          <option value="SECUNDARIA">🏫 Secundaria</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Grado Escolar *
                        </label>
                        <select
                          value={studentForm.grade}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, grade: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                        >
                          {gradesList
                            .filter((g) => g.level === studentForm.level)
                            .map((g) => (
                              <option key={g.id || g.name} value={g.name}>
                                {g.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      💡 El alumno quedará registrado en su grado escolar. La asignación de aula y balanceo se realiza desde la pestaña <strong>"2. Grados, Aulas & Mezcla"</strong>.
                    </p>
                  </div>

                  {/* Sección Familiar */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-[11px] font-black uppercase text-burgundy-900 tracking-wider">
                        B. Datos Familiares (Acceso al Portal para Madre, Padre y Apoderado)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 w-fit">
                        ✓ Cada uno podrá ingresar con su propio DNI
                      </span>
                    </div>

                    {/* 1. Datos de la Madre */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase">
                        <span>👩 Datos de la Madre</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Recomendado para portal de notas)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">DNI de la Madre</label>
                          <input
                            type="text"
                            maxLength={8}
                            placeholder="Ej: 41011197"
                            value={studentForm.motherDni}
                            onChange={(e) => setStudentForm({ ...studentForm, motherDni: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombres de la Madre</label>
                          <input
                            type="text"
                            placeholder="Ej: Lizbeth Huaccoto"
                            value={studentForm.motherName}
                            onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Celular de la Madre</label>
                          <input
                            type="tel"
                            placeholder="+51 945572343"
                            value={studentForm.motherPhone}
                            onChange={(e) => setStudentForm({ ...studentForm, motherPhone: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Datos del Padre */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase">
                        <span>👨 Datos del Padre</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Recomendado para avisos de garita)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">DNI del Padre</label>
                          <input
                            type="text"
                            maxLength={8}
                            placeholder="Ej: 40998877"
                            value={studentForm.fatherDni}
                            onChange={(e) => setStudentForm({ ...studentForm, fatherDni: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombres del Padre</label>
                          <input
                            type="text"
                            placeholder="Ej: Don Pedro Salazar"
                            value={studentForm.fatherName}
                            onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Celular del Padre</label>
                          <input
                            type="tel"
                            placeholder="+51 987654321"
                            value={studentForm.fatherPhone}
                            onChange={(e) => setStudentForm({ ...studentForm, fatherPhone: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-burgundy-700"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Apoderado Separado / Tutor Legal Opcional */}
                    <div className="p-3.5 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={studentForm.hasSeparateGuardian}
                          onChange={(e) => setStudentForm({ ...studentForm, hasSeparateGuardian: e.target.checked })}
                          className="w-4 h-4 rounded text-burgundy-900 focus:ring-burgundy-500"
                        />
                        <span>¿El apoderado legal es otra persona? (Tutor, Abuelo/a o Tío/a)</span>
                      </label>

                      {studentForm.hasSeparateGuardian && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Parentesco</label>
                            <input
                              type="text"
                              placeholder="Ej: Tía Legal"
                              value={studentForm.parentRelationship}
                              onChange={(e) => setStudentForm({ ...studentForm, parentRelationship: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">DNI Apoderado</label>
                            <input
                              type="text"
                              maxLength={8}
                              placeholder="Ej: 42001122"
                              value={studentForm.parentDni}
                              onChange={(e) => setStudentForm({ ...studentForm, parentDni: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo</label>
                            <input
                              type="text"
                              placeholder="Ej: Rosa Huaccoto"
                              value={studentForm.parentName}
                              onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Celular</label>
                            <input
                              type="tel"
                              placeholder="+51 977889900"
                              value={studentForm.parentPhone}
                              onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-burgundy-800 hover:bg-burgundy-900 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <UserPlus className="w-5 h-5 text-lionGold-400" />
                      <span>{loading ? 'Registrando en Neon DB...' : 'Completar Matrícula de Alumno'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tarjeta Lateral de Confirmación Limpia */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-serif font-black text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Último Alumno Matriculado</span>
                  </h4>

                  {lastEnrolledStudent ? (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          Matrícula Activa 2026
                        </span>
                        <h3 className="font-black text-base text-slate-900 mt-1 truncate">
                          {lastEnrolledStudent.name}
                        </h3>
                        <p className="text-xs font-mono font-bold text-burgundy-900 mt-0.5">
                          Código: {lastEnrolledStudent.studentCode}
                        </p>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200">
                        <p><strong>DNI Alumno:</strong> <span className="font-mono font-bold text-slate-800">{lastEnrolledStudent.dni}</span></p>
                        <p><strong>Aula / Grado:</strong> {lastEnrolledStudent.gradeOrClass}</p>
                        <p><strong>Nivel:</strong> {lastEnrolledStudent.level}</p>
                        {lastEnrolledStudent.motherDni && (
                          <p><strong>👩 DNI Madre:</strong> <span className="font-mono text-slate-800">{lastEnrolledStudent.motherDni} ({lastEnrolledStudent.motherName || 'Madre'})</span></p>
                        )}
                        {lastEnrolledStudent.fatherDni && (
                          <p><strong>👨 DNI Padre:</strong> <span className="font-mono text-slate-800">{lastEnrolledStudent.fatherDni} ({lastEnrolledStudent.fatherName || 'Padre'})</span></p>
                        )}
                        {lastEnrolledStudent.parentDni && (
                          <p><strong>🛡️ DNI Apoderado:</strong> <span className="font-mono text-slate-800">{lastEnrolledStudent.parentDni} ({lastEnrolledStudent.parentName || 'Apoderado'})</span></p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                      <span>Completa el formulario para matricular un nuevo alumno en la base de datos.</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  💡 <strong>Acceso Familiar:</strong> Tanto la <strong>Madre</strong>, el <strong>Padre</strong> como el <strong>Apoderado</strong> registrado pueden ingresar a <Link href="/login" className="text-burgundy-800 font-bold underline">/login</Link> seleccionando <em>"Soy Papá / Mamá"</em> con su respectivo DNI para ver en vivo la asistencia de su hijo.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GRADOS, AULAS & MEZCLA AUTOMÁTICA (LO QUE PIDIÓ EL USUARIO) */}
          {activeTab === 'classes' && (
            <div className="space-y-6">

              {/* Selector de Nivel y Grado */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-serif font-black text-xl text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-burgundy-900" />
                      <span>Control de Grados, Aulas & Mezcla Automática</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Crea aulas para cada grado, distribuye a los alumnos recién matriculados y balancea secciones.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filtro de Nivel (Solo Primaria y Secundaria) */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                      {(['TODOS', 'PRIMARIA', 'SECUNDARIA'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setSelectedLevelFilter(lvl)}
                          className={`px-3 py-1.5 rounded-xl transition ${
                            selectedLevelFilter === lvl
                              ? 'bg-burgundy-900 text-white shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {lvl === 'TODOS' ? 'Todos los Grados' : lvl === 'PRIMARIA' ? 'Primaria' : 'Secundaria'}
                        </button>
                      ))}
                    </div>

                    {/* Botón para crear nuevo grado */}
                    <button
                      onClick={() => setIsCreatingGrade(!isCreatingGrade)}
                      className="bg-burgundy-900 hover:bg-burgundy-950 text-white font-bold text-xs px-3.5 py-2 rounded-2xl shadow transition flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-lionGold-400" />
                      <span>{isCreatingGrade ? 'Cerrar' : '+ Crear Grado'}</span>
                    </button>
                  </div>
                </div>

                {/* Formulario Inline para Crear Nuevo Grado */}
                {isCreatingGrade && (
                  <form
                    onSubmit={handleCreateGrade}
                    className="p-4 rounded-2xl bg-burgundy-50/60 border-2 border-burgundy-200 space-y-3 animate-in slide-in-from-top-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-burgundy-950 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-burgundy-800" />
                        <span>Crear Nuevo Grado o Año Escolar</span>
                      </h4>
                      <span className="text-[11px] font-mono text-burgundy-700">Se guardará en Neon DB</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Nombre del Grado *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Inicial 5 años, 1ro de Secundaria, etc."
                          value={newGradeName}
                          onChange={(e) => setNewGradeName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-burgundy-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Nivel Educativo *
                        </label>
                        <select
                          value={newGradeLevel}
                          onChange={(e) => setNewGradeLevel(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-burgundy-700"
                        >
                          <option value="PRIMARIA">🎒 Primaria</option>
                          <option value="SECUNDARIA">🏫 Secundaria</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingGrade(false)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-burgundy-900 hover:bg-burgundy-950 text-white font-black text-xs px-4 py-1.5 rounded-xl shadow transition disabled:opacity-50"
                      >
                        {loading ? 'Guardando...' : 'Guardar Grado'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Chips de Grados */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {filteredGrades.map((g) => {
                    const countInGrade = users.filter((u) => {
                      if (u.role !== 'ALUMNO') return false;
                      const gOrC = (u.gradeOrClass || '').toLowerCase();
                      return gOrC.includes(g.toLowerCase()) || (u.level === getLevelForGrade(g) && gOrC.includes('sin asignar'));
                    }).length;

                    const isSelected = selectedGrade === g;

                    return (
                      <button
                        key={g}
                        onClick={() => {
                          setSelectedGrade(g);
                          setIsCreatingClass(false);
                        }}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-burgundy-900 text-white border-burgundy-950 shadow-md font-black'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{g}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            isSelected ? 'bg-lionGold-500 text-burgundy-950 font-black' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {countInGrade}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panel del Grado Seleccionado */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                
                {/* Cabecera del Grado + Estadísticas + Botones de Acción */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                  <div>
                    <span className="text-xs font-black uppercase text-burgundy-900 tracking-wider">
                      GRADO SELECCIONADO
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 mt-1">
                      {selectedGrade}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs">
                      <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-full border border-slate-200">
                        👥 Total: <strong>{studentsInSelectedGrade.length} alumnos</strong>
                      </span>
                      <span
                        className={`font-bold px-3 py-1 rounded-full border ${
                          unassignedStudents.length > 0
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        ⏳ Pendientes sin aula: <strong>{unassignedStudents.length} alumnos</strong>
                      </span>
                      <span className="bg-blue-50 text-blue-900 font-bold px-3 py-1 rounded-full border border-blue-200">
                        🏫 Aulas disponibles: <strong>{classesForSelectedGrade.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Botones de Mezcla Automática, Crear Aula y Eliminar Grado */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <button
                      onClick={() => setIsCreatingClass(!isCreatingClass)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 border border-slate-300"
                    >
                      <Plus className="w-4 h-4 text-burgundy-900" />
                      <span>{isCreatingClass ? 'Cerrar Formulario' : '+ Crear Nueva Aula'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteGrade(selectedGrade)}
                      disabled={loading || studentsInSelectedGrade.length > 0}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        studentsInSelectedGrade.length > 0
                          ? `No se puede eliminar porque tiene ${studentsInSelectedGrade.length} alumno(s) matriculado(s). Primero debes mover o reasignar a los alumnos.`
                          : 'Eliminar este grado escolar'
                      }
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Eliminar Grado</span>
                    </button>

                    <div className="flex flex-col gap-1">
                      <button
                        onClick={handleAutoBalance}
                        disabled={loading || classesForSelectedGrade.length === 0}
                        className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 hover:from-burgundy-950 hover:to-burgundy-900 active:scale-95 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Distribuye parejo a los alumnos entre las aulas disponibles"
                      >
                        <Shuffle className="w-4 h-4 text-lionGold-400" />
                        <span>⚡ Mezcla Automática Equitativa</span>
                      </button>
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer self-center">
                        <input
                          type="checkbox"
                          checked={redistributeAll}
                          onChange={(e) => setRedistributeAll(e.target.checked)}
                          className="rounded text-burgundy-900 w-3 h-3"
                        />
                        <span>Redistribuir a todos (no solo los pendientes)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Formulario de Crear Nueva Aula (si está abierto) */}
                {isCreatingClass && (
                  <form
                    onSubmit={handleCreateNewClass}
                    className="p-5 rounded-2xl bg-burgundy-50/60 border-2 border-burgundy-200 space-y-4 animate-in slide-in-from-top-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-burgundy-950 flex items-center gap-2">
                        <School className="w-4 h-4 text-burgundy-800" />
                        <span>Crear Nueva Aula / Sección para {selectedGrade}</span>
                      </h4>
                      <span className="text-[11px] font-mono text-burgundy-700">Se guardará en Neon DB</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Sección / Nombre *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Alfa, Beta, Sección C"
                          value={newClassForm.section}
                          onChange={(e) => setNewClassForm({ ...newClassForm, section: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-burgundy-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Turno *
                        </label>
                        <select
                          value={newClassForm.shift}
                          onChange={(e) => setNewClassForm({ ...newClassForm, shift: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-burgundy-700"
                        >
                          <option value="MAÑANA">Mañana</option>
                          <option value="TARDE">Tarde</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Capacidad Máx.
                        </label>
                        <input
                          type="number"
                          value={newClassForm.capacity}
                          onChange={(e) => setNewClassForm({ ...newClassForm, capacity: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-burgundy-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Número de Aula Física
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Aula 102"
                          value={newClassForm.classroomNumber}
                          onChange={(e) => setNewClassForm({ ...newClassForm, classroomNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-burgundy-700"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingClass(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-burgundy-900 hover:bg-burgundy-950 text-white font-black text-xs px-5 py-2 rounded-xl shadow transition disabled:opacity-50"
                      >
                        {loading ? 'Guardando...' : 'Crear Aula en Neon'}
                      </button>
                    </div>
                  </form>
                )}

                {/* COLUMNAS: 1) SIN ASIGNAR + 2) AULAS CREADAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
                  
                  {/* COLUMNA: ALUMNOS SIN ASIGNAR (PENDIENTES) */}
                  <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <h4 className="font-black text-xs uppercase tracking-wider text-amber-950">
                          Sin Aula (Pendientes)
                        </h4>
                      </div>
                      <span className="bg-amber-200 text-amber-900 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {unassignedStudents.length}
                      </span>
                    </div>

                    <p className="text-[11px] text-amber-800">
                      Alumnos recién matriculados en {selectedGrade}. Puedes usar la <strong>Mezcla Automática</strong> o moverlos manualmente:
                    </p>

                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {unassignedStudents.length === 0 ? (
                        <div className="p-6 text-center text-amber-700 text-xs font-bold bg-white/70 rounded-2xl border border-amber-200/60">
                          ✓ Todos los alumnos de este grado ya tienen aula asignada.
                        </div>
                      ) : (
                        unassignedStudents.map((stu) => (
                          <div
                            key={stu.id}
                            className="bg-white p-3 rounded-2xl border border-amber-200 shadow-xs space-y-2 hover:border-amber-400 transition"
                          >
                            <div>
                              <p className="font-black text-xs text-slate-900 leading-tight truncate">{stu.name}</p>
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">DNI: {stu.dni}</p>
                            </div>

                            {/* Dropdown de Asignación Rápida */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">Asignar a:</span>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleMoveStudent(stu.id, stu.name, e.target.value);
                                  }
                                }}
                                className="w-full text-[11px] font-bold bg-slate-50 border border-slate-300 rounded-lg p-1 text-slate-800 focus:outline-none focus:border-burgundy-700"
                              >
                                <option value="" disabled>
                                  Elegir Aula...
                                </option>
                                {classesForSelectedGrade.map((c) => (
                                  <option key={c.id || c.code} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* COLUMNAS PARA CADA AULA CREADA */}
                  {classesForSelectedGrade.map((cls) => {
                    const studentsInThisClass = studentsInSelectedGrade.filter(
                      (u) => (u.gradeOrClass || '').toLowerCase().trim() === cls.name.toLowerCase().trim()
                    );
                    const occupancy = studentsInThisClass.length;
                    const maxCap = cls.capacity || 35;
                    const percent = Math.min(Math.round((occupancy / maxCap) * 100), 100);

                    return (
                      <div
                        key={cls.id || cls.code}
                        className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm hover:border-burgundy-400 transition"
                      >
                        {/* Cabecera del Aula */}
                        <div className="border-b border-slate-100 pb-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="font-serif font-black text-sm text-slate-900 truncate">
                              {cls.name}
                            </h4>
                            {studentsInThisClass.length === 0 && (
                              <button
                                onClick={() => handleDeleteClass(cls.id, cls.name)}
                                title="Eliminar aula vacía"
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                            <span>Turno: {cls.shift}</span>
                            <span className="font-bold text-slate-800">
                              {occupancy} / {maxCap} alumnos
                            </span>
                          </div>

                          {/* Mini barra de aforo del aula */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-burgundy-800 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Lista de Alumnos en esta Aula */}
                        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                          {studentsInThisClass.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              Aula vacía. Usa la mezcla automática o mueve alumnos aquí.
                            </div>
                          ) : (
                            studentsInThisClass.map((stu) => (
                              <div
                                key={stu.id}
                                className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 space-y-1.5 hover:bg-white hover:border-slate-300 transition"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <p className="font-bold text-xs text-slate-900 leading-tight truncate">{stu.name}</p>
                                  <span className="text-[9px] font-mono text-slate-400 shrink-0">{stu.dni}</span>
                                </div>

                                {/* Selector para mover alumno */}
                                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                                  <span className="text-[10px] text-slate-400 shrink-0">Mover a:</span>
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleMoveStudent(stu.id, stu.name, e.target.value);
                                      }
                                    }}
                                    className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded p-1 text-slate-700 focus:outline-none focus:border-burgundy-700"
                                  >
                                    <option value="" disabled>
                                      Cambiar aula...
                                    </option>
                                    <option value={`${selectedGrade} - Sin Asignar`}>
                                      ⏳ Regresar a Sin Asignar
                                    </option>
                                    {classesForSelectedGrade
                                      .filter((c) => c.name !== cls.name)
                                      .map((other) => (
                                        <option key={other.id || other.code} value={other.name}>
                                          Mover a {other.name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Tarjeta para agregar más aulas si no hay */}
                  {classesForSelectedGrade.length === 0 && (
                    <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3 bg-white col-span-2">
                      <School className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-sm">No hay aulas creadas para {selectedGrade}</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Crea las secciones (ej: Sección A, Sección B) para que puedas realizar la mezcla automática de alumnos.
                      </p>
                      <button
                        onClick={() => setIsCreatingClass(true)}
                        className="bg-burgundy-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
                      >
                        + Crear Primera Aula
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: CREAR DOCENTE / DIRECTIVO */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-serif font-black text-xl text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-burgundy-900" />
                  <span>Alta de Personal Docente y Directivo</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea cuentas de Director, Coordinador, Jefe de Normas o Docentes con permisos en Neon DB.
                </p>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      DNI del Docente *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      placeholder="Ej: 20000005"
                      value={staffForm.dni}
                      onChange={(e) => setStaffForm({ ...staffForm, dni: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm focus:outline-none focus:border-burgundy-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nombres y Apellidos Completos *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Mag. Silvia Paredes Córdova"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-burgundy-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nivel de Jerarquía Institucional *
                    </label>
                    <select
                      value={staffForm.hierarchy}
                      onChange={(e) => {
                        const h = e.target.value as HierarchyLevel;
                        let title = 'Profesor de Aula';
                        if (h === 'DIRECTOR') title = 'Director General';
                        if (h === 'COORDINADOR') title = 'Coordinador Académico';
                        if (h === 'JEFE_NORMAS') title = 'Jefe de Normas y Disciplina';
                        setStaffForm({ ...staffForm, hierarchy: h, hierarchyTitle: title });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:outline-none focus:border-burgundy-700"
                    >
                      <option value="PROFESOR">👨‍🏫 Profesor(a) de Aula / Asignatura</option>
                      <option value="COORDINADOR">📋 Coordinador Académico</option>
                      <option value="JEFE_NORMAS">🛡️ Jefe de Normas y Disciplina</option>
                      <option value="DIRECTOR">🏛️ Director(a) General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Título / Cargo Mostrado *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Profesora de Física / Química"
                      value={staffForm.hierarchyTitle}
                      onChange={(e) => setStaffForm({ ...staffForm, hierarchyTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-burgundy-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Área / Especialidad o Aula
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Ciencias y Tecnología"
                      value={staffForm.gradeOrClass}
                      onChange={(e) => setStaffForm({ ...staffForm, gradeOrClass: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-burgundy-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Celular
                    </label>
                    <input
                      type="tel"
                      placeholder="+51 987654321"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:border-burgundy-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-burgundy-800 hover:bg-burgundy-900 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <Check className="w-5 h-5 text-lionGold-400" />
                  <span>{loading ? 'Creando en Base de Datos...' : 'Registrar Docente en Neon DB'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: CARGA MASIVA DESDE EXCEL / CSV */}
          {activeTab === 'bulk' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-serif font-black text-xl text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Importación Masiva de Alumnos (Excel / CSV)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube salones enteros o promociones. Si solo pones el Grado sin aula, quedarán como "Sin Asignar" para mezclarlos luego.
                  </p>
                </div>

                <button
                  onClick={downloadSampleCsv}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Descargar Plantilla (.CSV)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-slate-300 hover:border-burgundy-600 rounded-3xl p-6 text-center space-y-3 bg-slate-50/50 transition">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">Arrastra tu archivo CSV o haz clic aquí</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Formato admitido: Archivo separado por comas o tabulaciones exportado desde Excel.
                  </p>
                  <label className="inline-block bg-burgundy-900 hover:bg-burgundy-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shadow transition">
                    <span>Seleccionar Archivo</span>
                    <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    O pega las celdas copiadas directamente de Excel:
                  </label>
                  <textarea
                    rows={6}
                    value={rawCsvText}
                    onChange={(e) => handleParseCsv(e.target.value)}
                    placeholder="78123001	Alonso Ramos	PRIMARIA	3ro Primaria	40119901&#10;75123001	Bryan Mendoza	SECUNDARIA	5to Secundaria - Alfa	40119903"
                    className="w-full p-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 focus:outline-none focus:border-burgundy-700"
                  />
                  <span className="text-[11px] text-slate-400">
                    Columnas: DNI | Nombre | Nivel | Grado o Aula | DNI Apoderado | Nombre Apoderado | Celular
                  </span>
                </div>
              </div>

              {parsedStudents.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-800">
                      Registros Detectados para Importación ({parsedStudents.length})
                    </span>
                    <button
                      onClick={handleExecuteBulkEnroll}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{loading ? 'Subiendo a Neon DB...' : `Confirmar y Matricular ${parsedStudents.length} Alumnos`}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">DNI Alumno</th>
                          <th className="p-3">Nombres y Apellidos</th>
                          <th className="p-3">Nivel</th>
                          <th className="p-3">Aula / Grado</th>
                          <th className="p-3">DNI Apoderado</th>
                          <th className="p-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedStudents.map((st, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">{st.dni}</td>
                            <td className="p-3 font-bold">{st.name}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                                  st.level === 'PRIMARIA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : st.level === 'SECUNDARIA'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-burgundy-100 text-burgundy-900'
                                }`}
                              >
                                {st.level}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-800">{st.gradeOrClass}</td>
                            <td className="p-3 font-mono">{st.parentDni}</td>
                            <td className="p-3 text-emerald-600 font-bold">✓ Listo</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bulkStatus && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{bulkStatus}</span>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
