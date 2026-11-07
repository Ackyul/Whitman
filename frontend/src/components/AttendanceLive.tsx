'use client';

import React, { useState, useEffect } from 'react';
import {
  AttendanceRecord,
  AttendanceStatus,
  EducationLevel,
  User,
  WhitmanStats,
} from '../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Flame,
  Save,
  LogIn,
  LogOut,
  CalendarCheck,
  ShieldCheck,
  Search,
  Building,
  School,
  ClipboardList,
  Calendar,
  X,
  SlidersHorizontal,
  Scale,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  fetchAttendanceScheduleApi,
  saveAttendanceScheduleApi,
  updateAttendanceStatus,
  AttendanceSchedule,
} from '../lib/api';

interface AttendanceLiveProps {
  records: AttendanceRecord[];
  students: User[];
  stats: WhitmanStats | null;
  onRefresh: () => void;
}

export const AttendanceLive: React.FC<AttendanceLiveProps> = ({
  records,
  students,
  stats,
  onRefresh,
}) => {
  // Pestaña activa: 'horarios', 'registros' o 'diferencia'
  const [activeTab, setActiveTab] = useState<'horarios' | 'registros' | 'diferencia'>('registros');

  // Estados de comparación de diferencia entre días
  const [compareDateA, setCompareDateA] = useState(() => new Date().toISOString().split('T')[0]);
  const [compareDateB, setCompareDateB] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [compareDiffFilter, setCompareDiffFilter] = useState<'TODOS' | 'SOLO_DIFERENCIAS' | 'FALTARON_B' | 'NUEVOS_B' | 'CAMBIO_PUNTUALIDAD'>('TODOS');
  const [compareSearchQuery, setCompareSearchQuery] = useState('');

  // Configuración de Horarios de Asistencia
  const [schedule, setSchedule] = useState<AttendanceSchedule>({
    entryStart: '07:00',
    entryEnd: '08:00',
    entryTolerance: '08:30',
    exitStart: '13:00',
    exitEnd: '15:00',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados de Búsqueda y Filtros en la vista de Registros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'TODOS' | EducationLevel>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | AttendanceStatus>('TODOS');
  const [dateFilterMode, setDateFilterMode] = useState<'HOY' | 'TODAS' | 'CUSTOM'>('HOY');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Cargar configuración de horarios al montar
  useEffect(() => {
    fetchAttendanceScheduleApi()
      .then((data) => {
        if (data) setSchedule(data);
      })
      .catch((err) => console.error('Error cargando horario de asistencia:', err));
  }, []);

  // Determinar fecha de hoy en Perú
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecordsCount = records.filter((r) => r.date === todayStr).length;

  // Determinar en qué modo estamos en este momento según la hora actual
  const getCurrentMode = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const current = `${hh}:${mm}`;

    if (current >= schedule.entryStart && current <= schedule.entryEnd) {
      return {
        label: 'ENTRADA PUNTUAL ACTIVA',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        desc: `Alumnos marcando ahora quedan como PUNTUAL (hasta las ${schedule.entryEnd})`,
        icon: LogIn,
      };
    } else if (current > schedule.entryEnd && current <= schedule.entryTolerance) {
      return {
        label: 'ENTRADA CON TARDANZA ACTIVA',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        desc: `Alumnos marcando ahora quedan con TARDANZA (tolerancia hasta las ${schedule.entryTolerance})`,
        icon: Clock,
      };
    } else if (current >= schedule.exitStart && current <= schedule.exitEnd) {
      return {
        label: 'SALIDA DE ALUMNOS ACTIVA',
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        desc: `Alumnos marcando ahora registran su HORA DE SALIDA (hasta las ${schedule.exitEnd})`,
        icon: LogOut,
      };
    } else if (current > schedule.entryTolerance && current < schedule.exitStart) {
      return {
        label: 'HORARIO DE CLASES REGULAR',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
        desc: `Fuera del horario de entrada matutino. Marcados pendientes se gestionan automáticamente.`,
        icon: CalendarCheck,
      };
    } else {
      return {
        label: 'MODO AUTOMÁTICO ACTIVO',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
        desc: `El sistema asigna Entrada o Salida inteligentemente al pasar el carnet o DNI.`,
        icon: ShieldCheck,
      };
    }
  };

  const currentMode = getCurrentMode();

  // Guardar configuración de horarios en base de datos Neon
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    setScheduleFeedback(null);
    try {
      await saveAttendanceScheduleApi(schedule);
      setScheduleFeedback({
        type: 'success',
        message: '¡Horarios de entrada y salida actualizados y guardados en Neon DB!',
      });
      setTimeout(() => setScheduleFeedback(null), 4000);
    } catch (err: any) {
      setScheduleFeedback({
        type: 'error',
        message: err.message || 'Error al guardar los horarios',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleChangeStatus = async (id: string, newStatus: AttendanceStatus) => {
    try {
      await updateAttendanceStatus(id, newStatus, 'Actualizado desde panel de control');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  // Filtrado de registros en la vista dedicada
  const filteredRecords = records.filter((r) => {
    if (dateFilterMode === 'HOY' && r.date !== todayStr) return false;
    if (dateFilterMode === 'CUSTOM' && r.date !== customDate) return false;
    if (filterLevel !== 'TODOS' && r.level !== filterLevel) return false;
    if (filterStatus !== 'TODOS' && r.status !== filterStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.userName?.toLowerCase().includes(q);
      const matchDni = r.userDni?.includes(q);
      const matchClass = r.gradeOrClass?.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchClass) return false;
    }
    return true;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PRESENTE
          </span>
        );
      case 'TARDANZA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            TARDANZA
          </span>
        );
      case 'FALTA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            FALTA
          </span>
        );
      case 'JUSTIFICADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            JUSTIFICADO
          </span>
        );
    }
  };

  // Comparativa detallada entre Fecha A y Fecha B
  const recordsCompareA = records.filter((a) => a.date === compareDateA);
  const recordsCompareB = records.filter((a) => a.date === compareDateB);

  const totalA = recordsCompareA.length;
  const totalB = recordsCompareB.length;
  const diffTotalAB = totalA - totalB;

  const presentA = recordsCompareA.filter((a) => a.status === 'PRESENTE').length;
  const presentB = recordsCompareB.filter((a) => a.status === 'PRESENTE').length;
  const diffPresentAB = presentA - presentB;

  const lateA = recordsCompareA.filter((a) => a.status === 'TARDANZA').length;
  const lateB = recordsCompareB.filter((a) => a.status === 'TARDANZA').length;
  const diffLateAB = lateA - lateB;

  const studentMapA = new Map(recordsCompareA.map((r) => [r.userDni, r]));
  const studentMapB = new Map(recordsCompareB.map((r) => [r.userDni, r]));
  const allCompareDnis = Array.from(new Set([...Array.from(studentMapA.keys()), ...Array.from(studentMapB.keys())]));

  interface StudentDayDiff {
    dni: string;
    name: string;
    gradeOrClass: string;
    level: string;
    recordA?: (typeof recordsCompareA)[0];
    recordB?: (typeof recordsCompareB)[0];
    type: 'IGUAL' | 'FALTO_EN_B' | 'NUEVO_EN_B' | 'MEJORO_A_PUNTUAL' | 'PASO_A_TARDANZA' | 'OTRO_CAMBIO';
    label: string;
    badgeClass: string;
  }

  const comparisonItems: StudentDayDiff[] = allCompareDnis.map((dni) => {
    const recA = studentMapA.get(dni);
    const recB = studentMapB.get(dni);
    const studentInfo = (students || []).find((s) => s.dni === dni);

    const name = recA?.userName || recB?.userName || studentInfo?.name || `Alumno ${dni}`;
    const gradeOrClass = recA?.gradeOrClass || recB?.gradeOrClass || studentInfo?.gradeOrClass || '—';
    const level = recA?.level || recB?.level || studentInfo?.level || 'COLEGIO';

    if (recA && !recB) {
      return {
        dni,
        name,
        gradeOrClass,
        level,
        recordA: recA,
        recordB: undefined,
        type: 'FALTO_EN_B',
        label: `Faltó en Día 2 (${compareDateB})`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    }

    if (!recA && recB) {
      return {
        dni,
        name,
        gradeOrClass,
        level,
        recordA: undefined,
        recordB: recB,
        type: 'NUEVO_EN_B',
        label: `Asistió solo en Día 2 (${compareDateB})`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    }

    if (recA && recB) {
      if (recA.status === recB.status) {
        return {
          dni,
          name,
          gradeOrClass,
          level,
          recordA: recA,
          recordB: recB,
          type: 'IGUAL',
          label: `Mantuvo ${recA.status}`,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      }
      if (recA.status === 'TARDANZA' && recB.status === 'PRESENTE') {
        return {
          dni,
          name,
          gradeOrClass,
          level,
          recordA: recA,
          recordB: recB,
          type: 'MEJORO_A_PUNTUAL',
          label: 'Mejoró a Puntual',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      }
      if (recA.status === 'PRESENTE' && recB.status === 'TARDANZA') {
        return {
          dni,
          name,
          gradeOrClass,
          level,
          recordA: recA,
          recordB: recB,
          type: 'PASO_A_TARDANZA',
          label: 'Pasó a Tardanza',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      }
      return {
        dni,
        name,
        gradeOrClass,
        level,
        recordA: recA,
        recordB: recB,
        type: 'OTRO_CAMBIO',
        label: `${recA.status} ➔ ${recB.status}`,
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      };
    }

    return {
      dni,
      name,
      gradeOrClass,
      level,
      type: 'IGUAL',
      label: 'Sin cambios',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  });

  const filteredComparison = comparisonItems.filter((item) => {
    if (compareDiffFilter === 'SOLO_DIFERENCIAS' && item.type === 'IGUAL') return false;
    if (compareDiffFilter === 'FALTARON_B' && item.type !== 'FALTO_EN_B') return false;
    if (compareDiffFilter === 'NUEVOS_B' && item.type !== 'NUEVO_EN_B') return false;
    if (compareDiffFilter === 'CAMBIO_PUNTUALIDAD' && item.type !== 'MEJORO_A_PUNTUAL' && item.type !== 'PASO_A_TARDANZA') return false;

    if (compareSearchQuery.trim()) {
      const q = compareSearchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.dni.includes(q) ||
        item.gradeOrClass.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countAbsentB = comparisonItems.filter((i) => i.type === 'FALTO_EN_B').length;
  const countNewB = comparisonItems.filter((i) => i.type === 'NUEVO_EN_B').length;
  const countChangedPunctuality = comparisonItems.filter((i) => i.type === 'MEJORO_A_PUNTUAL' || i.type === 'PASO_A_TARDANZA').length;
  const countDifferencesTotal = comparisonItems.filter((i) => i.type !== 'IGUAL').length;

  const hasActiveFilters = searchQuery.trim() !== '' || filterLevel !== 'TODOS' || filterStatus !== 'TODOS' || dateFilterMode !== 'HOY';

  return (
    <div className="space-y-6">
      
      {/* NAVEGACIÓN: 1. HORARIOS VS 2. REGISTROS VS 3. DIFERENCIA ENTRE DÍAS */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'horarios'
                ? 'bg-burgundy-900 text-white shadow font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-lionGold-400 shrink-0" />
            <span>1. Horarios de Control</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registros')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'registros'
                ? 'bg-burgundy-900 text-white shadow font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-lionGold-400 shrink-0" />
            <span>2. Registro de Asistencias</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-1 ${
                activeTab === 'registros'
                  ? 'bg-lionGold-500 text-burgundy-950'
                  : 'bg-burgundy-100 text-burgundy-900'
              }`}
            >
              {todayRecordsCount} hoy
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diferencia')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'diferencia'
                ? 'bg-burgundy-900 text-white shadow font-black'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4 text-lionGold-400 shrink-0" />
            <span>3. Diferencia entre Días</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-1 ${
                activeTab === 'diferencia'
                  ? 'bg-lionGold-500 text-burgundy-950'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {countDifferencesTotal > 0 ? `${countDifferencesTotal} cambios` : 'Comparar'}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN 1: HORARIOS DE CONTROL (ENTRADA Y SALIDA)        */}
      {/* ======================================================== */}
      {activeTab === 'horarios' && (
        <div className="space-y-6">
          {/* Tarjetas de Métricas en Tiempo Real */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-emerald-600 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Puntuales</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl md:text-3xl font-black text-slate-800">
                {stats?.todayAttendance.present ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Ingreso antes de las {schedule.entryEnd}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-amber-500 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Tardanzas</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl md:text-3xl font-black text-slate-800">
                {stats?.todayAttendance.late ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Hasta tolerancia {schedule.entryTolerance}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-burgundy-800 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Total Marcados</span>
                <UserCheck className="w-4 h-4 text-burgundy-800" />
              </div>
              <div className="mt-2 text-2xl md:text-3xl font-black text-slate-800">
                {stats?.todayAttendance.totalMarked ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">De {stats?.totalStudents ?? 0} alumnos matriculados</p>
            </div>

            <div className="bg-gradient-to-br from-burgundy-900 to-burgundy-800 text-white p-4 rounded-2xl shadow-lg border border-lionGold-500/40">
              <div className="flex items-center justify-between text-lionGold-300 text-xs font-bold uppercase tracking-wider">
                <span>Asistencia Hoy</span>
                <Flame className="w-4 h-4 text-lionGold-400 animate-bounce" />
              </div>
              <div className="mt-2 text-2xl md:text-3xl font-black text-white">
                {stats?.todayAttendance.attendanceRate ?? 0}%
              </div>
              <p className="text-[11px] text-burgundy-200 mt-1">¡Garra del León Whitman!</p>
            </div>
          </div>

          {/* Panel de Horarios */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-burgundy-900 bg-burgundy-50 px-3 py-1 rounded-full border border-burgundy-200 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-burgundy-800" />
                  <span>Configuración de Asistencia • Horarios</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 font-serif">
                  Horarios de Entrada y Salida
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define los rangos horarios exactos. Los alumnos solo marcan con su carnet o DNI; el sistema detecta automáticamente la entrada o salida según estos límites.
                </p>
              </div>

              {/* Indicador de Modo Actual en Vivo */}
              <div className={`p-3 rounded-2xl border flex items-center gap-3 ${currentMode.badgeColor}`}>
                <currentMode.icon className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    {currentMode.label}
                  </span>
                  <span className="text-xs font-medium leading-tight block">
                    {currentMode.desc}
                  </span>
                </div>
              </div>
            </div>

            {scheduleFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                  scheduleFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                {scheduleFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{scheduleFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveSchedule} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* BLOQUE: HORARIO DE ENTRADA */}
                <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                      <LogIn className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wide">
                        Horario de Entrada (Ingreso)
                      </h4>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Rango para registrar la llegada de los estudiantes
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        De qué hora (Inicio):
                      </label>
                      <input
                        type="time"
                        value={schedule.entryStart}
                        onChange={(e) => setSchedule({ ...schedule, entryStart: e.target.value })}
                        required
                        className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Apertura de garita</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Hasta qué hora (Puntual):
                      </label>
                      <input
                        type="time"
                        value={schedule.entryEnd}
                        onChange={(e) => setSchedule({ ...schedule, entryEnd: e.target.value })}
                        required
                        className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Límite para ser PRESENTE</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Tolerancia Máxima / Tardanza hasta:
                    </label>
                    <input
                      type="time"
                      value={schedule.entryTolerance}
                      onChange={(e) => setSchedule({ ...schedule, entryTolerance: e.target.value })}
                      required
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Marcados entre la hora puntual y esta hora se guardan como TARDANZA.
                    </span>
                  </div>
                </div>

                {/* BLOQUE: HORARIO DE SALIDA */}
                <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wide">
                        Horario de Salida (Despacho)
                      </h4>
                      <p className="text-[11px] text-indigo-700 font-medium">
                        Rango para registrar la retirada de los estudiantes
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        De qué hora (Inicio):
                      </label>
                      <input
                        type="time"
                        value={schedule.exitStart}
                        onChange={(e) => setSchedule({ ...schedule, exitStart: e.target.value })}
                        required
                        className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Inicio toque de salida</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Hasta qué hora (Fin):
                      </label>
                      <input
                        type="time"
                        value={schedule.exitEnd}
                        onChange={(e) => setSchedule({ ...schedule, exitEnd: e.target.value })}
                        required
                        className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Cierre de despacho</span>
                    </div>
                  </div>

                  <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-950">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <span>ℹ️ Marcado Automático:</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Alumnos escanean en Garita con pistola láser; el sistema asigna Entrada o Salida según las horas establecidas aquí.
                    </p>
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="w-full sm:w-auto bg-burgundy-900 hover:bg-burgundy-950 active:scale-95 text-white font-black py-3 px-8 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-lionGold-400" />
                  <span>{savingSchedule ? 'Guardando en Base de Datos...' : 'Guardar Horarios de Asistencia'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 2: REGISTRO DE ASISTENCIAS APARTE CON BUSCADOR   */}
      {/* ======================================================== */}
      {activeTab === 'registros' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-6">
          
          {/* Encabezado de la Sección de Registros */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-burgundy-900 bg-burgundy-50 px-3 py-1 rounded-full border border-burgundy-200 mb-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-burgundy-800" />
                <span>Panel de Consulta de Asistencia</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 font-serif">
                Registro de Asistencias & Búsqueda
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Busca rápidamente por DNI, nombre del estudiante o aula para consultar su hora de entrada, salida y estado.
              </p>
            </div>

            {/* Selector de Rango de Fecha */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDateFilterMode('HOY')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  dateFilterMode === 'HOY'
                    ? 'bg-burgundy-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoy ({todayStr})
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('TODAS')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  dateFilterMode === 'TODAS'
                    ? 'bg-burgundy-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo el Historial
              </button>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDateFilterMode('CUSTOM');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition ${
                    dateFilterMode === 'CUSTOM'
                      ? 'bg-burgundy-900 text-white border-burgundy-950'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA Y FILTROS AVANZADOS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Campo de búsqueda principal (ocupa 6 columnas) */}
            <div className="md:col-span-6 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Escribe el DNI, nombres del alumno o grado (ej: 61460126, Yoshua, 3ro Primaria)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-100 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro de Nivel (3 columnas) */}
            <div className="md:col-span-3">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as any)}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 focus:outline-none focus:border-burgundy-700 shadow-xs"
              >
                <option value="TODOS">Todos los niveles</option>
                <option value="COLEGIO">🏫 Colegio Whitman</option>
                <option value="ACADEMIA">🦁 Academia Preuniversitaria</option>
              </select>
            </div>

            {/* Filtro de Estado (3 columnas) */}
            <div className="md:col-span-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 focus:outline-none focus:border-burgundy-700 shadow-xs"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PRESENTE">🟢 Presentes (Puntuales)</option>
                <option value="TARDANZA">🟠 Tardanzas</option>
                <option value="FALTA">🔴 Faltas</option>
                <option value="JUSTIFICADO">🔵 Justificados</option>
              </select>
            </div>
          </div>

          {/* Barra de estado de resultados */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">
                Resultados encontrados:
              </span>
              <span className="bg-burgundy-100 text-burgundy-900 font-black px-2.5 py-0.5 rounded-full font-mono">
                {filteredRecords.length} estudiantes
              </span>
              {hasActiveFilters && (
                <span className="text-[11px] text-slate-400 italic">
                  (Filtros activos)
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterLevel('TODOS');
                  setFilterStatus('TODOS');
                  setDateFilterMode('HOY');
                }}
                className="text-xs text-burgundy-900 hover:text-burgundy-750 font-bold hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          {/* TABLA DE RESULTADOS DE ASISTENCIA */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Estudiante</th>
                  <th className="px-4 py-3.5">Nivel / Aula</th>
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5">Ingreso / Salida</th>
                  <th className="px-4 py-3.5">Método</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Observación</th>
                  <th className="px-4 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-slate-400">
                      <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-600 text-sm">
                        No se encontraron registros de asistencia con los criterios de búsqueda.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Prueba buscando por otro DNI, nombre o selecciona "Todo el Historial".
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        idx === 0 ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-burgundy-100 text-burgundy-900 font-bold flex items-center justify-center text-xs border border-burgundy-200 shrink-0">
                            {item.userName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{item.userName}</span>
                              {idx === 0 && item.date === todayStr && (
                                <span className="text-[9px] bg-lionGold-500 text-burgundy-950 font-black px-1.5 py-0.2 rounded uppercase">
                                  En vivo
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">DNI: {item.userDni}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {item.level === 'ACADEMIA' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-burgundy-900 bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">
                              <Building className="w-3 h-3 text-burgundy-700" />
                              Academia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              <School className="w-3 h-3 text-indigo-700" />
                              Colegio
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{item.gradeOrClass}</div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">
                        {item.date}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            🟢 In: {item.time}
                          </span>
                          {item.exitTime ? (
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                              🟠 Out: {item.exitTime}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-[10px]">
                              Salida: Pendiente
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                          {item.method || 'LÁSER'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                        {item.notes || '—'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {item.status !== 'PRESENTE' && (
                            <button
                              onClick={() => handleChangeStatus(item.id, 'PRESENTE')}
                              title="Cambiar a Presente"
                              className="text-xs text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded transition font-bold"
                            >
                              Puntual
                            </button>
                          )}
                          {item.status !== 'JUSTIFICADO' && (
                            <button
                              onClick={() => handleChangeStatus(item.id, 'JUSTIFICADO')}
                              title="Justificar tardanza o falta"
                              className="text-xs text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition font-bold"
                            >
                              Justificar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 3: DIFERENCIA DE ASISTENCIAS ENTRE DÍAS          */}
      {/* ======================================================== */}
      {activeTab === 'diferencia' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-burgundy-900 bg-burgundy-50 px-3 py-1 rounded-full border border-burgundy-200 mb-1.5">
              <Scale className="w-3.5 h-3.5 text-burgundy-800" />
              <span>Comparador Histórico de Asistencia</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 font-serif">
              Diferencia de Asistencias entre Días
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contrasta la asistencia entre dos fechas cualesquiera para medir variación en asistencias, puntualidad y detectar qué alumnos faltaron en cada jornada.
            </p>
          </div>

          {/* SELECTOR DE FECHAS */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-5/12 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Día 1 (Fecha Base):
              </label>
              <input
                type="date"
                value={compareDateA}
                onChange={(e) => setCompareDateA(e.target.value)}
                className="w-full font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-burgundy-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                {totalA} alumnos marcaron este día
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const temp = compareDateA;
                setCompareDateA(compareDateB);
                setCompareDateB(temp);
              }}
              title="Intercambiar fechas"
              className="p-3 rounded-xl bg-burgundy-50 text-burgundy-900 hover:bg-burgundy-100 transition shadow-xs active:scale-95 shrink-0"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <div className="w-full md:w-5/12 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Día 2 (Fecha a Contrastar):
              </label>
              <input
                type="date"
                value={compareDateB}
                onChange={(e) => setCompareDateB(e.target.value)}
                className="w-full font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-burgundy-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                {totalB} alumnos marcaron este día
              </span>
            </div>
          </div>

          {/* TARJETAS DE DIFERENCIA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Diferencia Total</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${
                  diffTotalAB > 0 ? 'text-emerald-700' : diffTotalAB < 0 ? 'text-rose-700' : 'text-slate-800'
                }`}>
                  {diffTotalAB > 0 ? `+${diffTotalAB}` : diffTotalAB}
                </span>
                <span className="text-xs text-slate-400 font-bold">alumnos</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {totalA} (Día 1) vs {totalB} (Día 2)
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Diferencia Puntuales</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${
                  diffPresentAB > 0 ? 'text-emerald-700' : diffPresentAB < 0 ? 'text-rose-700' : 'text-slate-800'
                }`}>
                  {diffPresentAB > 0 ? `+${diffPresentAB}` : diffPresentAB}
                </span>
                <span className="text-xs text-slate-400 font-bold">puntuales</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {presentA} vs {presentB}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Diferencia Tardanzas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${
                  diffLateAB < 0 ? 'text-emerald-700' : diffLateAB > 0 ? 'text-amber-700' : 'text-slate-800'
                }`}>
                  {diffLateAB > 0 ? `+${diffLateAB}` : diffLateAB}
                </span>
                <span className="text-xs text-slate-400 font-bold">tardanzas</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {lateA} vs {lateB}
              </p>
            </div>

            <div className="bg-gradient-to-br from-burgundy-900 to-burgundy-800 text-white p-4 rounded-2xl shadow-sm border border-lionGold-500/40">
              <span className="text-[10px] font-bold text-lionGold-300 uppercase">Alumnos con Cambios</span>
              <div className="text-2xl font-black text-white mt-1">
                {countDifferencesTotal}
              </div>
              <p className="text-[10px] text-burgundy-200 mt-0.5">
                {countAbsentB} faltaron en Día 2 • {countNewB} nuevos en Día 2
              </p>
            </div>
          </div>

          {/* FILTROS Y BUSCADOR */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setCompareDiffFilter('TODOS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  compareDiffFilter === 'TODOS'
                    ? 'bg-burgundy-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({comparisonItems.length})
              </button>
              <button
                type="button"
                onClick={() => setCompareDiffFilter('SOLO_DIFERENCIAS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  compareDiffFilter === 'SOLO_DIFERENCIAS'
                    ? 'bg-burgundy-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Solo con Diferencias ({countDifferencesTotal})
              </button>
              <button
                type="button"
                onClick={() => setCompareDiffFilter('FALTARON_B')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  compareDiffFilter === 'FALTARON_B'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                🔴 Faltaron en Día 2 ({countAbsentB})
              </button>
              <button
                type="button"
                onClick={() => setCompareDiffFilter('NUEVOS_B')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  compareDiffFilter === 'NUEVOS_B'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                🟢 Asistieron solo en Día 2 ({countNewB})
              </button>
              <button
                type="button"
                onClick={() => setCompareDiffFilter('CAMBIO_PUNTUALIDAD')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  compareDiffFilter === 'CAMBIO_PUNTUALIDAD'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                ⚠️ Varió Puntualidad ({countChangedPunctuality})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filtrar comparativa por nombre o número de DNI del alumno..."
                value={compareSearchQuery}
                onChange={(e) => setCompareSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-burgundy-700 shadow-xs"
              />
              {compareSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCompareSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* TABLA COMPARATIVA */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredComparison.length > 0 ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 bg-slate-50">
                    <tr>
                      <th className="py-2.5 px-3.5">Estudiante</th>
                      <th className="py-2.5 px-3.5">Aula</th>
                      <th className="py-2.5 px-3.5">Día 1 ({compareDateA})</th>
                      <th className="py-2.5 px-3.5">Día 2 ({compareDateB})</th>
                      <th className="py-2.5 px-3.5">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredComparison.map((item) => (
                      <tr key={item.dni} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3.5">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">DNI: {item.dni}</p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {item.gradeOrClass}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          {item.recordA ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.recordA.status === 'PRESENTE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.recordA.status}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500">({item.recordA.time})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">No registró</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {item.recordB ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.recordB.status === 'PRESENTE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.recordB.status}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500">({item.recordB.time})</span>
                            </div>
                          ) : (
                            <span className="text-rose-600 font-bold text-[10px]">No registró</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeClass}`}>
                            {item.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold text-slate-600">
                  No hay alumnos que coincidan con el filtro seleccionado.
                </p>
                <p className="text-[11px] text-slate-400">
                  Intenta con otro filtro de diferencias o verifica las fechas seleccionadas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
