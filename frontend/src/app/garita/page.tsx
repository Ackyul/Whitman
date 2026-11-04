'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { WhitmanLionMascot } from '../../components/WhitmanLionMascot';
import { BarcodeCard } from '../../components/BarcodeCard';
import { markAttendance } from '../../lib/api';
import { soundFX } from '../../lib/soundFX';
import {
  ScanLine,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
  CreditCard,
  Users,
  Flame,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function GaritaTotemRoute() {
  const { currentUser, students, attendance, stats, refreshData } = useWhitman();
  const [dniScan, setDniScan] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<any | null>(null);

  const isAuthorized =
    currentUser &&
    currentUser.role === 'DOCENTE' &&
    (currentUser.hierarchy === 'JEFE_NORMAS' || currentUser.hierarchy === 'DIRECTOR');

  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // 1. LISTENER GLOBAL PARA PISTOLA LECTORA DE CÓDIGO DE BARRAS FÍSICA (USB/Bluetooth)
  // Las pistolas envían los caracteres a menos de 40ms por tecla y rematan con Enter.
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Si el usuario presiona Enter, procesar el buffer del escáner
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 8) {
          e.preventDefault();
          const scannedDni = barcodeBufferRef.current.slice(-8); // Tomar los 8 dígitos
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
          // Si pasó mucho tiempo entre teclas, es teclado manual, reiniciar buffer
          barcodeBufferRef.current = e.key;
        } else {
          // Es ráfaga de escáner láser
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

    try {
      const res = await markAttendance({
        dni: cleanDni,
        method: 'DNI_MANUAL', // Código de barras procesado por lector
      });

      const record = res.data;

      // Reproducir sonido con Web Audio API
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

      // Limpiar tarjeta después de 2.5 segundos para el siguiente alumno
      setTimeout(() => {
        setLastScanResult(null);
      }, 2500);
    } catch (err: any) {
      if (soundEnabled) {
        soundFX.playError();
      }
      setErrorMessage(err.message || 'Código de barras no reconocido');
      setTimeout(() => setErrorMessage(null), 3500);
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

  // Estimación sobre los 1000 alumnos
  const totalCapacity = 1000;
  const totalMarkedToday = stats?.todayAttendance.totalMarked || attendance.length;
  const progressPercent = Math.min(Math.round((totalMarkedToday / totalCapacity) * 100), 100);

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

      {/* Monitor de Aforo y Avance de Ingresos (Capacidad 1000 alumnos) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
            FLUJO DE INGRESO HOY (CAPACIDAD: 1,000 ALUMNOS)
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalMarkedToday} alumnos ingresaron</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              {stats?.todayAttendance.present || 0} puntuales
            </span>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
              {stats?.todayAttendance.late || 0} tardanzas
            </span>
          </div>
        </div>

        {/* Barra de progreso de asistencia */}
        <div className="w-full md:w-72">
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Aforo colegio:</span>
            <span>{totalMarkedToday} / {totalCapacity} ({progressPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-burgundy-800 to-lionGold-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Área Central de Escaneo y Feedback Gigante */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Terminal Principal */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 flex flex-col justify-between space-y-6">
          
          {/* Input con indicador de pistola */}
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
                {loading ? 'Leyendo...' : 'Escanear'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              💡 La pistola lectora USB funciona automáticamente aun si el cursor no está dentro de la caja de texto.
            </p>
          </div>

          {/* Tarjeta Gigante de Resultado en Pantalla */}
          {lastScanResult ? (
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-xl animate-in zoom-in-95 duration-150 flex flex-col sm:flex-row items-center gap-6 ${
                lastScanResult.record.status === 'PRESENTE'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-amber-50 border-amber-400 text-amber-950'
              }`}
            >
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-lg shrink-0">
                <img
                  src={lastScanResult.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt="Alumno"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <span
                    className={`font-black text-sm px-4 py-1 rounded-full uppercase tracking-wider text-white shadow-sm ${
                      lastScanResult.record.status === 'PRESENTE'
                        ? 'bg-emerald-600'
                        : 'bg-amber-600'
                    }`}
                  >
                    {lastScanResult.record.status === 'PRESENTE' ? '✓ INGRESO PUNTUAL' : '⚠ REGISTRO CON TARDANZA'}
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-700 bg-white/80 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {lastScanResult.record.time}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {lastScanResult.record.userName}
                </h3>
                <p className="text-sm font-bold text-burgundy-900">
                  {lastScanResult.record.gradeOrClass}
                </p>
                <p className="text-xs text-slate-500 font-mono font-bold">
                  DNI: {lastScanResult.record.userDni} • Código: {lastScanResult.user?.studentCode || 'WHT-2026'}
                </p>
              </div>

              <div className="text-center shrink-0">
                <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto mb-1 border border-slate-100">
                  {lastScanResult.record.status === 'PRESENTE' ? (
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  ) : (
                    <Clock className="w-10 h-10 text-amber-600" />
                  )}
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase">
                  Pase Concedido
                </span>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-center gap-4 animate-in fade-in">
              <AlertCircle className="w-10 h-10 text-rose-600 shrink-0" />
              <div>
                <p className="font-black text-lg">DNI no encontrado en el sistema</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
                <p className="text-[11px] text-slate-500 mt-1">Verifique que el alumno esté matriculado en la academia o colegio.</p>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl border-3 border-dashed border-slate-200 text-center text-slate-400 bg-slate-50/50">
              <ScanLine className="w-16 h-16 mx-auto mb-3 text-slate-300 animate-pulse" />
              <h3 className="text-lg font-black text-slate-700">Esperando pase de código de barras...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apunta la pistola lectora al código de barras del DNI o carnet físico del alumno.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-500 font-semibold shadow-sm">
                <span>Hora límite puntual: 08:00 AM</span>
                <span>•</span>
                <span>Tolerancia de garita: 5 min</span>
              </div>
            </div>
          )}

          <div className="pt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100">
            <span>Sincronizado con Neon PostgreSQL en la nube</span>
            <span>Academia y Colegio Whitman • Portería Central</span>
          </div>
        </div>

        {/* Panel Lateral: Simulador y Carnets Imprimibles */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Alumnos Listos para Probar (1-Clic)
              </h3>
              <span className="text-[10px] bg-lionGold-500/20 text-lionGold-800 font-bold px-2 py-0.5 rounded">
                Simulador
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Puedes hacer clic en un alumno para simular el disparo de la pistola lectora o ver su carnet con código de barras:
            </p>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {students.map((stu) => (
                <div
                  key={stu.id}
                  className="p-3 rounded-2xl border border-slate-200 hover:border-burgundy-400 hover:bg-burgundy-50/40 transition flex items-center justify-between group"
                >
                  <button
                    onClick={() => processScan(stu.dni)}
                    className="text-left min-w-0 flex-1 mr-2"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-burgundy-900 truncate">
                      {stu.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {stu.level === 'ACADEMIA' ? '🦁 Academia' : '🏫 Colegio'} • {stu.gradeOrClass}
                    </p>
                    <span className="font-mono text-[10px] text-slate-500 font-bold">
                      DNI: {stu.dni}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStudentForCard(stu)}
                    title="Ver e Imprimir Carnet Físico con Código de Barras"
                    className="p-2 text-slate-400 hover:text-burgundy-800 hover:bg-burgundy-100 rounded-xl transition shrink-0"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-burgundy-50 rounded-2xl border border-burgundy-200 text-center text-xs text-burgundy-900">
            <p className="font-bold">Capacidad Neon: 1,000+ Alumnos</p>
            <p className="text-[11px] text-burgundy-700 mt-0.5">
              Escaneo a escaneo sincronizado en tiempo real a la nube
            </p>
          </div>
        </div>

      </div>

      {/* Modal para ver e Imprimir Carnet con Código de Barras */}
      {selectedStudentForCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Carnet Oficial con Código de Barras
              </h3>
              <button
                onClick={() => setSelectedStudentForCard(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <BarcodeCard
              user={selectedStudentForCard}
              onPrint={() => window.print()}
            />

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Puedes imprimir este carnet en papel o mica para que la pistola lectora física lo escanee directamente.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
