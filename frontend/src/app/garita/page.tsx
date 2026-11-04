'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { WhitmanLionMascot } from '../../components/WhitmanLionMascot';
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
} from 'lucide-react';

export default function GaritaTotemRoute() {
  const { currentUser, attendance, stats, refreshData } = useWhitman();
  const [dniScan, setDniScan] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthorized =
    currentUser &&
    currentUser.role === 'DOCENTE' &&
    (currentUser.hierarchy === 'JEFE_NORMAS' || currentUser.hierarchy === 'DIRECTOR');

  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // 1. LISTENER GLOBAL PARA PISTOLA LECTORA DE CÓDIGO DE BARRAS FÍSICA (USB/Bluetooth)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

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
  }, []);

  // Mantener el input visible enfocado
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastScanResult]);

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
      });

      const record = res.data;

      // Reproducir sonido de confirmación
      if (soundEnabled) {
        if (record?.status === 'PRESENTE') {
          soundFX.playPuntual();
        } else {
          soundFX.playTardanza();
        }
      }

      setLastScanResult({
        record,
        user: res.user,
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

  const totalMarkedToday = stats?.todayAttendance?.totalMarked ?? attendance.length;

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
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-burgundy-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-burgundy-800" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      {/* Cabecera del Tótem de Entrada */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-lionGold-500/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-burgundy-900 rounded-2xl border border-lionGold-400/40 shadow-inner shrink-0">
            <WhitmanLionMascot size="lg" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-lionGold-500/20 text-lionGold-300 text-xs font-black px-3 py-0.5 rounded-full border border-lionGold-400/30 mb-1">
              <span>TORNIQUETE & PUERTA PRINCIPAL</span>
              <span>•</span>
              <span>PISTOLA LECTORA USB ACTIVA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight">
              Garita de Control Físico con Código de Barras
            </h1>
            <p className="text-xs text-burgundy-200 mt-0.5">
              Optimizado para escanear el DNI o Carnet con pistola lectora láser. Registra automáticamente en Neon.
            </p>
          </div>
        </div>

        {/* Controles de Garita */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl border transition flex items-center gap-2 text-xs font-bold ${
              soundEnabled
                ? 'bg-lionGold-500 text-burgundy-950 border-lionGold-400 shadow-md'
                : 'bg-burgundy-950/80 text-slate-400 border-slate-700'
            }`}
            title="Activar/Desactivar beeps de torniquete"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span>{soundEnabled ? 'Sonido ON' : 'Silencio'}</span>
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-3 bg-burgundy-950/80 hover:bg-burgundy-900 text-white rounded-2xl border border-lionGold-500/30 text-xs font-bold transition flex items-center gap-2"
            title="Modo pantalla completa para tablet o monitor de portería"
          >
            <Maximize2 className="w-5 h-5 text-lionGold-400" />
            <span className="hidden sm:inline">Pantalla Completa</span>
          </button>
        </div>
      </div>

      {/* Flujo de Ingresos de Hoy (Limpio, Sin Aforo) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
            FLUJO DE INGRESO HOY
          </span>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalMarkedToday} alumnos ingresaron</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              {stats?.todayAttendance?.present || 0} puntuales
            </span>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
              {stats?.todayAttendance?.late || 0} tardanzas
            </span>
          </div>
        </div>
      </div>

      {/* Área Central: Dos Columnas (Izquierda: Escáner Láser / Derecha: Confirmación con Check Gigante) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Columna Izquierda: Terminal Láser */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between text-slate-800 font-bold mb-3">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-burgundy-800 animate-pulse" />
                <span className="text-sm">Lector Láser Activo (Dispara el escáner sobre el código de barras)</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ● ESCÁNER LISTO
              </span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Pase el carnet físico o digite los 8 dígitos..."
                value={dniScan}
                onChange={(e) => setDniScan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processScan(dniScan)}
                className="w-full pl-5 pr-32 py-5 text-2xl font-mono font-black text-slate-900 border-4 border-burgundy-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-burgundy-200 shadow-inner"
              />
              <button
                onClick={() => processScan(dniScan)}
                disabled={loading}
                className="absolute right-3 top-3 bottom-3 bg-burgundy-800 hover:bg-burgundy-900 text-white font-black px-6 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50"
              >
                {loading ? 'Leyendo...' : 'ESCANEAR'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              💡 La pistola lectora USB funciona automáticamente aun si el cursor no está dentro de la caja de texto.
            </p>
          </div>

          {/* Información de Operación de Garita */}
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 bg-slate-50/50 space-y-3">
            <ScanLine className="w-12 h-12 mx-auto text-slate-300 animate-pulse" />
            <h3 className="text-base font-black text-slate-700">
              Terminal de Control de Asistencia Activo
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Apunta la pistola lectora al código de barras del DNI o carnet físico del alumno para registrar el ingreso al instante.
            </p>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-500 font-semibold shadow-sm">
              <span>Hora límite puntual: 08:00 AM</span>
              <span>•</span>
              <span>Tolerancia de garita: 5 min</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100">
            <span>Sincronizado con Neon PostgreSQL en la nube</span>
            <span>Academia y Colegio Whitman • Portería Central</span>
          </div>
        </div>

        {/* Columna Derecha: Confirmación de Alumno con Check Gigante */}
        <div className="flex flex-col">
          {lastScanResult ? (
            <div
              className={`h-full min-h-[380px] rounded-3xl p-6 sm:p-8 border-3 shadow-xl animate-in zoom-in-95 duration-150 flex flex-col items-center justify-center text-center space-y-5 ${
                lastScanResult.record.status === 'PRESENTE'
                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                  : 'bg-amber-50/90 border-amber-400 text-amber-950'
              }`}
            >
              {/* Check Gigante */}
              <div className="relative">
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center shadow-xl border-4 ${
                    lastScanResult.record.status === 'PRESENTE'
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
                    lastScanResult.record.status === 'PRESENTE'
                      ? 'bg-emerald-600'
                      : 'bg-amber-600'
                  }`}
                >
                  {lastScanResult.record.status === 'PRESENTE'
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

              {/* Detalles de DNI y Hora */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200/80 w-full max-w-xs text-xs font-mono font-bold text-slate-700">
                <span className="bg-white/90 px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                  DNI: {lastScanResult.record.userDni}
                </span>
                <span className="bg-white/90 px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {lastScanResult.record.time}
                </span>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="h-full min-h-[380px] rounded-3xl p-6 sm:p-8 border-3 border-rose-300 bg-rose-50 text-rose-950 flex flex-col items-center justify-center text-center space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
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
            <div className="h-full min-h-[380px] rounded-3xl p-8 border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ScanLine className="w-12 h-12 text-slate-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-800">
                Esperando Registro de Alumno
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Al escanear el carnet o DNI, aquí se mostrará el nombre del alumno y el check de confirmación de asistencia en tiempo real.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
