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
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useWhitman();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ALUMNO');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (idToUse?: string) => {
    const finalId = (idToUse || identifier).trim();
    if (!finalId) {
      setErrorMsg('Por favor ingresa tu número de DNI o código.');
      return;
    }

    if (selectedRole !== 'PADRE' && !password.trim()) {
      setErrorMsg(
        selectedRole === 'ALUMNO'
          ? 'Por favor ingresa tu contraseña (tu contraseña inicial es tu número de DNI).'
          : 'Por favor ingresa tu contraseña de docente.'
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await login(finalId, selectedRole, password);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        router.push('/dashboard');
      }, 700);
    } else {
      setErrorMsg(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4">
      
      <div className="flex items-center justify-between px-1">
        <Link
          href="/"
          className="text-xs font-bold text-slate-500 hover:text-burgundy-900 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Portal Oficial 2026
        </span>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Cabecera Vino Borgoña */}
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 p-5 sm:p-7 text-white text-center border-b-2 border-lionGold-500/40 relative">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-2.5 text-lionGold-300">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
            Aula Virtual Whitman
          </h1>
          <p className="text-[11px] sm:text-xs text-burgundy-200 max-w-xs mx-auto mt-1 leading-relaxed">
            Ingreso oficial para Alumnos, Padres de Familia y Docentes.
          </p>
        </div>

        {/* Pestañas de Selección de Rol (Optimizado para Celular) */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 border-b border-slate-200 gap-1 text-[11px] sm:text-xs font-bold">
          <button
            onClick={() => {
              setSelectedRole('ALUMNO');
              setPassword('');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'ALUMNO'
                ? 'bg-white text-burgundy-900 shadow-sm border border-burgundy-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-burgundy-800 shrink-0" />
            <span className="leading-tight">Alumno</span>
          </button>

          <button
            onClick={() => {
              setSelectedRole('PADRE');
              setPassword('');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'PADRE'
                ? 'bg-white text-burgundy-900 shadow-sm border border-burgundy-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="leading-tight">Familia</span>
          </button>

          <button
            onClick={() => {
              setSelectedRole('DOCENTE');
              setPassword('');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all ${
              selectedRole === 'DOCENTE'
                ? 'bg-white text-burgundy-900 shadow-sm border border-burgundy-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
            <span className="leading-tight">Docente</span>
          </button>
        </div>

        {/* Formulario */}
        <div className="p-5 sm:p-7 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg} Ingresando al panel seguro...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              {selectedRole === 'ALUMNO' && 'DNI o Código de Estudiante'}
              {selectedRole === 'PADRE' && 'DNI (Madre, Padre o Apoderado)'}
              {selectedRole === 'DOCENTE' && 'DNI de Profesor o Directivo'}
            </label>
            <input
              type="text"
              placeholder={
                selectedRole === 'ALUMNO'
                  ? 'Ej: 72345671 o código WHT-...'
                  : selectedRole === 'PADRE'
                  ? 'Ingresa tu número de DNI'
                  : 'Ingresa tu DNI docente'
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-200 text-slate-900 font-mono font-bold text-base outline-none transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              {selectedRole === 'ALUMNO' && 'Visualiza tu registro de asistencia diario, notas y evaluaciones.'}
              {selectedRole === 'PADRE' && 'Acceso familiar sin contraseña: Madre, Padre o Apoderado ingresan directamente con su DNI.'}
              {selectedRole === 'DOCENTE' && 'Acceso al registro de control de aula, notas y asistencias.'}
            </p>
          </div>

          {/* Campo de Contraseña: Solo para Alumnos y Docentes (Para Padres NO es necesario) */}
          {selectedRole !== 'PADRE' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Contraseña *
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {selectedRole === 'ALUMNO' ? 'Por defecto es tu DNI' : 'Clave de seguridad'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={
                    selectedRole === 'ALUMNO'
                      ? 'Ingresa tu contraseña (o tu DNI inicial)'
                      : 'Ingresa tu contraseña docente'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full pl-4 pr-11 py-3 rounded-xl border-2 border-slate-200 focus:border-burgundy-700 focus:ring-2 focus:ring-burgundy-200 text-slate-900 font-mono font-bold text-base outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 transition"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {selectedRole === 'ALUMNO'
                  ? '🔒 Si ingresas por primera vez, tu contraseña inicial es tu propio número de DNI.'
                  : '🔒 Clave de seguridad oficial para el personal de Whitman.'}
              </p>
            </div>
          )}

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
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sistema Institucional Protegido • Colegio y Academia Whitman</span>
          </div>

        </div>

      </div>

    </div>
  );
}
