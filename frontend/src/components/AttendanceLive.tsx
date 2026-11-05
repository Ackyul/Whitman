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
  ChevronDown,
  ChevronUp,
  Search,
  Building,
  School,
  ClipboardList,
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
  stats,
  onRefresh,
}) => {
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

  // Opción colapsable para ver los registros del día (por defecto OCULTO)
  const [showDailyRecords, setShowDailyRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'TODOS' | EducationLevel>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | AttendanceStatus>('TODOS');

  // Cargar configuración de horarios al montar
  useEffect(() => {
    fetchAttendanceScheduleApi()
      .then((data) => {
        if (data) setSchedule(data);
      })
      .catch((err) => console.error('Error cargando horario de asistencia:', err));
  }, []);

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

  // Filtrado de registros para la vista opcional
  const filteredRecords = records.filter((r) => {
    if (filterLevel !== 'TODOS' && r.level !== filterLevel) return false;
    if (filterStatus !== 'TODOS' && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
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

  return (
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

      {/* PANEL DE CONFIGURACIÓN DE HORARIOS DE ENTRADA Y SALIDA */}
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

      {/* BOTÓN OPCIONAL: VER REGISTRO DEL DÍA (NO SALE DE UNA, SOLO SI SE QUIERE) */}
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDailyRecords(!showDailyRecords)}
            className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-5 py-3 rounded-2xl shadow-sm transition"
          >
            <ClipboardList className="w-4 h-4 text-burgundy-900" />
            <span>
              {showDailyRecords
                ? 'Ocultar Registro del Día'
                : `Ver Registro de Asistencia del Día (${filteredRecords.length} ingresos)`}
            </span>
            {showDailyRecords ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* CONTENEDOR DESPLEGABLE DE REGISTROS (SOLO SI SE ACTIVA LA OPCIÓN) */}
        {showDailyRecords && (
          <div className="mt-4 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all">
            
            {/* Cabecera y Filtros */}
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span>Registro de Asistencia del Día</span>
                  <span className="bg-burgundy-100 text-burgundy-900 font-bold text-xs px-2.5 py-0.5 rounded-full">
                    {filteredRecords.length} registros
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Consulta detallada del personal y alumnos que han marcado hoy
                </p>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar alumno o aula..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-burgundy-600 w-44"
                  />
                </div>

                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
                >
                  <option value="TODOS">Todos los niveles</option>
                  <option value="ACADEMIA">🦁 Academia</option>
                  <option value="COLEGIO">🏫 Colegio</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="PRESENTE">Presentes</option>
                  <option value="TARDANZA">Tardanzas</option>
                  <option value="FALTA">Faltas</option>
                  <option value="JUSTIFICADO">Justificados</option>
                </select>
              </div>
            </div>

            {/* Tabla de registros */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Estudiante</th>
                    <th className="px-4 py-3.5">Nivel / Aula</th>
                    <th className="px-4 py-3.5">Ingreso / Salida</th>
                    <th className="px-4 py-3.5">Método</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5">Observación</th>
                    <th className="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">No hay registros de asistencia con estos filtros.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          idx === 0 ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-burgundy-100 text-burgundy-800 font-bold flex items-center justify-center text-xs border border-burgundy-200 shrink-0">
                              {item.userName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{item.userName}</span>
                                {idx === 0 && (
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
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-burgundy-900 bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">
                                <Building className="w-3 h-3 text-burgundy-700" />
                                Academia
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                <School className="w-3 h-3 text-indigo-700" />
                                Colegio
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.gradeOrClass}</div>
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
                            {item.method}
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
                                className="text-xs text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded transition"
                              >
                                Puntual
                              </button>
                            )}
                            {item.status !== 'JUSTIFICADO' && (
                              <button
                                onClick={() => handleChangeStatus(item.id, 'JUSTIFICADO')}
                                title="Justificar tardanza/falta"
                                className="text-xs text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition"
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
      </div>

    </div>
  );
};
