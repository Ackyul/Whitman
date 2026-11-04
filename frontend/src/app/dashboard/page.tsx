'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWhitman } from '../../context/WhitmanContext';
import { WhitmanLionMascot } from '../../components/WhitmanLionMascot';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  GraduationCap,
  Users,
  Trophy,
  ScanLine,
  ArrowRight,
  LogOut,
  Calendar,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function SecureDashboardPage() {
  const router = useRouter();
  const {
    currentUser,
    linkedStudents,
    attendance,
    grades,
    stats,
    logout,
  } = useWhitman();

  // 1. PANTALLA DE BLOQUEO SI NO ESTÁ AUTENTICADO
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-burgundy-100 text-burgundy-900 flex items-center justify-center mx-auto border-2 border-burgundy-200 shadow-md">
          <Lock className="w-10 h-10 text-burgundy-800" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            ÁREA PRIVADA Y SEGURA
          </span>
          <h2 className="text-2xl font-black font-serif text-slate-900 mt-2">
            Inicia Sesión para Continuar
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            Para acceder a tu panel de asistencia y datos académicos, ingresa con tu DNI.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full bg-burgundy-800 hover:bg-burgundy-900 text-white font-black py-3 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Ir a Iniciar Sesión</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // 2. DASHBOARD SEGURO PARA EL PADRE DE FAMILIA
  if (currentUser.role === 'PADRE') {
    const studentsToShow = linkedStudents.length > 0 ? linkedStudents : [];

    return (
      <div className="space-y-6">
        
        {/* Cabecera compacta y limpia del Apoderado */}
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl px-6 py-3.5 shadow-lg border border-lionGold-500/40">
          <h1 className="text-lg sm:text-2xl font-black font-serif text-white tracking-wide">
            Bienvenido, Padre / Madre
          </h1>
        </div>

        {/* Tarjeta(s) del Alumno Asociado: solo el nombre y la asistencia de ese día, sin imagen */}
        {studentsToShow.length > 0 ? (
          <div className="space-y-4">
            {studentsToShow.map((student) => {
              const studentAttendance = attendance.filter((a) => a.userId === student.id || a.userDni === student.dni);
              const todayRecord = studentAttendance.find((a) => a.date === today);

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">{student.name}</h2>
                  </div>

                  {/* Asistencia de ese día */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    {todayRecord ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Ingreso Registrado Hoy</p>
                          <p className="text-sm font-black text-slate-900">
                            {todayRecord.status} ({todayRecord.time})
                          </p>
                          <p className="text-[11px] text-slate-500">{todayRecord.notes || 'Ingreso puntual puerta principal'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Asistencia de Hoy</p>
                          <p className="text-sm font-bold text-slate-700">Aún no ingresa a garita</p>
                          <p className="text-[11px] text-slate-400">Torniquete activo desde las 07:00 AM</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
            No hay estudiantes vinculados a este DNI de apoderado.
          </div>
        )}

      </div>
    );
  }

  // 3. DASHBOARD SEGURO PARA EL ALUMNO
  if (currentUser.role === 'ALUMNO') {
    const studentAttendance = attendance.filter((a) => a.userId === currentUser.id || a.userDni === currentUser.dni);
    const todayRecord = studentAttendance.find((a) => a.date === today);

    return (
      <div className="space-y-6">
        
        {/* Cabecera compacta del Estudiante: solo dice ¡Hola León, [Nombre]! */}
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl px-6 py-3.5 shadow-lg border border-lionGold-500/40">
          <h1 className="text-lg sm:text-2xl font-black font-serif text-white tracking-wide">
            ¡Hola León, {currentUser.name}!
          </h1>
        </div>

        {/* Resumen Hoy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 flex items-center gap-4">
            {todayRecord ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                    Ingreso Hoy Confirmado
                  </span>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    Marcaste {todayRecord.status} a las {todayRecord.time}
                  </p>
                  <p className="text-xs text-slate-500">{todayRecord.notes || 'Entrada registrada en portería'}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                    Pendiente
                  </span>
                  <p className="text-base font-bold text-slate-800 mt-1">Aún no registras ingreso hoy</p>
                  <p className="text-xs text-slate-400">Pasa tu carnet o DNI por la pistola lectora de portería.</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Días Asistidos</span>
            <div className="text-3xl font-black text-burgundy-900 my-1">{studentAttendance.length}</div>
            <Link href="/asistencia" className="text-xs text-burgundy-800 font-bold hover:underline">
              Ir a módulo de asistencias →
            </Link>
          </div>
        </div>

      </div>
    );
  }

  // 4. DASHBOARD SEGURO PARA DOCENTES Y DIRECCIÓN
  const recentAttendance = attendance.slice(0, 5);
  const topGrades = [...grades].sort((a, b) => b.score - a.score).slice(0, 4);

  // La garita solo es visible para el Jefe de Normas y Disciplina o Dirección General
  const canAccessGarita =
    currentUser.role === 'DOCENTE' &&
    (currentUser.hierarchy === 'JEFE_NORMAS' || currentUser.hierarchy === 'DIRECTOR');

  return (
    <div className="space-y-6">
      
      {/* Cabecera compacta y limpia Docente / Dirección */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl px-6 py-3.5 sm:py-4 shadow-lg border border-lionGold-500/40 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black font-serif text-white tracking-wide">
            Bienvenido, {currentUser.name}
          </h1>
          <p className="text-[11px] text-lionGold-300 font-bold uppercase tracking-wider">
            {currentUser.hierarchyTitle || 'Plana Docente'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {canAccessGarita && (
            <Link
              href="/garita"
              className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow active:scale-95"
            >
              <ScanLine className="w-4 h-4" />
              <span>Garita (Lector DNI)</span>
            </Link>
          )}

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="bg-burgundy-950/80 hover:bg-burgundy-800 text-white font-bold px-4 py-2 rounded-xl border border-lionGold-500/30 text-xs transition flex items-center gap-2 active:scale-95"
          >
            <LogOut className="w-4 h-4 text-lionGold-400" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Módulo de Control de Garita Exclusivo para Normas y Dirección */}
      {canAccessGarita && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-lionGold-500 text-burgundy-950 flex items-center justify-center font-bold shadow shrink-0">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Control de Garita y Portería (Pistola de Códigos)</h3>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Exclusivo {currentUser.hierarchyTitle}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Módulo reservado para escaneo con lector físico de códigos de barra en carnets y DNI de 1,000 estudiantes.
              </p>
            </div>
          </div>
          <Link
            href="/garita"
            className="bg-burgundy-900 hover:bg-burgundy-950 text-white font-black px-5 py-2.5 rounded-xl text-xs transition shrink-0 flex items-center justify-center gap-2 shadow active:scale-95"
          >
            <ScanLine className="w-4 h-4 text-lionGold-400" />
            <span>Abrir Terminal de Garita</span>
          </Link>
        </div>
      )}

      {/* Métricas Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-emerald-600 border border-slate-200">
          <span className="text-xs font-bold text-slate-400 uppercase">Puntuales Hoy</span>
          <div className="text-3xl font-black text-slate-800 mt-1">{stats.todayAttendance.present}</div>
          <p className="text-[11px] text-slate-400">Antes de las 08:00 AM</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-amber-500 border border-slate-200">
          <span className="text-xs font-bold text-slate-400 uppercase">Tardanzas Hoy</span>
          <div className="text-3xl font-black text-slate-800 mt-1">{stats.todayAttendance.late}</div>
          <p className="text-[11px] text-slate-400">Con tolerancia garita</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-burgundy-800 border border-slate-200">
          <span className="text-xs font-bold text-slate-400 uppercase">Ingresos Totales</span>
          <div className="text-3xl font-black text-slate-800 mt-1">{stats.todayAttendance.totalMarked}</div>
          <p className="text-[11px] text-slate-400">De 1,000 alumnos</p>
        </div>

        <div className="bg-gradient-to-br from-burgundy-900 to-burgundy-800 text-white p-5 rounded-2xl shadow-lg border border-lionGold-500/40">
          <span className="text-xs font-bold text-lionGold-300 uppercase">Ratio de Asistencia</span>
          <div className="text-3xl font-black text-white mt-1">{stats.todayAttendance.attendanceRate}%</div>
          <p className="text-[11px] text-burgundy-200">En tiempo real</p>
        </div>
      </div>

      {/* Columnas: Últimos Ingresos vs Cuadro de Honor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Últimos Ingresos por Portería</h3>
            <Link href="/asistencia" className="text-xs text-burgundy-800 font-bold hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentAttendance.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-800">{a.userName}</p>
                  <p className="text-[10px] text-slate-400">DNI: {a.userDni} • {a.gradeOrClass}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'PRESENTE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {a.status}
                  </span>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Mejores Puntajes de Simulacros</h3>
            <Link href="/notas" className="text-xs text-burgundy-800 font-bold hover:underline">
              Ver notas →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {topGrades.map((g, idx) => (
              <div key={g.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-800">#{idx + 1} {g.userName}</p>
                  <p className="text-[10px] text-burgundy-700 font-semibold">{g.course} • {g.title}</p>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {g.score.toFixed(1)} / 20
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

