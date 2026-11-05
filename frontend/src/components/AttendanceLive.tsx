'use client';

import React, { useState, useEffect } from 'react';
import {
  AttendanceRecord,
  User,
  WhitmanStats,
} from '../types';
import {
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  UserCheck,
  Flame,
  Save,
  LogIn,
  LogOut,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  markAttendance,
  fetchAttendanceScheduleApi,
  saveAttendanceScheduleApi,
  AttendanceSchedule,
} from '../lib/api';

interface AttendanceLiveProps {
  records: AttendanceRecord[];
  students: User[];
  stats: WhitmanStats | null;
  onRefresh: () => void;
}

export const AttendanceLive: React.FC<AttendanceLiveProps> = ({
  students,
  stats,
  onRefresh,
}) => {
  const [dniInput, setDniInput] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'QR' | 'DNI_MANUAL' | 'BIOMETRICO'>('QR');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        desc: `Alumnos marcando ahora quedarán como PUNTUAL (hasta las ${schedule.entryEnd})`,
        icon: LogIn,
      };
    } else if (current > schedule.entryEnd && current <= schedule.entryTolerance) {
      return {
        label: 'ENTRADA CON TARDANZA ACTIVA',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        desc: `Alumnos marcando ahora quedarán con TARDANZA (tolerancia hasta las ${schedule.entryTolerance})`,
        icon: Clock,
      };
    } else if (current >= schedule.exitStart && current <= schedule.exitEnd) {
      return {
        label: 'SALIDA DE ALUMNOS ACTIVA',
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        desc: `Alumnos marcando ahora registrarán su HORA DE SALIDA (hasta las ${schedule.exitEnd})`,
        icon: LogOut,
      };
    } else if (current > schedule.entryTolerance && current < schedule.exitStart) {
      return {
        label: 'HORARIO DE CLASES REGULAR',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
        desc: `Fuera del horario estándar de entrada. Nuevos escaneos se registrarán como tardanza o salida según corresponda.`,
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

  // Manejar el marcado de asistencia inteligente ("solo para que marquen")
  const handleMark = async (dniToMark?: string) => {
    const targetDni = (dniToMark || dniInput).trim();
    if (!targetDni) {
      setFeedback({ type: 'error', message: 'Por favor ingresa o selecciona un número de DNI.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await markAttendance({
        dni: targetDni,
        method: selectedMethod,
        scanType: 'AUTO',
      });

      setFeedback({
        type: 'success',
        message: response.message || '¡Asistencia registrada con éxito!',
      });
      setDniInput('');
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo registrar la asistencia.',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 5000);
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

      {/* Terminal de Marcación Rápida en Vivo ("Solo para que marquen") */}
      <div className="bg-white rounded-2xl shadow-md border border-burgundy-100 overflow-hidden">
        <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lionGold-500/20 flex items-center justify-center border border-lionGold-400/30">
              <QrCode className="w-6 h-6 text-lionGold-400" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Garita & Marcación de Asistencia
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  MODO INTELIGENTE
                </span>
              </h2>
              <p className="text-xs text-burgundy-200">
                Pase de lista instantáneo: solo pasan su carnet o DNI y el sistema detecta entrada o salida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-burgundy-950/60 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSelectedMethod('QR')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedMethod === 'QR' ? 'bg-lionGold-500 text-burgundy-950 font-bold' : 'text-burgundy-200'
              }`}
            >
              Lector QR / Láser
            </button>
            <button
              onClick={() => setSelectedMethod('DNI_MANUAL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedMethod === 'DNI_MANUAL' ? 'bg-lionGold-500 text-burgundy-950 font-bold' : 'text-burgundy-200'
              }`}
            >
              DNI Manual
            </button>
            <button
              onClick={() => setSelectedMethod('BIOMETRICO')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedMethod === 'BIOMETRICO' ? 'bg-lionGold-500 text-burgundy-950 font-bold' : 'text-burgundy-200'
              }`}
            >
              Biométrico
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Mensaje de feedback tras marcar */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Formulario de entrada */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ingresa o escanea el DNI del alumno (Ej: 72345671)..."
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMark()}
                className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-200 text-slate-800 font-mono font-medium outline-none transition-all placeholder:text-slate-400"
              />
              <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-mono">
                {dniInput.length}/8
              </span>
            </div>

            <button
              onClick={() => handleMark()}
              disabled={loading}
              className="bg-burgundy-800 hover:bg-burgundy-900 active:scale-95 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Registrando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-lionGold-400" />
                  <span>Marcar Asistencia</span>
                </>
              )}
            </button>
          </div>

          {/* Botones de prueba rápida con alumnos */}
          {students.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                <span>⚡ Marcado de prueba rápida (1-clic):</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {students.slice(0, 5).map((stu) => (
                  <button
                    key={stu.id}
                    onClick={() => handleMark(stu.dni)}
                    className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 hover:border-burgundy-300 border border-slate-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-700 font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-lionGold-500"></span>
                    <span>{stu.name.split(' ')[0]} ({stu.level === 'ACADEMIA' ? 'Academia' : 'Colegio'})</span>
                    <span className="font-mono text-[10px] text-slate-400">[{stu.dni}]</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
              Define los rangos horarios exactos. Los alumnos solo necesitan marcar con su carnet o DNI; el sistema detecta automáticamente la entrada o salida según estos límites.
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
                  <span>ℹ️ Funcionamiento Automático:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Si un estudiante ya registró su entrada por la mañana, cualquier marcado dentro de este rango guardará automáticamente su hora de salida sin requerir cambio de modo.
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
  );
};
