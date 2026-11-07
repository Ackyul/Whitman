'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCheck,
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react';

interface Props {
  attendanceRecords: AttendanceRecord[];
  studentName?: string;
  studentDni?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const AttendanceMonthCalendar: React.FC<Props> = ({
  attendanceRecords,
  studentName,
  studentDni,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDayRecord, setSelectedDayRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Navegación de mes
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDayRecord(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDayRecord(null);
  };

  const handleGoToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDayRecord(null);
  };

  // Días del mes
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // En JavaScript getDay(): 0 es Domingo, 1 es Lunes... lo ajustamos a 0 = Lunes, 6 = Domingo
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  // Filtrar asistencias del mes actual (normalizando fecha a YYYY-MM)
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthAttendance = attendanceRecords.filter((rec) => rec.date?.startsWith(monthPrefix));

  // Estadísticas del mes
  const totalPresente = monthAttendance.filter((r) => r.status === 'PRESENTE').length;
  const totalTardanza = monthAttendance.filter((r) => r.status === 'TARDANZA').length;
  const totalSalidas = monthAttendance.filter((r) => Boolean(r.exitTime)).length;

  // Formato para comparar fecha de hoy
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
      
      {/* 1. CABECERA CON NOMBRE CLARO DEL MES Y AÑO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-burgundy-900 bg-burgundy-50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-burgundy-200">
              <CalendarIcon className="w-3 h-3 text-burgundy-800" />
              <span>Calendario de Asistencia</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              • Mes Oficial
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-burgundy-950 tracking-tight">
              Mes de {MONTH_NAMES[currentMonth]}
            </h2>
            <span className="text-lg sm:text-xl font-black text-lionGold-600 font-mono">
              {currentYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro mensual de entradas y salidas de {studentName || 'Estudiante'}
          </p>
        </div>

        {/* Controles de Navegación */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-bold text-burgundy-950 bg-lionGold-100 hover:bg-lionGold-200 border border-lionGold-300 rounded-xl transition shadow-xs"
          >
            Mes Actual
          </button>
          
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold font-mono text-slate-700 min-w-16 text-center">
              {MONTH_NAMES[currentMonth].slice(0, 3)}
            </span>
            <button
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SELECTOR DE MESES: PÍLDORAS PARA SALTAR A CUALQUIER MES DEL AÑO */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-500 uppercase flex items-center gap-1">
            <span>📅 Seleccionar Mes:</span>
          </span>
          <span className="font-bold text-burgundy-900">
            Viendo: {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
        </div>

        {/* Barra horizontal desplazable con los 12 meses */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
          {MONTH_NAMES.map((mName, idx) => {
            const isSelectedMonth = idx === currentMonth;
            const isRealCurrentMonth = idx === today.getMonth() && currentYear === today.getFullYear();
            
            return (
              <button
                key={mName}
                type="button"
                onClick={() => {
                  setCurrentMonth(idx);
                  setSelectedDayRecord(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  isSelectedMonth
                    ? 'bg-burgundy-900 text-white shadow font-black ring-2 ring-lionGold-400/50'
                    : isRealCurrentMonth
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{mName}</span>
                {isRealCurrentMonth && !isSelectedMonth && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" title="Mes en curso" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. LEYENDA RÁPIDA COMPACTA: PUNTUALES, TARDANZAS Y SALIDAS */}
      <div className="flex flex-wrap items-center justify-between text-xs bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 gap-2">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            Resumen de {MONTH_NAMES[currentMonth]}:
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            {totalPresente} Puntuales
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            {totalTardanza} Tardanzas
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-lionGold-500 inline-block" />
            {totalSalidas} Salidas Registradas
          </span>
        </div>
        <span className="text-slate-400 font-medium hidden sm:inline text-[11px]">
          Haz clic en un día para ver detalle de Ingreso y Salida
        </span>
      </div>

      {/* 3. GRILLA COMPACTA (Lunes a Domingo) */}
      <div className="space-y-1">
        <div className="grid grid-cols-7 text-center font-bold text-[10px] text-slate-400 uppercase py-1 border-b border-slate-100">
          {DAY_NAMES.map((name, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-slate-300' : ''}>
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 sm:h-14 rounded-xl bg-slate-50/40 opacity-20" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
            const record = monthAttendance.find((rec) => rec.date === dateStr);
            const isToday = dateStr === todayDateStr;
            const isSelected = dateStr === selectedDateStr;
            const hasMarked = Boolean(record);
            const isLate = record?.status === 'TARDANZA';
            const hasExit = Boolean(record?.exitTime);

            return (
              <div
                key={dayNum}
                onClick={() => {
                  setSelectedDateStr(dateStr);
                  setSelectedDayRecord(record || null);
                }}
                className={`h-12 sm:h-14 p-1 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-burgundy-900 bg-burgundy-50 ring-2 ring-burgundy-800'
                    : isToday
                    ? 'border-lionGold-500 bg-amber-50/50'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between leading-none">
                  <span className={`text-[10px] font-bold ${isToday ? 'text-burgundy-900 font-black' : 'text-slate-600'}`}>
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-lionGold-500" />
                  )}
                </div>

                {/* Bolita compacta con check y badge de salida */}
                <div className="flex items-center justify-center my-auto relative">
                  {hasMarked ? (
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white font-black shadow-sm ${
                        isLate ? 'bg-amber-500 ring-1 ring-amber-200' : 'bg-emerald-600 ring-1 ring-emerald-200'
                      }`}
                      title={`${record?.status} a las ${record?.time}${hasExit ? ` • Salida: ${record?.exitTime}` : ''}`}
                    >
                      {hasExit ? (
                        <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      ) : (
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-200">•</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DETALLE RÁPIDO SI SE SELECCIONA UN DÍA (INGRESO Y SALIDA) */}
      {selectedDayRecord ? (
        <div className="bg-gradient-to-r from-burgundy-950 to-burgundy-900 text-white p-4 rounded-2xl text-xs space-y-3 animate-in fade-in border border-lionGold-500/30">
          <div className="flex items-center justify-between border-b border-burgundy-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                Fecha: {selectedDayRecord.date}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  selectedDayRecord.status === 'PRESENTE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}
              >
                {selectedDayRecord.status}
              </span>
            </div>

            <span className="text-[10px] bg-burgundy-900 px-2 py-0.5 rounded border border-lionGold-400/30 font-mono text-lionGold-300">
              Método: {selectedDayRecord.method}
            </span>
          </div>

          {/* Dos tarjetas: Ingreso y Salida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Hora de Ingreso */}
            <div className="bg-burgundy-900/60 p-3 rounded-xl border border-burgundy-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                    🟢 Hora de Ingreso
                  </span>
                  <span className="font-mono font-black text-sm text-white">
                    {selectedDayRecord.time || '—'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-300 font-bold">
                {selectedDayRecord.status === 'PRESENTE' ? 'Puntual' : 'Tardanza'}
              </span>
            </div>

            {/* Hora de Salida */}
            <div className="bg-burgundy-900/60 p-3 rounded-xl border border-burgundy-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">
                    🟠 Hora de Salida
                  </span>
                  <span className="font-mono font-black text-sm text-white">
                    {selectedDayRecord.exitTime ? selectedDayRecord.exitTime : 'Sin registrar'}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold ${
                  selectedDayRecord.exitTime ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                {selectedDayRecord.exitTime ? 'Salida confirmada' : 'Pendiente'}
              </span>
            </div>
          </div>

          {selectedDayRecord.notes && (
            <p className="text-[11px] text-burgundy-200 italic pt-1 border-t border-burgundy-800/50">
              Observación: {selectedDayRecord.notes}
            </p>
          )}
        </div>
      ) : selectedDateStr ? (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 p-3.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <span>Fecha seleccionada: <span className="font-mono font-bold text-slate-800">{selectedDateStr}</span></span>
          <span className="text-slate-400 font-medium">No se registran marcas de ingreso ni salida para este día.</span>
        </div>
      ) : null}

    </div>
  );
};
