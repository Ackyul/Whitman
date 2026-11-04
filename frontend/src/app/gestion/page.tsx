'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useWhitman } from '../../context/WhitmanContext';
import {
  fetchAcademicClasses,
  enrollStudentApi,
  bulkEnrollStudentsApi,
  createStaffApi,
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
  LogOut,
  KeyRound,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface GoogleAdminProfile {
  email: string;
  name: string;
  picture?: string;
}

export default function GestionAcademicaPage() {
  const { users, refreshData, currentUser } = useWhitman();
  const [activeTab, setActiveTab] = useState<'individual' | 'staff' | 'bulk'>('individual');

  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- SEGURIDAD CON GOOGLE ---
  const AUTHORIZED_ADMIN_EMAILS = [
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '949237217yoshua@gmail.com').toLowerCase().trim(),
    '949237217yoshua@gmail.com'
  ];

  const [googleAdmin, setGoogleAdmin] = useState<GoogleAdminProfile | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '213494948984-lb44lfqtdpujebr0osd34dgjmdq46c5l.apps.googleusercontent.com'
  );
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Cargar sesión de Google guardada
  useEffect(() => {
    try {
      const savedGoogle = localStorage.getItem('whitman_google_admin_session');
      if (savedGoogle) {
        const parsed = JSON.parse(savedGoogle);
        if (parsed?.email && AUTHORIZED_ADMIN_EMAILS.includes(parsed.email.toLowerCase().trim())) {
          setGoogleAdmin(parsed);
        } else {
          localStorage.removeItem('whitman_google_admin_session');
        }
      }
      const savedClientId = localStorage.getItem('whitman_custom_google_client_id');
      if (savedClientId) {
        setGoogleClientId(savedClientId);
      }
    } catch (e) {
      console.warn('Error al leer sesión de Google:', e);
    }
  }, []);

  useEffect(() => {
    if (googleClientId && !googleAdmin) {
      const timer = setTimeout(() => initializeGoogleOneTap(), 400);
      return () => clearTimeout(timer);
    }
  }, [googleClientId, googleAdmin]);

  // Inicializar Google Identity Services cuando el script cargue
  const initializeGoogleOneTap = () => {
    if (typeof window === 'undefined') return;
    const google = (window as any).google;
    if (google && googleClientId) {
      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        google.accounts.id.renderButton(
          document.getElementById('googleSignInBtnContainer'),
          { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill' }
        );
      } catch (err) {
        console.warn('Error renderizando botón de Google:', err);
      }
    }
  };

  const handleGoogleCredentialResponse = (response: any) => {
    try {
      // Decodificar el token JWT de Google
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

      // Validación estricta de cuenta autorizada
      if (!AUTHORIZED_ADMIN_EMAILS.includes(email)) {
        notify(
          'error',
          `⛔ Acceso denegado: La cuenta ${email} no tiene permisos de Dirección. Solo está autorizada la cuenta principal del director (949237217yoshua@gmail.com).`
        );
        return;
      }

      const profile: GoogleAdminProfile = {
        email: payload.email,
        name: payload.name || payload.given_name || 'Administrador',
        picture: payload.picture,
      };

      setGoogleAdmin(profile);
      localStorage.setItem('whitman_google_admin_session', JSON.stringify(profile));
      notify('success', `¡Bienvenido Director! Acceso verificado con Google (${profile.email}).`);
    } catch (err) {
      console.error('Error decodificando credencial de Google:', err);
      notify('error', 'Error al procesar la autenticación de Google.');
    }
  };

  const handleManualGoogleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      notify('error', 'Por favor ingresa un correo de Google válido.');
      return;
    }

    if (!AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      notify(
        'error',
        `⛔ Acceso denegado: El correo "${cleanEmail}" no está autorizado. Solo 949237217yoshua@gmail.com tiene permisos de Dirección.`
      );
      return;
    }

    const profile: GoogleAdminProfile = {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    };

    setGoogleAdmin(profile);
    localStorage.setItem('whitman_google_admin_session', JSON.stringify(profile));
    notify('success', `¡Acceso concedido a la cuenta de Dirección: ${profile.email}!`);
  };

  const handleLogoutGoogle = () => {
    setGoogleAdmin(null);
    localStorage.removeItem('whitman_google_admin_session');
    notify('success', 'Sesión de seguridad de Google cerrada.');
  };

  const handleSaveClientId = (newId: string) => {
    setGoogleClientId(newId.trim());
    localStorage.setItem('whitman_custom_google_client_id', newId.trim());
    setShowConfigModal(false);
    notify('success', 'Client ID de Google guardado.');
    setTimeout(() => initializeGoogleOneTap(), 300);
  };

  // 1. Estado Formulario Alumno
  const [studentForm, setStudentForm] = useState({
    dni: '',
    name: '',
    level: 'PRIMARIA' as EducationLevel,
    gradeOrClass: '6to Primaria - Leones',
    phone: '',
    parentDni: '',
    parentName: '',
    parentPhone: '',
  });
  const [lastEnrolledStudent, setLastEnrolledStudent] = useState<User | null>(null);

  // 2. Estado Formulario Docente
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

  // 3. Estado Carga Masiva
  const [rawCsvText, setRawCsvText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<Array<any>>([]);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  // Cargar Aulas desde la DB
  useEffect(() => {
    async function loadAcademicClasses() {
      const cls = await fetchAcademicClasses();
      if (cls && cls.length > 0) {
        setClasses(cls);
      } else {
        setClasses([
          { id: 'c1', code: 'PRIM-3-BETA', name: '3ro Primaria - Beta', level: 'PRIMARIA', grade: '3ro Primaria', section: 'Beta', shift: 'MAÑANA', active: true },
          { id: 'c2', code: 'PRIM-5-ALFA', name: '5to Primaria - Alfa', level: 'PRIMARIA', grade: '5to Primaria', section: 'Alfa', shift: 'MAÑANA', active: true },
          { id: 'c3', code: 'PRIM-6-LEONES', name: '6to Primaria - Leones', level: 'PRIMARIA', grade: '6to Primaria', section: 'Leones', shift: 'MAÑANA', active: true },
          { id: 'c4', code: 'SEC-1-ALFA', name: '1ro Secundaria - Alfa', level: 'SECUNDARIA', grade: '1ro Secundaria', section: 'Alfa', shift: 'MAÑANA', active: true },
          { id: 'c5', code: 'SEC-3-BETA', name: '3ro Secundaria - Beta', level: 'SECUNDARIA', grade: '3ro Secundaria', section: 'Beta', shift: 'MAÑANA', active: true },
          { id: 'c6', code: 'SEC-5-ALFA', name: '5to Secundaria - Alfa', level: 'SECUNDARIA', grade: '5to Secundaria', section: 'Alfa', shift: 'MAÑANA', active: true },
          { id: 'c7', code: 'ACAD-UNI', name: 'Ciclo Semianual UNI', level: 'ACADEMIA', grade: 'Preuniversitario UNI', section: 'UNI', shift: 'MAÑANA', active: true },
          { id: 'c8', code: 'ACAD-SM-MED', name: 'Ciclo San Marcos - Medicina', level: 'ACADEMIA', grade: 'Preuniversitario San Marcos', section: 'Medicina', shift: 'MAÑANA', active: true },
          { id: 'c9', code: 'ACAD-REP-INT', name: 'Ciclo Repaso Intensivo', level: 'ACADEMIA', grade: 'Repaso Intensivo', section: 'Intensivo', shift: 'TARDE', active: true },
        ]);
      }
    }
    loadAcademicClasses();
  }, []);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- MATRÍCULA INDIVIDUAL ---
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.dni || !studentForm.name || !studentForm.parentDni) {
      notify('error', 'El DNI del alumno, nombre y DNI del apoderado son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const res = await enrollStudentApi(studentForm);
      notify('success', `¡Matrícula exitosa! ${res.message || 'Alumno registrado en la base de datos'}`);
      if (res.data?.user) {
        setLastEnrolledStudent(res.data.user);
      }
      refreshData();
      setStudentForm((prev) => ({ ...prev, dni: '', name: '', phone: '' }));
    } catch (err: any) {
      notify('error', err.message || 'Error al matricular alumno');
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

  // --- PARSEAR CSV / EXCEL PEGASTE O ARCHIVO ---
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

      if (parts.length >= 4) {
        const dni = parts[0];
        const name = parts[1];
        let levelRaw = (parts[2] || 'SECUNDARIA').toUpperCase();
        let level: EducationLevel = 'SECUNDARIA';
        if (levelRaw.includes('PRIM')) level = 'PRIMARIA';
        else if (levelRaw.includes('ACAD') || levelRaw.includes('PRE')) level = 'ACADEMIA';

        const gradeOrClass = parts[3] || (level === 'PRIMARIA' ? '6to Primaria - Leones' : '5to Secundaria - Alfa');
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
      'DNI,Nombre Completo,Nivel,Aula / Grado,DNI Apoderado,Nombre Apoderado,Celular\n' +
      '78123001,Alonso Ramos Flores,PRIMARIA,6to Primaria - Leones,40119901,Don Pedro Ramos,991001122\n' +
      '78123002,Mariana Salas Cuadros,PRIMARIA,5to Primaria - Alfa,40119902,Sra. Elena Cuadros,991001133\n' +
      '75123001,Bryan Mendoza Ortiz,SECUNDARIA,5to Secundaria - Alfa,40119903,Don Julio Mendoza,991001144\n' +
      '75123002,Andrea Carpio Luna,SECUNDARIA,3ro Secundaria - Beta,40119904,Sra. Sonia Luna,991001155\n' +
      '72123001,Renzo Chávez Vega,ACADEMIA,Ciclo Semianual UNI,40119905,Don Juan Chávez,991001166\n' +
      '72123002,Estefanía Huamán Díaz,ACADEMIA,Ciclo San Marcos - Medicina,40119906,Sra. Rosa Díaz,991001177\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_matricula_whitman_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Script oficial de Google Identity Services */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleOneTap}
      />

      {/* 1. CABECERA INSTITUCIONAL CON ESTADO DE SEGURIDAD GOOGLE */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-lionGold-500/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-lionGold-300 bg-lionGold-500/20 px-3 py-0.5 rounded-full border border-lionGold-400/30">
                SISTEMA DE GESTIÓN ACADÉMICA 2026
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Base de Datos Neon PostgreSQL</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white mt-2">
              Gestión, Matrícula & Cuentas Whitman
            </h1>
            <p className="text-xs sm:text-sm text-burgundy-200 max-w-2xl mt-1">
              Crea alumnos, docentes, importa promociones completas desde Excel y asigna sus aulas oficiales en la base de datos.
            </p>
          </div>

          {/* Badge de Verificación con Google */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center gap-3">
            {googleAdmin ? (
              <>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  {googleAdmin.picture ? (
                    <img src={googleAdmin.picture} alt={googleAdmin.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 uppercase">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Verificado con Google</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate max-w-[180px]">
                    {googleAdmin.email}
                  </p>
                </div>
                <button
                  onClick={handleLogoutGoogle}
                  title="Cerrar sesión de Google"
                  className="p-1.5 text-white/70 hover:text-rose-300 hover:bg-white/10 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-[10px] font-bold text-amber-300 uppercase">Seguridad Requerida</p>
                  <p className="text-xs font-semibold text-white">Requiere cuenta de Google</p>
                </div>
              </div>
            )}
          </div>
        </div>
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
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border-2 border-slate-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-burgundy-100 text-burgundy-900 flex items-center justify-center mx-auto border-2 border-burgundy-300">
            <Lock className="w-8 h-8 text-burgundy-800" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              PROTECCIÓN DE ALTA SEGURIDAD
            </span>
            <h2 className="text-2xl font-black font-serif text-slate-900 mt-2">
              Autentícate con tu Cuenta de Google
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Para crear alumnos, profesores o importar nóminas completas a la base de datos, valida tu identidad institucional con Google.
            </p>
          </div>

          {/* Botón Oficial Google Identity Services */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <div id="googleSignInBtnContainer" className="min-h-[44px]" />

            {/* Alternativa con formulario de correo autorizado */}
            <form onSubmit={handleManualGoogleAuth} className="w-full max-w-sm space-y-3 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  O ingresa tu cuenta autorizada de Dirección:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="949237217yoshua@gmail.com"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-burgundy-700 font-semibold"
                  />
                  <button
                    type="submit"
                    className="bg-burgundy-900 hover:bg-burgundy-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow"
                  >
                    Verificar
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                  🛡️ Acceso exclusivo por ahora: <span className="font-bold text-burgundy-900">949237217yoshua@gmail.com</span>
                </p>
              </div>
            </form>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>🔒 Control de Acceso Cifrado</span>
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-burgundy-900 hover:underline font-bold flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Configurar Google Client ID</span>
            </button>
          </div>
        </div>
      ) : (
        /* ACCESO PERMITIDO - MÓDULO ADMINISTRATIVO COMPLETO */
        <div className="space-y-6">

          {/* 2. PESTAÑAS DE NAVEGACIÓN (3 PESTAÑAS LIMPIAS, SIN FOTOCHECKS) */}
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'individual'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-4 h-4 text-lionGold-400" />
              <span>1. Matricular Alumno (Individual)</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'staff'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building className="w-4 h-4 text-lionGold-400" />
              <span>2. Crear Docente / Directivo</span>
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'bulk'
                  ? 'bg-burgundy-900 text-white shadow font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>3. Carga Masiva (Excel / CSV)</span>
            </button>
          </div>

          {/* TAB 1: MATRÍCULA INDIVIDUAL DE ALUMNO */}
          {activeTab === 'individual' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-serif font-black text-xl text-slate-900 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-burgundy-900" />
                    <span>Ficha de Matrícula y Asignación de Aula</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Crea la cuenta del alumno y vincula automáticamente la cuenta de su apoderado.
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
                            const lvl = e.target.value as EducationLevel;
                            let defaultClass = '1ro Secundaria - Alfa';
                            if (lvl === 'PRIMARIA') defaultClass = '6to Primaria - Leones';
                            if (lvl === 'ACADEMIA') defaultClass = 'Ciclo Semianual UNI';
                            setStudentForm({ ...studentForm, level: lvl, gradeOrClass: defaultClass });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                        >
                          <option value="PRIMARIA">🎒 Primaria</option>
                          <option value="SECUNDARIA">🏫 Secundaria</option>
                          <option value="ACADEMIA">🦁 Academia Preuniversitaria</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Aula / Grado Asignado *
                        </label>
                        <select
                          value={studentForm.gradeOrClass}
                          onChange={(e) => setStudentForm({ ...studentForm, gradeOrClass: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                        >
                          {classes
                            .filter((c) => c.level === studentForm.level)
                            .map((c) => (
                              <option key={c.code} value={c.name}>
                                {c.name} ({c.shift || 'Mañana'})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sección Apoderado */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-black uppercase text-burgundy-900 tracking-wider">
                      B. Datos del Padre / Madre / Apoderado (Para acceso al portal)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          DNI del Apoderado *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          placeholder="Ej: 40998877"
                          value={studentForm.parentDni}
                          onChange={(e) => setStudentForm({ ...studentForm, parentDni: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm focus:outline-none focus:border-burgundy-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Nombre del Apoderado
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Don Pedro Salazar"
                          value={studentForm.parentName}
                          onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-burgundy-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Celular (Avisos de Ingreso)
                        </label>
                        <input
                          type="tel"
                          placeholder="+51 987654321"
                          value={studentForm.parentPhone}
                          onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-burgundy-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-burgundy-800 hover:bg-burgundy-900 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <UserPlus className="w-5 h-5 text-lionGold-400" />
                      <span>{loading ? 'Registrando en Neon DB...' : 'Completar Matrícula y Asignar Aula'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tarjeta Lateral de Confirmación Limpia (Sin impresión de fotocheck) */}
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

                      <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                        <p><strong>DNI Alumno:</strong> <span className="font-mono">{lastEnrolledStudent.dni}</span></p>
                        <p><strong>Aula / Grado:</strong> {lastEnrolledStudent.gradeOrClass}</p>
                        <p><strong>Nivel:</strong> {lastEnrolledStudent.level}</p>
                        <p><strong>DNI Apoderado:</strong> <span className="font-mono">{lastEnrolledStudent.parentDni}</span></p>
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
                  💡 <strong>Acceso del Apoderado:</strong> El padre o madre ya puede ingresar a <Link href="/login" className="text-burgundy-800 font-bold underline">/login</Link> seleccionando <em>"Soy Papá / Mamá"</em> con su DNI para ver en vivo la asistencia de su hijo.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREAR DOCENTE / DIRECTIVO */}
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

          {/* TAB 3: CARGA MASIVA DESDE EXCEL / CSV */}
          {activeTab === 'bulk' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-serif font-black text-xl text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Importación Masiva de Alumnos (Excel / CSV)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube salones enteros o promociones en segundos. El sistema genera los códigos y vincula a los apoderados automáticamente.
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
                    Formato admitido: Archivo separado por comas o punto y coma exportado desde Microsoft Excel.
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
                    placeholder="78123001	Alonso Ramos	PRIMARIA	6to Primaria - Leones	40119901&#10;75123001	Bryan Mendoza	SECUNDARIA	5to Secundaria - Alfa	40119903"
                    className="w-full p-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 focus:outline-none focus:border-burgundy-700"
                  />
                  <span className="text-[11px] text-slate-400">
                    Columnas: DNI | Nombre | Nivel | Aula | DNI Apoderado | Nombre Apoderado | Celular
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
                          <th className="p-3">Aula Asignada</th>
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

      {/* MODAL PARA INGRESAR GOOGLE CLIENT ID */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-black text-lg text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-burgundy-900" />
                <span>Configurar Google OAuth Client ID</span>
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ingresa el <strong>Client ID</strong> obtenido de tu <em>Google Cloud Console</em>. También puedes agregarlo en el archivo <code>frontend/.env.local</code> como <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                placeholder="Ej: 1234567890-abcdefgh.apps.googleusercontent.com"
                defaultValue={googleClientId}
                id="modalClientIdInput"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-burgundy-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('modalClientIdInput') as HTMLInputElement;
                  if (el) handleSaveClientId(el.value);
                }}
                className="px-5 py-2 bg-burgundy-900 hover:bg-burgundy-800 text-white text-xs font-black rounded-xl shadow transition"
              >
                Guardar Client ID
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
