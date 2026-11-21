'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { markAttendance, updateAttendanceStatus, fetchAttendanceScheduleApi } from '../../lib/api';
import { soundFX } from '../../lib/soundFX';
import {
  ScanLine,
  CheckCircle2,
  Clock,
  AlertCircle,
  Maximize2,
  Lock,
  ArrowLeft,
  ShieldCheck,
  LogIn,
  LogOut,
  Search,
  Printer,
  Check,
} from 'lucide-react';

export default function GaritaTotemRoute() {
  const { currentUser, attendance, students, refreshData } = useWhitman();
  const [dniScan, setDniScan] = useState('');
  const dniScanRef = useRef(dniScan);
  useEffect(() => {
    dniScanRef.current = dniScan;
  }, [dniScan]);

  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const soundEnabled = true;

  // Modo de escaneo: INGRESO o SALIDA
  const [scanMode, setScanMode] = useState<'INGRESO' | 'SALIDA'>('INGRESO');

  // Búsqueda Manual para alumnos sin carnet físico
  const [manualSearch, setManualSearch] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Modal para Justificar Asistencia
  const [justifyingRecord, setJustifyingRecord] = useState<any | null>(null);
  const [justificationReason, setJustificationReason] = useState('Motivo de salud / cita médica');
  const [savingJustification, setSavingJustification] = useState(false);

  // Modal de Impresión del Parte Diario Oficial
  const [showPrintModal, setShowPrintModal] = useState(false);

  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthorized =
    currentUser &&
    currentUser.role === 'DOCENTE' &&
    (currentUser.hierarchy === 'JEFE_NORMAS' || currentUser.hierarchy === 'DIRECTOR');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttendanceScheduleApi()
      .then((sched) => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const current = `${hh}:${mm}`;
        setScanMode(current >= sched.exitStart ? 'SALIDA' : 'INGRESO');
      })
      .catch(() => {
        const hour = new Date().getHours();
        setScanMode(hour >= 12 ? 'SALIDA' : 'INGRESO');
      });
  }, []);

  // Escucha global de teclado (pistola lectora o tecleo)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setScanMode((prev) => (prev === 'INGRESO' ? 'SALIDA' : 'INGRESO'));
        inputRef.current?.focus();
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused = activeEl === inputRef.current;
      const isManualSearchFocused = activeEl === manualInputRef.current;

      if (isManualSearchFocused || (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !isInputFocused)) {
        return;
      }

      if (isInputFocused) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const targetDni = dniScanRef.current.trim();
          if (targetDni) processScan(targetDni);
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const targetDni = dniScanRef.current.trim();
        if (targetDni) processScan(targetDni);
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setDniScan((prev) => prev.slice(0, -1));
        inputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setDniScan('');
        inputRef.current?.focus();
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        setDniScan((prev) => prev + e.key);
        inputRef.current?.focus();
        return;
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest('button, a, select, textarea, input');
      if (!isInteractive) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [scanMode]);

  const processScan = async (rawDni: string, forcedMode?: 'INGRESO' | 'SALIDA') => {
    const cleanDni = rawDni.trim();
    if (!cleanDni) return;

    const currentMode = forcedMode || scanMode;

    setLoading(true);
    setErrorMessage(null);

    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    try {
      const res = await markAttendance({
        dni: cleanDni,
        method: 'DNI_MANUAL',
        scanType: currentMode,
      });

      const record = res.data;

      if (soundEnabled) {
        if (currentMode === 'SALIDA') {
          soundFX.playSalida();
        } else if (record?.status === 'PRESENTE') {
          soundFX.playPuntual();
        } else {
          soundFX.playTardanza();
        }
      }

      setLastScanResult({
        record,
        user: res.user,
        scanMode: currentMode,
        timestamp: new Date().toLocaleTimeString('es-PE'),
      });

      setDniScan('');
      setManualSearch('');
      refreshData();

      clearTimerRef.current = setTimeout(() => {
        setLastScanResult(null);
      }, 7000);
    } catch (err: any) {
      if (soundEnabled) {
        soundFX.playError();
      }
      setErrorMessage(err.message || 'DNI o carnet no reconocido');
      clearTimerRef.current = setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleQuickChangeToPuntual = async (recordId: string) => {
    try {
      await updateAttendanceStatus(recordId, 'PRESENTE', 'Corregido a puntual');
      refreshData();
      if (lastScanResult && lastScanResult.record.id === recordId) {
        setLastScanResult({
          ...lastScanResult,
          record: { ...lastScanResult.record, status: 'PRESENTE' },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Error al actualizar');
    }
  };

  const handleSaveJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justifyingRecord) return;
    setSavingJustification(true);
    try {
      await updateAttendanceStatus(
        justifyingRecord.id,
        'JUSTIFICADO',
        justificationReason
      );
      setJustifyingRecord(null);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error al justificar');
    } finally {
      setSavingJustification(false);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter((a) => a.date?.startsWith(todayStr));
  const totalIngresos = todayAttendance.filter((a) => a.time).length;
  const totalSalidas = todayAttendance.filter((a) => Boolean(a.exitTime)).length;
  const totalPuntuales = todayAttendance.filter((a) => a.status === 'PRESENTE').length;
  const totalTardanzas = todayAttendance.filter((a) => a.status === 'TARDANZA').length;
  const totalJustificados = todayAttendance.filter((a) => a.status === 'JUSTIFICADO').length;

  const manualFilteredStudents = manualSearch.trim()
    ? students
        .filter(
          (s) =>
            s.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
            s.dni.includes(manualSearch.trim())
        )
        .slice(0, 5)
    : [];

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-8 h-8 text-rose-700" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          Acceso Restringido a Garita
        </h2>
        <p className="text-sm text-slate-600">
          Este módulo es de uso exclusivo para el Jefe de Normas y Disciplina o Dirección.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-burgundy-900 hover:bg-burgundy-950 text-white font-bold py-2.5 px-5 rounded-xl transition text-sm"
        >
          <ShieldCheck className="w-4 h-4 text-lionGold-400" />
          <span>Iniciar Sesión</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Barra Superior Simple */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-burgundy-800" />
          <span>Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-1.5 bg-burgundy-900 hover:bg-burgundy-850 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-lionGold-400" />
            <span>Imprimir Parte Diario</span>
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition shadow-xs"
            title="Pantalla Completa"
          >
            <Maximize2 className="w-4 h-4 text-burgundy-800" />
          </button>
        </div>
      </div>

      {/* Resumen Simple de Asistencia de Hoy */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase block">Ingresos Hoy</span>
          <span className="text-2xl font-black text-slate-900">{totalIngresos}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase block">Puntuales</span>
          <span className="text-2xl font-black text-emerald-800">{totalPuntuales}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-amber-700 uppercase block">Tardanzas</span>
          <span className="text-2xl font-black text-amber-800">{totalTardanzas}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase block">Salidas</span>
          <span className="text-2xl font-black text-slate-900">{totalSalidas}</span>
        </div>
      </div>

      {/* Área Central: Terminal y Confirmación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Terminal de Escaneo */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          {/* Selector de Entrada / Salida */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setScanMode('INGRESO');
                inputRef.current?.focus();
              }}
              className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                scanMode === 'INGRESO'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>🟢 Entrada</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('SALIDA');
                inputRef.current?.focus();
              }}
              className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                scanMode === 'SALIDA'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>🟠 Salida</span>
            </button>
          </div>

          {/* Cuadro Principal de Escaneo */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={scanMode === 'INGRESO' ? 'Escanear carnet o escribir DNI...' : 'Marcar salida con carnet o DNI...'}
              value={dniScan}
              onChange={(e) => setDniScan(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processScan(dniScan)}
              className={`w-full pl-4 pr-28 py-4 text-xl font-mono font-bold text-slate-900 border-2 rounded-2xl focus:outline-none shadow-xs ${
                scanMode === 'INGRESO'
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                  : 'border-amber-500 focus:ring-2 focus:ring-amber-200'
              }`}
            />
            <button
              onClick={() => processScan(dniScan)}
              disabled={loading}
              className={`absolute right-2 top-2 bottom-2 text-white font-bold px-4 rounded-xl text-xs transition disabled:opacity-50 ${
                scanMode === 'INGRESO'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {loading ? '...' : 'Registrar'}
            </button>
          </div>

          {/* Búsqueda Manual Rápida para Alumnos sin Carnet */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="text-xs font-bold text-slate-600">
              ¿Alumno sin carnet? Buscar por nombre o DNI:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={manualInputRef}
                type="text"
                placeholder="Escribe el nombre del alumno..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-burgundy-700 bg-slate-50"
              />
            </div>

            {manualFilteredStudents.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-1.5 space-y-1">
                {manualFilteredStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 border border-slate-100"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{st.name}</p>
                      <p className="text-xs text-slate-400 font-mono">DNI: {st.dni} • {st.gradeOrClass}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => processScan(st.dni, 'INGRESO')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg"
                      >
                        Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => processScan(st.dni, 'SALIDA')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg"
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta de Confirmación Gigante */}
        <div className="flex flex-col">
          {lastScanResult ? (
            <div
              className={`h-full min-h-[300px] rounded-3xl p-6 border-2 shadow-sm flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-100 ${
                lastScanResult.scanMode === 'SALIDA'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : lastScanResult.record.status === 'PRESENTE'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-300 text-amber-950'
              }`}
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow text-white ${
                  lastScanResult.scanMode === 'SALIDA'
                    ? 'bg-amber-500'
                    : lastScanResult.record.status === 'PRESENTE'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              >
                <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <span
                  className={`font-black text-xs px-4 py-1 rounded-full uppercase text-white shadow-xs ${
                    lastScanResult.scanMode === 'SALIDA'
                      ? 'bg-amber-600'
                      : lastScanResult.record.status === 'PRESENTE'
                      ? 'bg-emerald-600'
                      : 'bg-amber-600'
                  }`}
                >
                  {lastScanResult.scanMode === 'SALIDA'
                    ? '✓ Salida Registrada'
                    : lastScanResult.record.status === 'PRESENTE'
                    ? '✓ Ingreso Puntual'
                    : '⚠ Ingreso con Tardanza'}
                </span>
                <h2 className="text-2xl font-black text-slate-900 pt-1">
                  {lastScanResult.record.userName}
                </h2>
                <p className="text-sm font-bold text-burgundy-900">
                  {lastScanResult.record.gradeOrClass} • DNI: {lastScanResult.record.userDni}
                </p>
              </div>

              {lastScanResult.scanMode === 'INGRESO' && lastScanResult.record.status === 'TARDANZA' && (
                <button
                  type="button"
                  onClick={() => handleQuickChangeToPuntual(lastScanResult.record.id)}
                  className="text-xs font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 px-3 py-1 rounded-full shadow-xs"
                >
                  ✓ Cambiar a Puntual
                </button>
              )}
            </div>
          ) : errorMessage ? (
            <div className="h-full min-h-[300px] rounded-3xl p-6 border-2 border-rose-300 bg-rose-50 text-rose-950 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow">
                <AlertCircle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black text-rose-900">No se pudo registrar</h3>
              <p className="text-xs text-rose-700">{errorMessage}</p>
            </div>
          ) : (
            <div className="h-full min-h-[300px] rounded-3xl p-8 border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center space-y-2">
              <ScanLine className="w-12 h-12 text-slate-300 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-700">Listo para escanear</h3>
              <p className="text-xs text-slate-400">
                Pasa el carnet por el lector o escribe el DNI para marcar {scanMode === 'INGRESO' ? 'entrada' : 'salida'}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla Rápida de Registros de Hoy */}
      {todayAttendance.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">
              Registros de Hoy ({todayAttendance.length})
            </h3>
            <button
              onClick={() => setShowPrintModal(true)}
              className="text-xs font-bold text-burgundy-900 hover:underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Parte</span>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Hora</th>
                  <th className="py-2 px-3">Alumno</th>
                  <th className="py-2 px-3">Aula</th>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAttendance.slice(0, 15).map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-700">{att.time || '—'}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{att.userName}</td>
                    <td className="py-2 px-3 text-slate-500">{att.gradeOrClass}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                          att.status === 'PRESENTE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.status === 'TARDANZA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {att.status === 'TARDANZA' && (
                          <button
                            type="button"
                            onClick={() => handleQuickChangeToPuntual(att.id)}
                            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                          >
                            Puntual
                          </button>
                        )}
                        {att.status !== 'JUSTIFICADO' && (
                          <button
                            type="button"
                            onClick={() => setJustifyingRecord(att)}
                            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200"
                          >
                            Justificar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Justificación */}
      {justifyingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">Justificar Asistencia</h3>
            <p className="text-xs text-slate-600 font-semibold">{justifyingRecord.userName} ({justifyingRecord.gradeOrClass})</p>

            <form onSubmit={handleSaveJustification} className="space-y-3">
              <select
                value={justificationReason}
                onChange={(e) => setJustificationReason(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white"
              >
                <option value="Motivo de salud / cita médica">Motivo de salud / cita médica</option>
                <option value="Permiso por trámite personal o familiar">Permiso por trámite familiar</option>
                <option value="Tolerancia autorizada por Normas">Tolerancia autorizada</option>
                <option value="Fuerza mayor / transporte">Fuerza mayor / transporte</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJustifyingRecord(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingJustification}
                  className="bg-burgundy-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Imprimible */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-5 my-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <h3 className="font-bold text-sm text-slate-800">Parte Diario Oficial de Asistencia</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-burgundy-900 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 text-slate-900" id="parte-diario-print">
              <div className="border-b pb-3 text-center">
                <h1 className="text-xl font-black font-serif">I.E.P. WALT WHITMAN</h1>
                <p className="text-xs font-bold text-slate-600">PARTE DIARIO DE ASISTENCIA Y PUNTUALIDAD</p>
                <p className="text-xs text-slate-400">Fecha: {todayStr} • Hora: {new Date().toLocaleTimeString('es-PE')}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div><strong>Total:</strong> {totalIngresos}</div>
                <div className="text-emerald-800"><strong>Puntuales:</strong> {totalPuntuales}</div>
                <div className="text-amber-800"><strong>Tardanzas:</strong> {totalTardanzas}</div>
                <div className="text-blue-800"><strong>Justificados:</strong> {totalJustificados}</div>
              </div>

              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold border-b">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Hora</th>
                    <th className="p-2">DNI</th>
                    <th className="p-2">Alumno</th>
                    <th className="p-2">Aula</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {todayAttendance.map((rec, i) => (
                    <tr key={rec.id}>
                      <td className="p-2 text-slate-400">{i + 1}</td>
                      <td className="p-2 font-mono font-bold">{rec.time || '—'}</td>
                      <td className="p-2 font-mono">{rec.userDni}</td>
                      <td className="p-2 font-bold">{rec.userName}</td>
                      <td className="p-2">{rec.gradeOrClass}</td>
                      <td className="p-2 uppercase font-bold">{rec.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 w-36 mx-auto pt-1" />
                  <p className="font-bold">Normas y Disciplina</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-36 mx-auto pt-1" />
                  <p className="font-bold">Dirección General</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
