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
  Award,
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

        {/* Tarjeta(s) del Alumno Asociado: nombre, asistencia y calificaciones */}
        {studentsToShow.length > 0 ? (
          <div className="space-y-4">
            {studentsToShow.map((student) => {
              const studentAttendance = attendance.filter((a) => a.userId === student.id || a.userDni === student.dni);
              const todayRecord = studentAttendance.find((a) => a.date === today);
              const childGrades = grades.filter((g) => g.userId === student.id || g.userDni === student.dni);
              const childAverage =
                childGrades.length > 0
                  ? (childGrades.reduce((acc, curr) => acc + curr.score, 0) / childGrades.length).toFixed(1)
                  : null;

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900">{student.name}</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        DNI: {student.dni} • {student.level} • {student.gradeOrClass}
                      </p>
                    </div>
                    {childAverage && (
                      <div className="bg-lionGold-50 border border-lionGold-200 px-3.5 py-1.5 rounded-xl text-right">
                        <span className="text-[10px] font-bold text-lionGold-800 uppercase block">Promedio de Notas</span>
                        <span className="text-base font-black text-burgundy-950">{childAverage} / 20</span>
                      </div>
                    )}
                  </div>

                  {/* Asistencia de ese día: Ingreso y Salida */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Tarjeta Ingreso */}
                    <div className="flex items-center gap-3">
                      {todayRecord ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ingreso Hoy</p>
                            <p className="text-sm font-black text-slate-900">
                              {todayRecord.status} ({todayRecord.time})
                            </p>
                            <p className="text-[11px] text-slate-500">{todayRecord.notes || 'Ingreso en garita'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ingreso Hoy</p>
                            <p className="text-sm font-bold text-slate-700">Aún no ingresa</p>
                            <p className="text-[11px] text-slate-400">Garita activa desde las 07:00 AM</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tarjeta Salida */}
                    <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4">
                      {todayRecord?.exitTime ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Salida Registrada</p>
                            <p className="text-sm font-black text-slate-900">
                              Retiro a las {todayRecord.exitTime}
                            </p>
                            <p className="text-[11px] text-emerald-700 font-semibold">Alumno salió del colegio</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Salida Hoy</p>
                            <p className="text-sm font-medium text-slate-600">
                              {todayRecord ? 'En clases (Pendiente)' : 'Pendiente de marcar'}
                            </p>
                            <p className="text-[11px] text-slate-400">Se registrará en portería</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resumen de Notas del Alumno */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-burgundy-100 text-burgundy-900 flex items-center justify-center shrink-0">
                        <Award className="w-6 h-6 text-burgundy-800" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Calificaciones & Evaluaciones</p>
                        <p className="text-sm font-bold text-slate-800">
                          {childGrades.length > 0
                            ? `${childGrades.length} evaluación(es) registrada(s)`
                            : 'Sin evaluaciones registradas aún'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {childGrades.length > 0
                            ? `Última: ${childGrades[0].title} (${childGrades[0].score}/20)`
                            : 'Se guardan en la base de datos'}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/notas"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-burgundy-50 transition shrink-0"
                    >
                      <span>Ver Boletín Completo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
    const studentGrades = grades.filter((g) => g.userId === currentUser.id || g.userDni === currentUser.dni);
    const averageScore =
      studentGrades.length > 0
        ? (studentGrades.reduce((acc, curr) => acc + curr.score, 0) / studentGrades.length).toFixed(1)
        : null;

    return (
      <div className="space-y-6">
        
        {/* Cabecera compacta del Estudiante: solo dice ¡Hola León, [Nombre]! */}
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl px-6 py-3.5 shadow-lg border border-lionGold-500/40">
          <h1 className="text-lg sm:text-2xl font-black font-serif text-white tracking-wide">
            ¡Hola León, {currentUser.name}!
          </h1>
        </div>

        {/* Resumen Hoy: Ingreso y Salida */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Estado de Ingreso */}
            <div className="flex items-center gap-4">
              {todayRecord ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                      Ingreso Hoy Confirmado
                    </span>
                    <p className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {todayRecord.status} a las {todayRecord.time}
                    </p>
                    <p className="text-xs text-slate-500">{todayRecord.notes || 'Entrada registrada en garita'}</p>
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
                    <p className="text-base font-bold text-slate-800 mt-1">Aún no registras ingreso</p>
                    <p className="text-xs text-slate-400">Pasa tu carnet por la pistola lectora.</p>
                  </div>
                </>
              )}
            </div>

            {/* Estado de Salida */}
            <div className="flex items-center gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4">
              {todayRecord?.exitTime ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      Salida Confirmada
                    </span>
                    <p className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      Saliste a las {todayRecord.exitTime}
                    </p>
                    <p className="text-xs text-emerald-700 font-semibold">Marcado de salida completado</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded">
                      Salida Pendiente
                    </span>
                    <p className="text-base font-medium text-slate-600 mt-1">
                      {todayRecord ? 'En clases (Por marcar)' : 'Pendiente'}
                    </p>
                    <p className="text-xs text-slate-400">Marca tu salida al retirarte.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Días Asistidos</span>
            <div className="text-3xl font-black text-burgundy-900 my-1">{studentAttendance.length}</div>
            <Link href="/asistencia" className="text-xs text-burgundy-800 font-bold hover:underline">
              Ir a módulo de asistencias →
            </Link>
          </div>
        </div>

        {/* Sección: Mis Calificaciones y Evaluaciones */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lionGold-100 text-burgundy-900 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-lionGold-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900 font-serif">
                  Mis Calificaciones & Evaluaciones
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Registro académico oficial sincronizado directamente en la base de datos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {averageScore && (
                <div className="bg-lionGold-50 border border-lionGold-200 px-3.5 py-1.5 rounded-xl text-right">
                  <span className="text-[10px] font-bold text-lionGold-800 uppercase block">Promedio General</span>
                  <span className="text-base font-black text-burgundy-950">{averageScore} / 20</span>
                </div>
              )}
              <Link
                href="/notas"
                className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-burgundy-900 hover:bg-burgundy-800 px-4 py-2.5 rounded-xl transition shadow-sm shrink-0"
              >
                <span>Ver Todo el Boletín</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {studentGrades.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Aún no tienes calificaciones registradas</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Tus profesores registrarán aquí tus prácticas calificadas, exámenes mensuales y simulacros. Todos tus datos se guardan de forma segura en la base de datos.
              </p>
              <Link
                href="/notas"
                className="mt-4 inline-block text-xs font-bold text-burgundy-900 hover:underline"
              >
                Abrir módulo de notas →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {studentGrades.slice(0, 6).map((g) => (
                <div
                  key={g.id}
                  className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/90 hover:border-burgundy-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        {g.evaluationType}
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                        g.score >= 14
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : g.score >= 11
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {g.score.toFixed(1)} / 20
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{g.title}</h3>
                    <p className="text-xs font-medium text-burgundy-800">{g.course}</p>
                    {g.feedback && (
                      <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-2 bg-white p-2 rounded-lg border border-slate-100">
                        "{g.feedback}"
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{g.date}</span>
                    <span className="font-medium text-slate-600 truncate max-w-[120px]">{g.teacherName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

  // La gestión académica está disponible para Coordinadores, Jefes de Normas y el Director
  const canAccessGestion =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'DOCENTE' &&
      (currentUser.hierarchy === 'DIRECTOR' ||
       currentUser.hierarchy === 'COORDINADOR' ||
       currentUser.hierarchy === 'JEFE_NORMAS'));

  return (
    <div className="space-y-6">
      
      {/* Cabecera compacta y limpia Docente / Dirección */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg border border-lionGold-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black font-serif text-white tracking-wide">
            Bienvenido, {currentUser.name}
          </h1>
          <p className="text-[11px] text-lionGold-300 font-bold uppercase tracking-wider">
            {currentUser.hierarchyTitle || 'Plana Docente'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canAccessGestion && (
            <Link
              href="/gestion"
              className="bg-burgundy-900 hover:bg-burgundy-950 text-white font-black px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow active:scale-95 border border-lionGold-400/40"
            >
              <GraduationCap className="w-4 h-4 text-lionGold-400" />
              <span>Gestión & Matrícula</span>
            </Link>
          )}

          {canAccessGarita && (
            <Link
              href="/garita"
              className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow active:scale-95"
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
            className="bg-burgundy-950/80 hover:bg-burgundy-800 text-white font-bold px-3.5 py-2 rounded-xl border border-lionGold-500/30 text-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 text-lionGold-400" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Módulo de Gestión Académica para Coordinadores, Jefes de Normas y Director */}
      {canAccessGestion && (
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white border-2 border-lionGold-500/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-lionGold-500 text-burgundy-950 flex items-center justify-center font-bold shadow shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-sm">Gestión Académica & Matrícula Whitman</h3>
                <span className="bg-lionGold-500 text-burgundy-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Exclusivo {currentUser.hierarchyTitle || 'Dirección / Normas / Coordinación'}
                </span>
              </div>
              <p className="text-xs text-burgundy-200 mt-0.5">
                Crea alumnos, docentes, administra grados, distribuye alumnos en aulas y realiza cargas masivas.
              </p>
            </div>
          </div>
          <Link
            href="/gestion"
            className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-5 py-2.5 rounded-xl text-xs transition shrink-0 flex items-center justify-center gap-2 shadow active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Abrir Módulo de Gestión</span>
          </Link>
        </div>
      )}

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
            {recentAttendance.length > 0 ? (
              recentAttendance.map((a) => (
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
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aún no hay ingresos marcados hoy en portería.
              </p>
            )}
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
            {topGrades.length > 0 ? (
              topGrades.map((g, idx) => (
                <div key={g.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-800">#{idx + 1} {g.userName}</p>
                    <p className="text-[10px] text-burgundy-700 font-semibold">{g.course} • {g.title}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {g.score.toFixed(1)} / 20
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aún no hay evaluaciones registradas en el ciclo.
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

