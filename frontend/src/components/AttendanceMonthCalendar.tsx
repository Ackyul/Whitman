'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  ScanLine,
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

  // Filtrar asistencias del mes actual
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthAttendance = attendanceRecords.filter((rec) => rec.date?.startsWith(monthPrefix));

  // Estadísticas del mes
  const totalPresente = monthAttendance.filter((r) => r.status === 'PRESENTE').length;
  const totalTardanza = monthAttendance.filter((r) => r.status === 'TARDANZA').length;

  // Formato para comparar fecha de hoy
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
      
      {/* 1. CABECERA COMPACTA: MES, AÑO Y CONTROLES */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-burgundy-900 font-bold text-[11px] uppercase tracking-wider">
            <CalendarIcon className="w-3.5 h-3.5 text-burgundy-800" />
            <span>Calendario Mensual</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
        </div>

        {/* Controles de Navegación */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGoToday}
            className="px-2.5 py-1 text-[11px] font-bold text-burgundy-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Hoy
          </button>
          
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. LEYENDA RÁPIDA COMPACTA */}
      <div className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            {totalPresente} Puntuales
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            {totalTardanza} Tardanzas
          </span>
        </div>
        <span className="text-slate-400 font-medium hidden sm:inline">
          Bolita con check = Asistió
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

                {/* Bolita compacta con check */}
                <div className="flex items-center justify-center my-auto">
                  {hasMarked ? (
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white font-black shadow-sm ${
                        isLate ? 'bg-amber-500 ring-1 ring-amber-200' : 'bg-emerald-600 ring-1 ring-emerald-200'
                      }`}
                      title={`${record?.status} a las ${record?.time}`}
                    >
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
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

      {/* 4. DETALLE RÁPIDO SI SE SELECCIONA UN DÍA */}
      {selectedDayRecord && (
        <div className="bg-gradient-to-r from-burgundy-950 to-burgundy-900 text-white p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
                selectedDayRecord.status === 'TARDANZA' ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">
                {selectedDayRecord.date} — {selectedDayRecord.status}
              </p>
              <p className="text-[11px] text-burgundy-200">
                Hora: <span className="font-mono font-bold text-lionGold-300">{selectedDayRecord.time}</span> • {selectedDayRecord.notes || 'Ingreso en garita'}
              </p>
            </div>
          </div>

          <span className="text-[10px] bg-burgundy-900 px-2 py-1 rounded border border-lionGold-400/30 font-mono text-lionGold-300 shrink-0">
            {selectedDayRecord.method}
          </span>
        </div>
      )}

    </div>
  );
};
