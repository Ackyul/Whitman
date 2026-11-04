'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { UserRole } from '../../types';
import {
  LogIn,
  GraduationCap,
  Users,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useWhitman();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ALUMNO');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (idToUse?: string) => {
    const finalId = (idToUse || identifier).trim();
    if (!finalId) {
      setErrorMsg('Por favor ingresa tu número de DNI o código.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await login(finalId, selectedRole);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } else {
      setErrorMsg(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-10 space-y-4">
      
      <div className="flex items-center justify-between px-2">
        <Link
          href="/"
          className="text-xs font-bold text-slate-500 hover:text-burgundy-900 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Cabecera Vino Borgoña */}
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 p-6 sm:p-7 text-white text-center border-b-2 border-lionGold-500/40 relative">
          <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
            Ingreso al Aula Virtual
          </h1>
          <p className="text-xs text-burgundy-200 max-w-sm mx-auto mt-1.5">
            Control de asistencia en tiempo real para Alumnos, Padres de Familia y Profesores.
          </p>
        </div>

        {/* Pestañas de Selección de Rol */}
        <div className="grid grid-cols-3 p-2 bg-slate-100 border-b border-slate-200 gap-1.5 text-xs font-bold">
          <button
            onClick={() => {
              setSelectedRole('ALUMNO');
              setErrorMsg(null);
            }}
            className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
              selectedRole === 'ALUMNO'
                ? 'bg-white text-burgundy-900 shadow-sm border border-burgundy-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-5 h-5 text-burgundy-800" />
            <span>Soy Alumno</span>
          </button>

          <button
            onClick={() => {
              setSelectedRole('PADRE');
              setErrorMsg(null);
            }}
            className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
              selectedRole === 'PADRE'
                ? 'bg-white text-burgundy-900 shadow-sm border border-burgundy-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-5 h-5 text-amber-600" />
            <span>Soy Papá / Mamá</span>
          </button>

          <button
            onClick={() => {
              setSelectedRole('DOCENTE');
              setErrorMsg(null);
            }}
            className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
              selectedRole === 'DOCENTE'
                ? 'bg-white text-burgundy-900 shadow-sm border border-burgundy-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-indigo-700" />
            <span>Profesor</span>
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 sm:p-8 space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg} Ingresando a tu dashboard seguro...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {selectedRole === 'ALUMNO' && 'DNI o Código de Estudiante (WHT-...)'}
              {selectedRole === 'PADRE' && 'DNI del Padre de Familia / Apoderado'}
              {selectedRole === 'DOCENTE' && 'DNI de Profesor o Directivo'}
            </label>
            <input
              type="text"
              placeholder={
                selectedRole === 'ALUMNO'
                  ? 'Ej: 72345671 o WHT-2026-001'
                  : selectedRole === 'PADRE'
                  ? 'Ej: 40112233 (DNI del apoderado)'
                  : 'Ej: 20000001 (DNI del profesor)'
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-200 text-slate-900 font-mono font-bold text-base outline-none transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              {selectedRole === 'ALUMNO' && 'Accede directamente a tu dashboard para ver tus asistencias del ciclo y avisos.'}
              {selectedRole === 'PADRE' && 'Ingresa con tu propio DNI para ver en tiempo real el ingreso y récord de tu hijo.'}
              {selectedRole === 'DOCENTE' && 'Ingresa para pasar asistencia y registrar calificaciones.'}
            </p>
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={loading}
            className="w-full bg-burgundy-800 hover:bg-burgundy-900 active:scale-95 text-white font-black py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Verificando credenciales...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-lionGold-400" />
                <span>Ingresar al Aula Virtual</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          {/* Accesos rápidos de prueba (1-clic) */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ⚡ Cuentas de Demostración para Pruebas Rápidas:
            </span>

            {selectedRole === 'ALUMNO' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('72345671');
                    handleLogin('72345671');
                  }}
                  className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  🦁 Academia: Sebastián (UNI) - 72345671
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('75432101');
                    handleLogin('75432101');
                  }}
                  className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  🏫 Secundaria: Gabriel (5to Sec) - 75432101
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('78912301');
                    handleLogin('78912301');
                  }}
                  className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  🎒 Primaria: Joaquín (6to Prim) - 78912301
                </button>
              </div>
            )}

            {selectedRole === 'PADRE' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('40112233');
                    handleLogin('40112233');
                  }}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Papá de Sebastián y Joaquín (DNI: 40112233)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('40556677');
                    handleLogin('40556677');
                  }}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Papá de Gabriel (Secundaria) (DNI: 40556677)</span>
                </button>
              </div>
            )}

            {selectedRole === 'DOCENTE' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('10000001');
                    handleLogin('10000001');
                  }}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5"
                >
                  <span>👑 Director General (DNI: 10000001)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('20000004');
                    handleLogin('20000004');
                  }}
                  className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5"
                >
                  <span>🛡️ Jefe de Normas / Garita (DNI: 20000004)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('20000001');
                    handleLogin('20000001');
                  }}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold transition"
                >
                  <span>📚 Coordinador Académico (DNI: 20000001)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('20000002');
                    handleLogin('20000002');
                  }}
                  className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  <span>👩‍🏫 Profesora de Ciencias (DNI: 20000002)</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              ¿Eres alumno nuevo y aún no tienes carnet?{' '}
              <Link
                href="/registro"
                className="text-burgundy-800 hover:text-burgundy-950 font-bold underline ml-1"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
