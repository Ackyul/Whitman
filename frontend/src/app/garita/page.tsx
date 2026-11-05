'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { markAttendance } from '../../lib/api';
import { soundFX } from '../../lib/soundFX';
import {
  ScanLine,
  CheckCircle2,
  Clock,
  AlertCircle,
  Maximize2,
  Volume2,
  VolumeX,
  Lock,
  ArrowLeft,
  ShieldCheck,
  LogIn,
  LogOut,
} from 'lucide-react';

export default function GaritaTotemRoute() {
  const { currentUser, attendance, stats, refreshData } = useWhitman();
  const [dniScan, setDniScan] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modo de escaneo: INGRESO (Entrada) o SALIDA (Despacho)
  const [scanMode, setScanMode] = useState<'INGRESO' | 'SALIDA'>('INGRESO');

  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthorized =
    currentUser &&
    currentUser.role === 'DOCENTE' &&
    (currentUser.hierarchy === 'JEFE_NORMAS' || currentUser.hierarchy === 'DIRECTOR');

  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Ajustar modo inicial según hora del día (antes de mediodía = INGRESO, después = SALIDA)
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12) {
      setScanMode('SALIDA');
    } else {
      setScanMode('INGRESO');
    }
  }, []);

  // 1. LISTENER GLOBAL PARA PISTOLA LECTORA DE CÓDIGO DE BARRAS FÍSICA (USB/Bluetooth) Y TECLA F2
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Tecla rápida F2 para alternar entre MODO INGRESO y MODO SALIDA
      if (e.key === 'F2') {
        e.preventDefault();
        setScanMode((prev) => (prev === 'INGRESO' ? 'SALIDA' : 'INGRESO'));
        return;
      }

      // Si el usuario presiona Enter, procesar el buffer del escáner
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 8) {
          e.preventDefault();
          const scannedDni = barcodeBufferRef.current.slice(-8);
          barcodeBufferRef.current = '';
          processScan(scannedDni);
          return;
        }
        barcodeBufferRef.current = '';
        return;
      }

      // Si es un número, acumular en el buffer de la pistola
      if (/^\d$/.test(e.key)) {
        if (diff > 250) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [scanMode]);

  // Mantener el input visible enfocado
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastScanResult, scanMode]);

  const processScan = async (dniToProcess: string) => {
    const cleanDni = dniToProcess.trim();
    if (!cleanDni || loading) return;

    setLoading(true);
    setErrorMessage(null);

    // Cancelar cualquier temporizador de limpieza anterior
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    try {
      const res = await markAttendance({
        dni: cleanDni,
        method: 'DNI_MANUAL',
        scanType: scanMode,
      });

      const record = res.data;

      // Reproducir sonido de confirmación adecuado
      if (soundEnabled) {
        if (scanMode === 'SALIDA') {
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
        scanMode,
        timestamp: new Date().toLocaleTimeString('es-PE'),
      });

      setDniScan('');
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
      inputRef.current?.focus();
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

  // PROTECCIÓN DE RUTA: Solo Jefe de Normas y Disciplina o Dirección General
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
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-burgundy-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-burgundy-800" />
          <span>Volver al Dashboard</span>
        </Link>

        {/* Controles de Garita */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-2 text-xs font-bold ${
              soundEnabled
                ? 'bg-lionGold-500 text-burgundy-950 border-lionGold-400 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
            title="Activar/Desactivar beeps de torniquete"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sonido ON' : 'Silencio'}</span>
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-2 sm:px-3 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-2 shadow-sm"
            title="Modo pantalla completa para tablet o monitor de portería"
          >
            <Maximize2 className="w-4 h-4 text-burgundy-800" />
            <span className="hidden sm:inline">Pantalla Completa</span>
          </button>
        </div>
      </div>

      {/* Flujo de Hoy: Ingresos y Salidas (Sin Aforo) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flujo Ingresos */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <LogIn className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              INGRESOS REGISTRADOS HOY
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalIngresos} alumnos</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                {stats?.todayAttendance?.present || 0} puntuales
              </span>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                {stats?.todayAttendance?.late || 0} tardanzas
              </span>
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

      {/* Área Central: Dos Columnas (Izquierda: Selector Entrada/Salida & Escáner / Derecha: Confirmación con Check Gigante) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Columna Izquierda: Terminal Láser */}
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
            <p className="text-[11px] text-slate-400">
              💡 La pistola lectora USB funciona automáticamente aun si el cursor no está dentro de la caja de texto.
            </p>
          </div>

          {/* Información de Operación de Garita */}
          <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 bg-slate-50/50 space-y-2.5">
            <ScanLine className="w-10 h-10 mx-auto text-slate-300 animate-pulse" />
            <h3 className="text-sm font-black text-slate-700">
              Terminal de Garita Whitman • {scanMode === 'INGRESO' ? 'Ingreso Matutino' : 'Marcado de Salida'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {scanMode === 'INGRESO'
                ? 'Apunta la pistola lectora al código de barras del carnet para registrar la entrada del alumno.'
                : 'Apunta la pistola lectora al código de barras del carnet para marcar la salida y retiro del alumno.'}
            </p>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 text-[11px] text-slate-500 font-semibold shadow-sm">
              <span>Ingreso puntual: hasta 08:05 AM</span>
              <span>•</span>
              <span>Salida: Todo el turno escolar</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100">
            <span>Sincronizado con Neon PostgreSQL en la nube</span>
            <span>Colegio Whitman • Portería Central</span>
          </div>
        </div>

        {/* Columna Derecha: Confirmación de Alumno con Check Gigante */}
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

              {/* Badge de Estado */}
              <div>
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
              <p className="text-[11px] text-slate-500 font-medium">
                Verifique que el alumno esté matriculado en la base de datos de Whitman.
              </p>
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
                Al escanear el carnet o DNI, aquí se mostrará el nombre del alumno y el check de confirmación de {scanMode === 'INGRESO' ? 'ingreso' : 'salida'} en tiempo real.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
