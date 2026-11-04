'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { WhitmanLionMascot } from '../../components/WhitmanLionMascot';
import {
  UserPlus,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const { registerNewStudent, login } = useWhitman();

  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    level: 'SECUNDARIA',
    gradeOrClass: '5to Secundaria - Alfa',
    phone: '',
    parentName: '',
    parentDni: '',
    parentPhone: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dni || !formData.parentDni) {
      setErrorMsg('El nombre, DNI del alumno y DNI del apoderado son obligatorios.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await registerNewStudent(formData);

    if (res.success && res.user) {
      setRegisteredUser(res.user);
    } else {
      setErrorMsg(res.message);
    }
    setLoading(false);
  };

  const handleLoginImmediately = async () => {
    if (!registeredUser) return;
    await login(registeredUser.dni, 'ALUMNO');
    router.push('/asistencia');
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6">
      
      {registeredUser ? (
        /* Tarjeta de Registro Exitoso con Carnet Digital */
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-8 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-300">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              ¡MATRÍCULA & REGISTRO EXITOSO!
            </span>
            <h2 className="text-2xl font-black font-serif text-slate-900 mt-2">
              ¡Bienvenido a la Manada de Leones Whitman!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tu cuenta y la de tu apoderado han sido creadas y sincronizadas en la base de datos Neon.
            </p>
          </div>

          {/* Carnet Virtual */}
          <div className="bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl p-6 shadow-xl border-2 border-lionGold-400 text-left relative overflow-hidden max-w-md mx-auto">
            <div className="flex items-center justify-between border-b border-burgundy-700 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <WhitmanLionMascot size="sm" />
                <span className="font-serif font-black tracking-wider text-sm uppercase">
                  WHITMAN CARNET
                </span>
              </div>
              <span className="text-[10px] font-mono bg-lionGold-500 text-burgundy-950 px-2 py-0.5 rounded font-black">
                {registeredUser.studentCode}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-burgundy-200 uppercase font-semibold">Estudiante:</p>
              <h3 className="text-lg font-black text-white">{registeredUser.name}</h3>
              <p className="text-xs text-lionGold-300 font-mono font-bold">DNI: {registeredUser.dni}</p>
              <p className="text-xs text-burgundy-200">{registeredUser.gradeOrClass}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-burgundy-800 flex items-center justify-between text-[11px] text-burgundy-300">
              <div>
                <span>Apoderado asociado:</span>
                <p className="font-bold text-white font-mono">DNI: {registeredUser.parentDni}</p>
              </div>
              <QrCode className="w-8 h-8 text-lionGold-400 opacity-90" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleLoginImmediately}
              className="bg-burgundy-800 hover:bg-burgundy-900 text-white font-black px-6 py-3 rounded-xl shadow-md text-xs transition flex items-center justify-center gap-2"
            >
              <span>Entrar Ahora a Asistencias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/login"
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-6 py-3 rounded-xl text-xs transition flex items-center justify-center"
            >
              Ir a la Pantalla de Login
            </Link>
          </div>
        </div>
      ) : (
        /* Formulario de Registro */
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 p-6 sm:p-8 text-white border-b-2 border-lionGold-500/40 flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-burgundy-900 border border-lionGold-400/40 shrink-0">
              <WhitmanLionMascot size="md" />
            </div>
            <div>
              <span className="bg-lionGold-500/20 text-lionGold-300 text-xs font-black px-3 py-0.5 rounded-full border border-lionGold-400/30">
                REGISTRO ACADÉMICO 2026
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight mt-1">
                Ficha de Inscripción de Alumno
              </h1>
              <p className="text-xs text-burgundy-200">
                Al registrarte se vinculará el DNI de tu apoderado para que pueda revisar tu asistencia.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sección 1: Datos del Estudiante */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-burgundy-900 font-bold text-sm border-b border-slate-100 pb-2">
                <GraduationCap className="w-4 h-4 text-burgundy-800" />
                <span>1. Datos del Estudiante</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombres y Apellidos Completos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Daniel Quispe Huamán"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    DNI del Estudiante *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="74859612"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-burgundy-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nivel Educativo *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => {
                      const lvl = e.target.value;
                      let defaultClass = '1ro Secundaria - Alfa';
                      if (lvl === 'PRIMARIA') defaultClass = '6to Primaria - Leones';
                      if (lvl === 'ACADEMIA') defaultClass = 'Ciclo Semianual UNI';
                      setFormData({ ...formData, level: lvl, gradeOrClass: defaultClass });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-burgundy-700 bg-white"
                  >
                    <option value="PRIMARIA">🎒 Primaria</option>
                    <option value="SECUNDARIA">🏫 Secundaria</option>
                    <option value="ACADEMIA">🦁 Academia Preuniversitaria</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Grado, Ciclo o Aula *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.level === 'PRIMARIA'
                        ? 'Ej: 6to Primaria - Leones'
                        : formData.level === 'SECUNDARIA'
                        ? 'Ej: 5to Secundaria - Alfa'
                        : 'Ej: Ciclo Semianual UNI'
                    }
                    value={formData.gradeOrClass}
                    onChange={(e) => setFormData({ ...formData, gradeOrClass: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-burgundy-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono del Alumno (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+51 987654321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-burgundy-700"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Datos del Apoderado (Papá/Mamá) */}
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-burgundy-900 font-bold text-sm border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>2. Datos del Padre / Apoderado (Para acceso a la cuenta)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo del Apoderado (Papá / Mamá)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Don Miguel Quispe"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-burgundy-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    DNI del Apoderado * (Con este DNI ingresará el papá)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="41223344"
                    value={formData.parentDni}
                    onChange={(e) => setFormData({ ...formData, parentDni: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-burgundy-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    El papá podrá ingresar con este DNI para ver las asistencias de su hijo.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono del Apoderado (Para alertas)
                  </label>
                  <input
                    type="tel"
                    placeholder="+51 998877665"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-burgundy-700"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-burgundy-800 hover:bg-burgundy-900 text-white font-black py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Registrando en base de datos...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-lionGold-400" />
                  <span>Completar Registro y Generar Código Whitman</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                ¿Ya tienes una cuenta registrada?{' '}
                <Link
                  href="/login"
                  className="text-burgundy-800 hover:text-burgundy-950 font-bold underline ml-1"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}

