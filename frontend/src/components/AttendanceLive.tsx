'use client';

import React, { useState } from 'react';
import {
  AttendanceRecord,
  AttendanceStatus,
  EducationLevel,
  User,
  WhitmanStats,
} from '../types';
import {
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Sparkles,
  UserCheck,
  Building,
  School,
  Flame,
} from 'lucide-react';
import { markAttendance, updateAttendanceStatus } from '../lib/api';

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
  const [dniInput, setDniInput] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'QR' | 'DNI_MANUAL' | 'BIOMETRICO'>('QR');
  const [filterLevel, setFilterLevel] = useState<'TODOS' | EducationLevel>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | AttendanceStatus>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manejar el marcado de asistencia
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

  const handleChangeStatus = async (id: string, newStatus: AttendanceStatus) => {
    try {
      await updateAttendanceStatus(id, newStatus, 'Actualizado desde panel en vivo');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  // Filtrado de registros
  const filteredRecords = records.filter((r) => {
    if (filterLevel !== 'TODOS' && r.level !== filterLevel) return false;
    if (filterStatus !== 'TODOS' && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.userName.toLowerCase().includes(q);
      const matchDni = r.userDni.includes(q);
      const matchClass = r.gradeOrClass.toLowerCase().includes(q);
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
          <p className="text-[11px] text-slate-400 mt-1">Ingreso antes de las 08:00 AM</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-amber-500 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Tardanzas</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-black text-slate-800">
            {stats?.todayAttendance.late ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Con tolerancia de garita</p>
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

      {/* Terminal de Marcación Rápida en Vivo */}
      <div className="bg-white rounded-2xl shadow-md border border-burgundy-100 overflow-hidden">
        <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lionGold-500/20 flex items-center justify-center border border-lionGold-400/30">
              <QrCode className="w-6 h-6 text-lionGold-400" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Garita de Control en Vivo • Marcación Whitman
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  REAL-TIME
                </span>
              </h2>
              <p className="text-xs text-burgundy-200">
                Pase de lista instantáneo mediante lector QR o número de DNI
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
              Lector QR
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

          {/* Botones de simulación con alumnos de prueba rápidos */}
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
        </div>
      </div>

      {/* Listado en vivo con filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Cabecera y Filtros */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>Registro de Asistencia del Día</span>
              <span className="bg-burgundy-100 text-burgundy-900 font-bold text-xs px-2.5 py-0.5 rounded-full">
                {filteredRecords.length} ingresos
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Sincronizado en tiempo real vía WebSockets
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
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

            {/* Filtro Nivel */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
            >
              <option value="TODOS">Todos los niveles</option>
              <option value="ACADEMIA">🦁 Academia Preuniversitaria</option>
              <option value="COLEGIO">🏫 Colegio Whitman</option>
            </select>

            {/* Filtro Estado */}
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

        {/* Tabla en tiempo real */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No se encontraron registros de asistencia con estos filtros.</p>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-burgundy-100 text-burgundy-800 font-bold flex items-center justify-center text-xs border border-burgundy-200 shrink-0">
                          {item.userName.charAt(0)}
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
                          <div className="text-xs text-slate-400 font-mono">DNI: {item.userDni}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {item.level === 'ACADEMIA' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-burgundy-900 bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">
                            <Building className="w-3 h-3 text-burgundy-700" />
                            Academia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            <School className="w-3 h-3 text-indigo-700" />
                            Colegio
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{item.gradeOrClass}</div>
                    </td>

                    <td className="px-4 py-4 font-mono font-semibold text-slate-800">
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

                    <td className="px-4 py-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                        {item.method}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {item.notes || '—'}
                    </td>

                    <td className="px-4 py-4 text-right">
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
    </div>
  );
};

