'use client';

import React from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { AttendanceLive } from '../../components/AttendanceLive';
import { WhitmanLionMascot } from '../../components/WhitmanLionMascot';
import { AttendanceMonthCalendar } from '../../components/AttendanceMonthCalendar';
import { AttendanceTablePaginated } from '../../components/AttendanceTablePaginated';
import {
  Users,
  GraduationCap,
  CheckCircle2,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  LogIn,
  LogOut,
} from 'lucide-react';

export default function AsistenciaRoute() {
  const {
    attendance,
    students,
    stats,
    refreshData,
    loading,
    currentUser,
    linkedStudents,
  } = useWhitman();

  if (loading) {
    return (
      <div className="bg-white p-16 rounded-3xl text-center border border-slate-200 shadow-sm">
        <div className="animate-spin w-10 h-10 border-4 border-burgundy-800 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="font-bold text-slate-700">Cargando módulo de asistencia en tiempo real...</p>
      </div>
    );
  }

  // 1. VISTA PARA EL PADRE DE FAMILIA / APODERADO
  if (currentUser?.role === 'PADRE') {
    const student = linkedStudents.length > 0 ? linkedStudents[0] : null;
    const studentAttendance = attendance.filter((a) => a.userId === student?.id || a.userDni === student?.dni);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = studentAttendance.find((a) => a.date === today);

    return (
      <div className="space-y-6">
        
        {/* Calendario mensual de asistencias del hijo */}
        <AttendanceMonthCalendar
          attendanceRecords={studentAttendance}
          studentName={student?.name || 'Hijo(a)'}
          studentDni={student?.dni}
        />

        {/* Tarjeta de Resumen del Hijo */}
        {student ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-burgundy-100 border-2 border-lionGold-400/50 shrink-0">
                  <img
                    src={student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase bg-burgundy-100 text-burgundy-900 px-2 py-0.5 rounded">
                    {student.level === 'ACADEMIA' ? '🦁 Academia Preuniversitaria' : '🏫 Colegio'}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">{student.name}</h2>
                  <p className="text-xs text-slate-500">
                    {student.gradeOrClass} • <span className="font-mono font-bold">DNI: {student.dni}</span> • Código: <span className="font-mono font-bold text-burgundy-800">{student.studentCode || 'WHT-2026'}</span>
                  </p>
                </div>
              </div>

              {/* Estado de Hoy */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                {todayRecord ? (
                  <>
                    {todayRecord.status === 'PRESENTE' ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Asistencia de Hoy</p>
                      <p className="text-sm font-black text-slate-900">
                        {todayRecord.status} ({todayRecord.time})
                      </p>
                      <p className="text-[11px] text-slate-500">{todayRecord.notes || 'Ingreso registrado en portería'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Asistencia de Hoy</p>
                      <p className="text-sm font-bold text-slate-700">Aún no registra ingreso</p>
                      <p className="text-[11px] text-slate-400">Garita activa desde las 07:00 AM</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Historial paginado de 10 en 10 con día y hora exacta */}
            <AttendanceTablePaginated
              records={studentAttendance}
              title="Historial de Asistencias del Hijo"
            />
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
            <p className="font-bold text-slate-700">No tienes ningún hijo vinculado a este DNI.</p>
          </div>
        )}

      </div>
    );
  }

  // Helper para calcular los días de la semana actual (Lunes a Sábado)
  const getDaysOfCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    // 0 es Domingo, 1 es Lunes...
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diffToMonday);

    const weekDays = [];
    const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    for (let i = 0; i < 6; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];
      weekDays.push({
        label: dayLabels[i],
        dateStr,
        dayNum: current.getDate(),
        monthNum: current.getMonth() + 1,
      });
    }
    return weekDays;
  };

  // 2. VISTA PARA EL ALUMNO
  if (currentUser?.role === 'ALUMNO') {
    const studentAttendance = attendance.filter((a) => a.userId === currentUser.id || a.userDni === currentUser.dni);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = studentAttendance.find((a) => a.date === today);
    const currentWeekDays = getDaysOfCurrentWeek();

    return (
      <div className="space-y-6">
        
        {/* FILA SUPERIOR: CALENDARIO COMPACTO A LA IZQUIERDA + CUADRO HOY Y LISTA SEMANAL A LA DERECHA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Izquierda (7 columnas): Calendario compacto */}
          <div className="lg:col-span-7">
            <AttendanceMonthCalendar
              attendanceRecords={studentAttendance}
              studentName={currentUser.name}
              studentDni={currentUser.dni}
            />
          </div>

          {/* Derecha (5 columnas): Cuadro de asistencia hoy + lista rápida de la semana */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Cuadro: Si hubo asistencia hoy y a qué hora */}
            <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
              todayRecord
                ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border-emerald-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Asistencia de Hoy ({today})
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    todayRecord
                      ? todayRecord.status === 'PRESENTE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {todayRecord ? todayRecord.status : 'Pendiente'}
                </span>
              </div>

              <div className="pt-3 flex items-center gap-3.5">
                {todayRecord ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Ingreso Confirmado en Garita</p>
                      <p className="text-xl font-black font-mono text-slate-900 leading-tight">
                        {todayRecord.time}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {todayRecord.notes || 'Entrada registrada en portería con código de barras en DNI'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <Clock className="w-7 h-7 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold">Sin Registro de Ingreso</p>
                      <p className="text-base font-black text-slate-700 leading-tight">
                        Aún no has registrado asistencia hoy
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Pasa tu carnet o DNI por la pistola lectora de portería
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Abajo de ese cuadro: Lista rápida de esa semana */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-burgundy-900" />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Lista Rápida de Esta Semana
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Lunes a Sábado</span>
              </div>

              <div className="space-y-1.5">
                {currentWeekDays.map((item) => {
                  const rec = studentAttendance.find((r) => r.date === item.dateStr);
                  const isToday = item.dateStr === today;
                  const isFuture = item.dateStr > today;

                  return (
                    <div
                      key={item.dateStr}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                        isToday ? 'bg-amber-50/80 border border-amber-200/80 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            rec
                              ? rec.status === 'TARDANZA'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                              : isToday
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({item.dayNum}/{item.monthNum})
                        </span>
                      </div>

                      <div>
                        {rec ? (
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                              rec.status === 'TARDANZA'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{rec.time?.slice(0, 5)}</span>
                          </span>
                        ) : isFuture ? (
                          <span className="text-[10px] text-slate-400 italic">Pendiente</span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Y RECIÉN SALDRÁ ESTA PARTE: TUS REGISTROS DE ASISTENCIA (PAGINADO DE 10 EN 10) */}
        <AttendanceTablePaginated
          records={studentAttendance}
          title="Tus Registros de Asistencia"
        />

      </div>
    );
  }

  // 3. VISTA PARA DOCENTES Y DIRECCIÓN (Vista completa de control)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-burgundy-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-burgundy-800" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-serif">
            Control de Asistencia en Tiempo Real
          </h1>
          <p className="text-xs text-slate-500">
            Registro con lector QR, DNI portería o biométrico para Colegio y Academia Preuniversitaria Whitman.
          </p>
        </div>
      </div>

      <AttendanceLive
        records={attendance}
        students={students}
        stats={stats}
        onRefresh={refreshData}
      />
    </div>
  );
}
