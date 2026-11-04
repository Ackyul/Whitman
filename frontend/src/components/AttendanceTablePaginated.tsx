'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '../types';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
} from 'lucide-react';

interface Props {
  records: AttendanceRecord[];
  title?: string;
}

export const AttendanceTablePaginated: React.FC<Props> = ({
  records,
  title = 'Tus Registros de Asistencia',
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Formatear Día y Fecha en español (ej: "Martes, 03/11/2026")
  const formatDayAndDate = (dateStr: string): { dayName: string; formattedDate: string } => {
    if (!dateStr) return { dayName: '—', formattedDate: '—' };
    try {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const d = new Date(year, month - 1, day);
        const dayName = d.toLocaleDateString('es-PE', { weekday: 'long' });
        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        return {
          dayName: capitalizedDay,
          formattedDate,
        };
      }
    } catch {
      // fallback
    }
    return { dayName: 'Día', formattedDate: dateStr };
  };

  // Ordenar los registros por fecha y hora descendente (el más reciente primero)
  const sortedRecords = [...records].sort((a, b) => {
    const dateTimeA = `${a.date}T${a.time || '00:00:00'}`;
    const dateTimeB = `${b.date}T${b.time || '00:00:00'}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  const totalRecords = sortedRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Asegurar página válida
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const currentRecords = sortedRecords.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
      
      {/* Cabecera de la Tabla con Paginación Informativa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-burgundy-900" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Historial con día de la semana, hora exacta de escaneo y método de acceso.
          </p>
        </div>

        {/* Indicador de límite de 10 en 10 */}
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200">
            {totalRecords > 0 ? (
              <>Mostrando <span className="text-burgundy-900 font-black">{startIndex + 1}-{endIndex}</span> de <span className="font-black">{totalRecords}</span></>
            ) : (
              '0 registros'
            )}
          </span>
        </div>
      </div>

      {/* Tabla con Día y Hora Exacta */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3.5">Día y Fecha</th>
              <th className="px-4 py-3.5">Hora Ingreso</th>
              <th className="px-4 py-3.5">Hora Salida</th>
              <th className="px-4 py-3.5">Estado</th>
              <th className="px-4 py-3.5">Método de Marcado</th>
              <th className="px-4 py-3.5">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                  No hay registros de asistencia en este período.
                </td>
              </tr>
            ) : (
              currentRecords.map((rec) => {
                const { dayName, formattedDate } = formatDayAndDate(rec.date);
                const isLate = rec.status === 'TARDANZA';

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* DÍA Y FECHA FORMATEADOS */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {dayName}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {formattedDate}
                        </span>
                      </div>
                    </td>

                    {/* HORA INGRESO */}
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-800 text-xs sm:text-sm bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{rec.time || '00:00:00'}</span>
                      </div>
                    </td>

                    {/* HORA SALIDA */}
                    <td className="px-4 py-3.5">
                      {rec.exitTime ? (
                        <div className="inline-flex items-center gap-1.5 font-mono font-bold text-amber-900 text-xs sm:text-sm bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{rec.exitTime}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Pendiente
                        </span>
                      )}
                    </td>

                    {/* ESTADO CON BOLITA/BADGE */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full ${
                          isLate
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isLate ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                        />
                        <span>{rec.status}</span>
                      </span>
                    </td>

                    {/* MÉTODO */}
                    <td className="px-4 py-3.5 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        <ScanLine className="w-3 h-3 text-burgundy-800" />
                        <span>
                          {rec.method === 'DNI_MANUAL'
                            ? 'DNI en Garita'
                            : rec.method === 'QR'
                            ? 'Código de Barras'
                            : rec.method}
                        </span>
                      </span>
                    </td>

                    {/* OBSERVACIÓN */}
                    <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                      {rec.notes || 'Ingreso registrado en portería'}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CONTROLES DE PAGINACIÓN DE 10 EN 10 */}
      {totalPages > 1 && (
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          <span className="text-slate-500">
            Página <span className="font-bold text-slate-800">{validPage}</span> de{' '}
            <span className="font-bold text-slate-800">{totalPages}</span> (10 por página)
          </span>

          <div className="flex items-center gap-1.5">
            {/* Botón Anterior */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={validPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === validPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-burgundy-900 text-white shadow-sm font-black'
                        : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Botón Siguiente */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={validPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
