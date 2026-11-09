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
  X,
  UserCheck,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

export default function GaritaTotemRoute() {
  const { currentUser, attendance, students, stats, refreshData } = useWhitman();
  const [dniScan, setDniScan] = useState('');
  const dniScanRef = useRef(dniScan);
  useEffect(() => {
    dniScanRef.current = dniScan;
  }, [dniScan]);

  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const soundEnabled = true;

  // Modo de escaneo: INGRESO (Entrada) o SALIDA (Despacho)
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

  // Ajustar modo inicial según horarios configurados en la base de datos
  useEffect(() => {
    fetchAttendanceScheduleApi()
      .then((sched) => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const current = `${hh}:${mm}`;
        if (current >= sched.exitStart) {
          setScanMode('SALIDA');
        } else {
          setScanMode('INGRESO');
        }
      })
      .catch(() => {
        const hour = new Date().getHours();
        setScanMode(hour >= 12 ? 'SALIDA' : 'INGRESO');
      });
  }, []);

  // 1. LISTENER GLOBAL: Permite escribir/escanear desde cualquier lugar de la pantalla sin tener que hacer clic en el cuadro de texto
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Permitir atajos del navegador con modificadores (Ctrl+C, Ctrl+V, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Atajo F2: Cambiar entre modo INGRESO y modo SALIDA
      if (e.key === 'F2') {
        e.preventDefault();
        setScanMode((prev) => (prev === 'INGRESO' ? 'SALIDA' : 'INGRESO'));
        inputRef.current?.focus();
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused = activeEl === inputRef.current;
      const isManualSearchFocused = activeEl === manualInputRef.current;

      // Si está escribiendo en el buscador manual o modal, no interceptar
      if (isManualSearchFocused || (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !isInputFocused)) {
        return;
      }

      // Si el foco ya está en el input principal, dejar que maneje Enter normalmente
      if (isInputFocused) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const targetDni = dniScanRef.current.trim();
          if (targetDni) {
            processScan(targetDni);
          }
        }
        return;
      }

      // SI EL FOCO ESTÁ FUERA DEL INPUT (en el fondo, tarjetas, etc.):
      if (e.key === 'Enter') {
        e.preventDefault();
        const targetDni = dniScanRef.current.trim();
        if (targetDni) {
          processScan(targetDni);
        }
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

      // Si es un caracter imprimible (letra, número, espacio):
      if (e.key.length === 1) {
        e.preventDefault();
        setDniScan((prev) => prev + e.key);
        inputRef.current?.focus();
        return;
      }
    };

    // Al hacer clic en cualquier lugar que no sea un botón/enlace interactivo, devolver el foco inmediatamente
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest('button, a, select, textarea, input');
      if (!isInteractive) {
        inputRef.current?.focus();
      }
    };

    const handleWindowFocus = () => {
      inputRef.current?.focus();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('click', handleGlobalClick);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Mantener el input visible enfocado automáticamente
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

      // Reproducir sonido de confirmación adecuado
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

      // Mantener visible la confirmación durante 8 segundos
      clearTimerRef.current = setTimeout(() => {
        setLastScanResult(null);
      }, 8000);
    } catch (err: any) {
      if (soundEnabled) {
        soundFX.playError();
      }
      setErrorMessage(err.message || 'Código de barras no reconocido');
      clearTimerRef.current = setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // Cambiar estado a Puntual directamente
  const handleQuickChangeToPuntual = async (recordId: string) => {
    try {
      await updateAttendanceStatus(recordId, 'PRESENTE', 'Corregido a puntual por Normas y Disciplina');
      refreshData();
      if (lastScanResult && lastScanResult.record.id === recordId) {
        setLastScanResult({
          ...lastScanResult,
          record: { ...lastScanResult.record, status: 'PRESENTE' },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  // Guardar justificación de asistencia
  const handleSaveJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justifyingRecord) return;
    setSavingJustification(true);
    try {
      await updateAttendanceStatus(
        justifyingRecord.id,
        'JUSTIFICADO',
        `Justificado: ${justificationReason}`
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

  // Contadores de hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter((a) => a.date?.startsWith(todayStr));
  const totalIngresos = todayAttendance.filter((a) => a.time).length;
  const totalSalidas = todayAttendance.filter((a) => Boolean(a.exitTime)).length;
  const totalPuntuales = todayAttendance.filter((a) => a.status === 'PRESENTE').length;
  const totalTardanzas = todayAttendance.filter((a) => a.status === 'TARDANZA').length;
  const totalJustificados = todayAttendance.filter((a) => a.status === 'JUSTIFICADO').length;

  // Filtrado de alumnos para búsqueda manual sin carnet físico
  const manualFilteredStudents = manualSearch.trim()
    ? students
        .filter(
          (s) =>
            s.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
            s.dni.includes(manualSearch.trim())
        )
        .slice(0, 6)
    : [];

  // PROTECCIÓN DE RUTA
  if (!isAuthorized) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-100 text-rose-900 flex items-center justify-center mx-auto border-2 border-rose-200 shadow-md">
          <Lock className="w-10 h-10 text-rose-700" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-50 px-3.5 py-1 rounded-full border border-rose-200">
            ACCESO RESTRINGIDO A GARITA
          </span>
          <h2 className="text-2xl font-black font-serif text-slate-900 mt-3">
            Módulo Reservado para Normas & Dirección
          </h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto mt-2 leading-relaxed">
            La pistola lectora física de códigos de barras está protegida para uso exclusivo del
            <span className="font-bold text-slate-900"> Jefe de Normas y Disciplina </span>
            o <span className="font-bold text-slate-900">Dirección General</span>.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-burgundy-900 hover:bg-burgundy-950 text-white font-black py-3 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs"
          >
            <ShieldCheck className="w-4 h-4 text-lionGold-400" />
            <span>Ingresar con Cuenta de Normas / Director</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-5 rounded-2xl transition text-xs"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Barra Superior con Botones de Navegación e Impresión */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-burgundy-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-burgundy-800" />
          <span>Volver al Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Botón de Impresión de Parte Diario Oficial */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 bg-burgundy-900 hover:bg-burgundy-850 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm"
            title="Generar formato oficial de parte diario para Normas y Disciplina"
          >
            <Printer className="w-4 h-4 text-lionGold-400" />
            <span>Imprimir Parte Diario Oficial</span>
          </button>

          {/* Botón de Pantalla Completa */}
          <button
            onClick={toggleFullScreen}
            className="p-2 sm:px-3.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-2 shadow-sm"
            title="Modo pantalla completa para tablet o monitor de portería"
          >
            <Maximize2 className="w-4 h-4 text-burgundy-800" />
            <span className="hidden sm:inline">Pantalla Completa</span>
          </button>
        </div>
      </div>

      {/* Flujo de Hoy: Ingresos y Salidas */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flujo Ingresos */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <LogIn className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              INGRESOS REGISTRADOS HOY ({todayStr})
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalIngresos} alumnos</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                {totalPuntuales} puntuales
              </span>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                {totalTardanzas} tardanzas
              </span>
              {totalJustificados > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-300">
                  {totalJustificados} justificados
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Flujo Salidas */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              SALIDAS REGISTRADAS HOY
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalSalidas} alumnos salieron</span>
              <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                Marcado de salida activo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Área Central: Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Columna Izquierda: Terminal Láser & Búsqueda Manual */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            
            {/* SELECTOR DE MODO: ENTRADA / SALIDA */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                <span>SELECCIONA QUÉ DESEAS REGISTRAR:</span>
                <span className="text-[11px] font-mono text-slate-400">Atajo: Tecla [F2]</span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setScanMode('INGRESO');
                    inputRef.current?.focus();
                  }}
                  className={`py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                    scanMode === 'INGRESO'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>🟢 MODO INGRESO</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScanMode('SALIDA');
                    inputRef.current?.focus();
                  }}
                  className={`py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                    scanMode === 'SALIDA'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>🟠 MODO SALIDA</span>
                </button>
              </div>
            </div>

            {/* Cabecera del Escáner */}
            <div className="flex items-center justify-between text-slate-800 font-bold pt-1">
              <div className="flex items-center gap-2">
                <ScanLine className={`w-5 h-5 animate-pulse ${scanMode === 'INGRESO' ? 'text-emerald-700' : 'text-amber-700'}`} />
                <span className="text-xs sm:text-sm">
                  {scanMode === 'INGRESO'
                    ? 'Pistola Láser lista para marcar INGRESO'
                    : 'Pistola Láser lista para marcar SALIDA'}
                </span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  scanMode === 'INGRESO'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}
              >
                ● {scanMode === 'INGRESO' ? 'ENTRADA' : 'SALIDA'} ACTIVA
              </span>
            </div>

            {/* Input de Lectura de Código de Barras */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  scanMode === 'INGRESO'
                    ? 'Pase carnet o digite DNI para INGRESO...'
                    : 'Pase carnet o digite DNI para SALIDA...'
                }
                value={dniScan}
                onChange={(e) => setDniScan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processScan(dniScan)}
                className={`w-full pl-5 pr-32 py-5 text-2xl font-mono font-black text-slate-900 border-4 rounded-2xl focus:outline-none focus:ring-4 shadow-inner ${
                  scanMode === 'INGRESO'
                    ? 'border-emerald-600 focus:ring-emerald-200'
                    : 'border-amber-500 focus:ring-amber-200'
                }`}
              />
              <button
                onClick={() => processScan(dniScan)}
                disabled={loading}
                className={`absolute right-3 top-3 bottom-3 text-white font-black px-6 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 ${
                  scanMode === 'INGRESO'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {loading ? 'Leyendo...' : 'ESCANEAR'}
              </button>
            </div>

            {/* BÚSQUEDA MANUAL PARA ALUMNOS SIN CARNET FÍSICO */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase tracking-wide">
                <span>Marcado Manual (Alumnos sin carnet físico):</span>
                {manualSearch && (
                  <button
                    type="button"
                    onClick={() => setManualSearch('')}
                    className="text-slate-400 hover:text-slate-700 text-[10px] font-bold"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  ref={manualInputRef}
                  type="text"
                  placeholder="Escribe el nombre o DNI del alumno sin carnet..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-100 bg-slate-50"
                />
              </div>

              {/* Lista Desplegable de Coincidencias */}
              {manualFilteredStudents.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-2 space-y-1.5 animate-in fade-in duration-100 max-h-56 overflow-y-auto">
                  {manualFilteredStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-2 border border-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{st.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          DNI: {st.dni} • {st.gradeOrClass}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => processScan(st.dni, 'INGRESO')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-xs transition"
                        >
                          🟢 Ingreso
                        </button>
                        <button
                          type="button"
                          onClick={() => processScan(st.dni, 'SALIDA')}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-xs transition"
                        >
                          🟠 Salida
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Información de Sincronización */}
          <div className="pt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100">
            <span>Sincronizado con Neon PostgreSQL en la nube</span>
            <span>Colegio Whitman • Portería Central</span>
          </div>
        </div>

        {/* Columna Derecha: Confirmación con Check Gigante */}
        <div className="flex flex-col">
          {lastScanResult ? (
            <div
              className={`h-full min-h-[400px] rounded-3xl p-6 sm:p-8 border-3 shadow-xl animate-in zoom-in-95 duration-150 flex flex-col items-center justify-center text-center space-y-5 ${
                lastScanResult.scanMode === 'SALIDA'
                  ? 'bg-amber-50/90 border-amber-400 text-amber-950'
                  : lastScanResult.record.status === 'PRESENTE'
                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                  : 'bg-amber-50/90 border-amber-400 text-amber-950'
              }`}
            >
              {/* Check Gigante */}
              <div className="relative">
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center shadow-xl border-4 ${
                    lastScanResult.scanMode === 'SALIDA'
                      ? 'bg-amber-500 border-white text-white'
                      : lastScanResult.record.status === 'PRESENTE'
                      ? 'bg-emerald-500 border-white text-white'
                      : 'bg-amber-500 border-white text-white'
                  }`}
                >
                  <CheckCircle2 className="w-18 h-18 sm:w-24 sm:h-24 drop-shadow-md stroke-[2.5]" />
                </div>
              </div>

              {/* Badge de Estado con Botón para Corregir en Vivo */}
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`font-black text-xs sm:text-sm px-5 py-1.5 rounded-full uppercase tracking-wider text-white shadow-sm inline-flex items-center gap-1.5 ${
                    lastScanResult.scanMode === 'SALIDA'
                      ? 'bg-amber-600'
                      : lastScanResult.record.status === 'PRESENTE'
                      ? 'bg-emerald-600'
                      : 'bg-amber-600'
                  }`}
                >
                  {lastScanResult.scanMode === 'SALIDA'
                    ? '✓ SALIDA CONFIRMADA'
                    : lastScanResult.record.status === 'PRESENTE'
                    ? '✓ INGRESO PUNTUAL CONFIRMADO'
                    : '⚠ REGISTRO CON TARDANZA'}
                </span>

                {/* Si marcó tardanza por error o tolerancia, botón para cambiar a puntual en 1 clic */}
                {lastScanResult.scanMode === 'INGRESO' && lastScanResult.record.status === 'TARDANZA' && (
                  <button
                    type="button"
                    onClick={() => handleQuickChangeToPuntual(lastScanResult.record.id)}
                    className="text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-3 py-1 rounded-full shadow-xs transition"
                  >
                    ✓ Cambiar a Puntual (Tolerancia)
                  </button>
                )}
              </div>

              {/* Nombre Gigante del Alumno */}
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-slate-900 leading-tight">
                  {lastScanResult.record.userName}
                </h2>
                <p className="text-base sm:text-lg font-bold text-burgundy-900">
                  {lastScanResult.record.gradeOrClass}
                </p>
              </div>

              {/* Detalles de DNI y Horas */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200/80 w-full max-w-sm text-xs font-mono font-bold text-slate-700">
                <span className="bg-white/90 px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                  DNI: {lastScanResult.record.userDni}
                </span>

                {lastScanResult.scanMode === 'SALIDA' ? (
                  <span className="bg-white/90 px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1 text-amber-900">
                    <LogOut className="w-3.5 h-3.5 text-amber-600" />
                    Salida: {lastScanResult.record.exitTime || lastScanResult.record.time}
                  </span>
                ) : (
                  <span className="bg-white/90 px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1 text-emerald-900">
                    <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                    Ingreso: {lastScanResult.record.time}
                  </span>
                )}
              </div>
            </div>
          ) : errorMessage ? (
            <div className="h-full min-h-[400px] rounded-3xl p-6 sm:p-8 border-3 border-rose-300 bg-rose-50 text-rose-950 flex flex-col items-center justify-center text-center space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
              <div className="w-24 h-24 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg border-4 border-white">
                <AlertCircle className="w-14 h-14 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
                  DNI NO ENCONTRADO
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-rose-900 mt-2">
                  No se pudo registrar asistencia
                </h3>
                <p className="text-xs text-rose-700 max-w-sm mx-auto">
                  {errorMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-3xl p-8 border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ScanLine className="w-12 h-12 text-slate-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-800">
                Esperando Registro • {scanMode === 'INGRESO' ? 'Entrada' : 'Salida'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Al escanear el carnet o buscar manualmente, aquí se mostrará el nombre del alumno y el check de confirmación de {scanMode === 'INGRESO' ? 'ingreso' : 'salida'} en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REGISTRO DE ASISTENCIAS DE HOY CON ACCIONES DIRECTAS EN VIVO */}
      {todayAttendance.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-serif">
                Últimos Registros del Día ({todayAttendance.length} alumnos registrados hoy)
              </h3>
              <p className="text-xs text-slate-500">
                Control de asistencia, corrección de tardanzas a puntual y justificación de faltas.
              </p>
            </div>
            <button
              onClick={() => setShowPrintModal(true)}
              className="text-xs font-bold text-burgundy-900 hover:underline flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Formato Oficial</span>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Hora In</th>
                  <th className="py-2.5 px-3">Hora Out</th>
                  <th className="py-2.5 px-3">Estudiante</th>
                  <th className="py-2.5 px-3">Aula</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAttendance.slice(0, 15).map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{att.time || '—'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-700">{att.exitTime || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{att.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">DNI: {att.userDni}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{att.gradeOrClass}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {att.status === 'TARDANZA' && (
                          <button
                            type="button"
                            onClick={() => handleQuickChangeToPuntual(att.id)}
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition"
                          >
                            Puntual
                          </button>
                        )}
                        {att.status !== 'JUSTIFICADO' && (
                          <button
                            type="button"
                            onClick={() => setJustifyingRecord(att)}
                            className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition"
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

      {/* ======================================================== */}
      {/* MODAL 1: JUSTIFICAR ASISTENCIA                           */}
      {/* ======================================================== */}
      {justifyingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-850 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Justificar Asistencia / Tardanza</h3>
              <button
                onClick={() => setJustifyingRecord(null)}
                className="text-burgundy-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJustification} className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Estudiante</span>
                <p className="text-sm font-black text-slate-900">{justifyingRecord.userName}</p>
                <p className="text-xs text-slate-500">
                  DNI: {justifyingRecord.userDni} • {justifyingRecord.gradeOrClass}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo de la Justificación *
                </label>
                <select
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-burgundy-700"
                >
                  <option value="Motivo de salud / cita médica">Motivo de salud / cita médica (certificado)</option>
                  <option value="Permiso por trámite personal o familiar">Permiso por trámite personal o familiar</option>
                  <option value="Tolerancia especial autorizada por Normas">Tolerancia especial autorizada por Normas</option>
                  <option value="Representación institucional / deportiva">Representación institucional / deportiva</option>
                  <option value="Fuerza mayor / transporte">Fuerza mayor / transporte</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJustifyingRecord(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingJustification}
                  className="bg-burgundy-900 hover:bg-burgundy-850 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingJustification ? 'Guardando...' : 'Confirmar Justificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PARTE DIARIO INSTITUCIONAL (IMPRIMIBLE)          */}
      {/* ======================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Header del Modal (Oculto al imprimir) */}
            <div className="bg-gradient-to-r from-burgundy-900 to-burgundy-850 px-6 py-4 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-lionGold-400" />
                <h3 className="font-bold text-base">Vista Previa • Parte Diario Oficial de Asistencia</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Documento</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-burgundy-200 hover:text-white text-lg font-bold px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* CONTENIDO IMPRIMIBLE OFICIAL */}
            <div className="p-8 sm:p-12 space-y-6 text-slate-900 bg-white" id="parte-diario-print">
              {/* Membrete Institucional */}
              <div className="border-b-2 border-burgundy-900 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black tracking-widest text-burgundy-900 uppercase">
                    I.E.P. WALT WHITMAN • LIMA - PERÚ
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black font-serif text-slate-900 mt-1">
                    PARTE DIARIO OFICIAL DE CONTROL DE ASISTENCIA Y PUNTUALIDAD
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Jefatura de Normas, Disciplina y Convivencia Escolar • Año Lectivo 2026
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-slate-700">
                  <p><strong>Fecha:</strong> {todayStr}</p>
                  <p><strong>Hora Emisión:</strong> {new Date().toLocaleTimeString('es-PE')}</p>
                </div>
              </div>

              {/* Resumen Estadístico */}
              <div className="grid grid-cols-4 gap-3 text-center border border-slate-200 rounded-2xl p-4 bg-slate-50">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Total Asistentes</span>
                  <span className="text-xl font-black text-slate-900">{totalIngresos}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase block">Puntuales</span>
                  <span className="text-xl font-black text-emerald-800">{totalPuntuales}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-amber-700 uppercase block">Tardanzas</span>
                  <span className="text-xl font-black text-amber-800">{totalTardanzas}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-blue-700 uppercase block">Justificados</span>
                  <span className="text-xl font-black text-blue-800">{totalJustificados}</span>
                </div>
              </div>

              {/* Tabla de Alumnos */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Hora Ingreso</th>
                      <th className="py-2 px-3">Hora Salida</th>
                      <th className="py-2 px-3">DNI</th>
                      <th className="py-2 px-3">Apellidos y Nombres</th>
                      <th className="py-2 px-3">Grado / Aula</th>
                      <th className="py-2 px-3">Estado</th>
                      <th className="py-2 px-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayAttendance.map((rec, index) => (
                      <tr key={rec.id}>
                        <td className="py-2 px-3 font-mono text-slate-400">{index + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold">{rec.time || '—'}</td>
                        <td className="py-2 px-3 font-mono">{rec.exitTime || '—'}</td>
                        <td className="py-2 px-3 font-mono">{rec.userDni}</td>
                        <td className="py-2 px-3 font-bold">{rec.userName}</td>
                        <td className="py-2 px-3">{rec.gradeOrClass}</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-[10px] uppercase">{rec.status}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 italic">{rec.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Firmas Institucionales */}
              <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-2" />
                  <p className="font-bold text-slate-900">Jefe de Normas y Disciplina</p>
                  <p className="text-[10px] text-slate-500">I.E.P. Walt Whitman</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-2" />
                  <p className="font-bold text-slate-900">Dirección General</p>
                  <p className="text-[10px] text-slate-500">I.E.P. Walt Whitman</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
