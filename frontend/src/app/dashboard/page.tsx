'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Search,
  CalendarCheck,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Scale,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default function SecureDashboardPage() {
  const router = useRouter();
  const {
    currentUser,
    linkedStudents,
    attendance,
    students,
    grades,
    stats,
    logout,
  } = useWhitman();

  // Estados para ver el tema de asistencias solo si se desea
  const [showAttendanceSection, setShowAttendanceSection] = useState(false);
  const [attendanceSubTab, setAttendanceSubTab] = useState<'hoy' | 'consulta' | 'diferencia'>('hoy');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceDateMode, setAttendanceDateMode] = useState<'HOY' | 'TODAS' | 'CUSTOM'>('HOY');
  const [attendanceCustomDate, setAttendanceCustomDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Estados para la comparación de diferencia de asistencias entre días
  const [compareDateA, setCompareDateA] = useState(() => new Date().toISOString().split('T')[0]);
  const [compareDateB, setCompareDateB] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [compareDiffFilter, setCompareDiffFilter] = useState<'TODOS' | 'SOLO_DIFERENCIAS' | 'FALTARON_B' | 'NUEVOS_B' | 'CAMBIO_PUNTUALIDAD'>('TODOS');
  const [compareSearchQuery, setCompareSearchQuery] = useState('');

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
  const todayStr = new Date().toISOString().split('T')[0];
  const allRecordedDates = Array.from(new Set(attendance.map((a) => a.date))).sort();

  const previousRecordDate = (() => {
    const datesBeforeToday = allRecordedDates.filter((d) => d < todayStr);
    if (datesBeforeToday.length > 0) {
      return datesBeforeToday[datesBeforeToday.length - 1];
    }
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  const todayRecords = attendance.filter((a) => a.date === todayStr);
  const prevDayRecords = attendance.filter((a) => a.date === previousRecordDate);

  // Métricas del día actual
  const todayPresent = todayRecords.filter((a) => a.status === 'PRESENTE').length;
  const todayLate = todayRecords.filter((a) => a.status === 'TARDANZA').length;
  const todayTotal = todayRecords.length;
  const todayRate = stats?.todayAttendance.attendanceRate ?? (todayTotal > 0 ? Number(((todayTotal / 1000) * 100).toFixed(1)) : 0);

  // Métricas del día previo para cálculo de diferencias
  const prevPresent = prevDayRecords.filter((a) => a.status === 'PRESENTE').length;
  const prevLate = prevDayRecords.filter((a) => a.status === 'TARDANZA').length;
  const prevTotal = prevDayRecords.length;
  const prevRate = prevTotal > 0 ? Number(((prevTotal / 1000) * 100).toFixed(1)) : 0;

  const deltaPresent = todayPresent - prevPresent;
  const deltaLate = todayLate - prevLate;
  const deltaTotal = todayTotal - prevTotal;
  const deltaRate = Number((todayRate - prevRate).toFixed(1));

  // Comparativa detallada entre Fecha A y Fecha B
  const recordsCompareA = attendance.filter((a) => a.date === compareDateA);
  const recordsCompareB = attendance.filter((a) => a.date === compareDateB);

  const totalA = recordsCompareA.length;
  const totalB = recordsCompareB.length;
  const diffTotalAB = totalA - totalB;

  const presentA = recordsCompareA.filter((a) => a.status === 'PRESENTE').length;
  const presentB = recordsCompareB.filter((a) => a.status === 'PRESENTE').length;
  const diffPresentAB = presentA - presentB;

  const lateA = recordsCompareA.filter((a) => a.status === 'TARDANZA').length;
  const lateB = recordsCompareB.filter((a) => a.status === 'TARDANZA').length;
  const diffLateAB = lateA - lateB;

  const studentMapA = new Map(recordsCompareA.map((r) => [r.userDni, r]));
  const studentMapB = new Map(recordsCompareB.map((r) => [r.userDni, r]));
  const allCompareDnis = Array.from(new Set([...Array.from(studentMapA.keys()), ...Array.from(studentMapB.keys())]));

  interface StudentDayDiff {
    dni: string;
    name: string;
    gradeOrClass: string;
    level: string;
    recordA?: (typeof recordsCompareA)[0];
    recordB?: (typeof recordsCompareB)[0];
    type: 'IGUAL' | 'FALTO_EN_B' | 'NUEVO_EN_B' | 'MEJORO_A_PUNTUAL' | 'PASO_A_TARDANZA' | 'OTRO_CAMBIO';
    label: string;
    badgeClass: string;
  }

  const comparisonItems: StudentDayDiff[] = allCompareDnis.map((dni) => {
    const recA = studentMapA.get(dni);
    const recB = studentMapB.get(dni);
    const studentInfo = (students || []).find((s) => s.dni === dni);

    const name = recA?.userName || recB?.userName || studentInfo?.name || `Alumno ${dni}`;
    const gradeOrClass = recA?.gradeOrClass || recB?.gradeOrClass || studentInfo?.gradeOrClass || '—';
    const level = recA?.level || recB?.level || studentInfo?.level || 'COLEGIO';

    if (recA && !recB) {
      return {
        dni,
        name,
        gradeOrClass,
        level,
        recordA: recA,
        recordB: undefined,
        type: 'FALTO_EN_B',
        label: `Faltó en Día 2 (${compareDateB})`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    }

    if (!recA && recB) {
      return {
        dni,
        name,
        gradeOrClass,
        level,
        recordA: undefined,
        recordB: recB,
        type: 'NUEVO_EN_B',
        label: `Asistió solo en Día 2 (${compareDateB})`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    }

    if (recA && recB) {
      if (recA.status === recB.status) {
        return {
          dni,
          name,
          gradeOrClass,
          level,
          recordA: recA,
          recordB: recB,
          type: 'IGUAL',
          label: `Mantuvo ${recA.status}`,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      }
      if (recA.status === 'TARDANZA' && recB.status === 'PRESENTE') {
        return {
          dni,
          name,
          gradeOrClass,
          level,
          recordA: recA,
          recordB: recB,
          type: 'MEJORO_A_PUNTUAL',
          label: 'Mejoró a Puntual',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      }
      if (recA.status === 'PRESENTE' && recB.status === 'TARDANZA') {
        return {
          dni,
          name,
          gradeOrClass,
          level,
          recordA: recA,
          recordB: recB,
          type: 'PASO_A_TARDANZA',
          label: 'Pasó a Tardanza',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      }
      return {
        dni,
        name,
        gradeOrClass,
        level,
        recordA: recA,
        recordB: recB,
        type: 'OTRO_CAMBIO',
        label: `${recA.status} ➔ ${recB.status}`,
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      };
    }

    return {
      dni,
      name,
      gradeOrClass,
      level,
      type: 'IGUAL',
      label: 'Sin cambios',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  });

  const filteredComparison = comparisonItems.filter((item) => {
    if (compareDiffFilter === 'SOLO_DIFERENCIAS' && item.type === 'IGUAL') return false;
    if (compareDiffFilter === 'FALTARON_B' && item.type !== 'FALTO_EN_B') return false;
    if (compareDiffFilter === 'NUEVOS_B' && item.type !== 'NUEVO_EN_B') return false;
    if (compareDiffFilter === 'CAMBIO_PUNTUALIDAD' && item.type !== 'MEJORO_A_PUNTUAL' && item.type !== 'PASO_A_TARDANZA') return false;

    if (compareSearchQuery.trim()) {
      const q = compareSearchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.dni.includes(q) ||
        item.gradeOrClass.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countAbsentB = comparisonItems.filter((i) => i.type === 'FALTO_EN_B').length;
  const countNewB = comparisonItems.filter((i) => i.type === 'NUEVO_EN_B').length;
  const countChangedPunctuality = comparisonItems.filter((i) => i.type === 'MEJORO_A_PUNTUAL' || i.type === 'PASO_A_TARDANZA').length;
  const countDifferencesTotal = comparisonItems.filter((i) => i.type !== 'IGUAL').length;

  const filteredAttendance = attendance.filter((a) => {
    if (attendanceDateMode === 'HOY' && a.date !== todayStr) return false;
    if (attendanceDateMode === 'CUSTOM' && a.date !== attendanceCustomDate) return false;

    if (attendanceSearchQuery.trim()) {
      const q = attendanceSearchQuery.toLowerCase().trim();
      const matchName = a.userName?.toLowerCase().includes(q);
      const matchDni = a.userDni?.includes(q);
      const matchClass = a.gradeOrClass?.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchClass) return false;
    }
    return true;
  });

  const topGrades = [...grades].sort((a, b) => b.score - a.score).slice(0, 6);

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

      {/* MÓDULO OPCIONAL DE ASISTENCIAS: VER SOLO SI SE DESEA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setShowAttendanceSection(!showAttendanceSection)}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-burgundy-100 text-burgundy-900 flex items-center justify-center font-bold shrink-0">
              <CalendarCheck className="w-5 h-5 text-burgundy-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base group-hover:text-burgundy-800 transition">
                  Módulo de Asistencias & Control de Portería
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Opcional
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {showAttendanceSection
                  ? 'Haz clic aquí para ocultar el panel de asistencias'
                  : 'Despliega aquí para ver las asistencias de hoy o consultar por fecha, nombre y DNI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {todayRecords.length} registrados hoy
            </span>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-burgundy-100 text-slate-600 group-hover:text-burgundy-900 transition">
              {showAttendanceSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </button>

        {showAttendanceSection && (
          <div className="border-t border-slate-200 p-5 sm:p-6 bg-slate-50/60 space-y-6">
            
            {/* SUB-TABS DENTRO DEL MÓDULO DE ASISTENCIA */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setAttendanceSubTab('hoy')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  attendanceSubTab === 'hoy'
                    ? 'bg-burgundy-900 text-white shadow font-black'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-lionGold-400 shrink-0" />
                <span>1. Asistencias de Hoy</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  attendanceSubTab === 'hoy' ? 'bg-lionGold-500 text-burgundy-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  {todayRecords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceSubTab('consulta')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  attendanceSubTab === 'consulta'
                    ? 'bg-burgundy-900 text-white shadow font-black'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4 text-lionGold-400 shrink-0" />
                <span>2. Consultar por Día & DNI</span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceSubTab('diferencia')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  attendanceSubTab === 'diferencia'
                    ? 'bg-burgundy-900 text-white shadow font-black'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-4 h-4 text-lionGold-400 shrink-0" />
                <span>3. Diferencia entre Días</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  attendanceSubTab === 'diferencia' ? 'bg-lionGold-500 text-burgundy-950' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {countDifferencesTotal > 0 ? `${countDifferencesTotal} cambios` : 'Comparar'}
                </span>
              </button>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 1: ASISTENCIAS DEL DÍA (HOY)                              */}
            {/* ------------------------------------------------------------------ */}
            {attendanceSubTab === 'hoy' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                      Asistencias del Día ({todayStr})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {todayRecords.length} ingresos registrados hoy
                    </span>
                    <Link
                      href="/asistencia"
                      className="text-xs text-burgundy-800 font-bold hover:underline ml-2"
                    >
                      Abrir Módulo Completo →
                    </Link>
                  </div>
                </div>

                {/* Métricas del Día de Hoy con Diferencia vs Día Anterior */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-emerald-600 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Puntuales Hoy</span>
                    <div className="text-2xl font-black text-slate-800 mt-0.5">{todayPresent}</div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold">
                      {deltaPresent >= 0 ? (
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                          +{deltaPresent} vs día anterior
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                          {deltaPresent} vs día anterior
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-amber-500 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tardanzas Hoy</span>
                    <div className="text-2xl font-black text-slate-800 mt-0.5">{todayLate}</div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold">
                      {deltaLate <= 0 ? (
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                          {deltaLate === 0 ? 'Sin variación' : `${deltaLate}`} vs día anterior
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                          +{deltaLate} vs día anterior
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-burgundy-800 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ingresos Totales</span>
                    <div className="text-2xl font-black text-slate-800 mt-0.5">{todayTotal}</div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-bold">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                        deltaTotal >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}>
                        {deltaTotal >= 0 ? `+${deltaTotal}` : deltaTotal} alumnos vs anterior
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-burgundy-900 to-burgundy-800 text-white p-4 rounded-xl shadow-xs border border-lionGold-500/40">
                    <span className="text-[10px] font-bold text-lionGold-300 uppercase">Ratio Asistencia</span>
                    <div className="text-2xl font-black text-white mt-0.5">{todayRate}%</div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] font-bold">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${
                        deltaRate >= 0 ? 'text-lionGold-300 bg-burgundy-950/60' : 'text-rose-300 bg-burgundy-950/60'
                      }`}>
                        {deltaRate >= 0 ? `+${deltaRate}%` : `${deltaRate}%`} vs anterior
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banner de acceso directo a la diferencia detallada entre días */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-burgundy-50 text-burgundy-800 flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                    <span className="text-slate-700">
                      Día previo de registro: <strong>{previousRecordDate}</strong> ({prevTotal} alumnos). Variación neta: <strong>{deltaTotal >= 0 ? `+${deltaTotal}` : deltaTotal} alumnos</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCompareDateA(todayStr);
                      setCompareDateB(previousRecordDate);
                      setAttendanceSubTab('diferencia');
                    }}
                    className="font-bold text-burgundy-800 hover:text-burgundy-950 hover:underline flex items-center gap-1 shrink-0 bg-burgundy-50 px-3 py-1.5 rounded-xl transition"
                  >
                    <span>Ver comparativa y diferencias alumno por alumno →</span>
                  </button>
                </div>

                {/* Lista / Tabla de Asistencias del Día */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  {todayRecords.length > 0 ? (
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 bg-slate-50">
                          <tr>
                            <th className="py-2.5 px-3.5">Estudiante</th>
                            <th className="py-2.5 px-3.5">Nivel / Aula</th>
                            <th className="py-2.5 px-3.5">Ingreso</th>
                            <th className="py-2.5 px-3.5">Salida</th>
                            <th className="py-2.5 px-3.5">Método</th>
                            <th className="py-2.5 px-3.5">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {todayRecords.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3.5">
                                <p className="font-bold text-slate-900">{a.userName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">DNI: {a.userDni}</p>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  {a.gradeOrClass}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono">
                                <span className="text-emerald-700 font-bold">🟢 {a.time}</span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono">
                                {a.exitTime ? (
                                  <span className="text-indigo-700 font-bold">🟠 {a.exitTime}</span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic">Pendiente</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  {a.method}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    a.status === 'PRESENTE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : a.status === 'TARDANZA'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Aún no hay ingresos marcados el día de hoy.</p>
                      <p className="text-[11px] text-slate-400">
                        Cuando los alumnos escaneen su carnet o DNI en la garita, aparecerán registrados aquí al instante.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 2: CONSULTAR POR FECHA (DE QUÉ DÍA), NOMBRE Y DNI          */}
            {/* ------------------------------------------------------------------ */}
            {attendanceSubTab === 'consulta' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-burgundy-800" />
                    <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                      Revisar Asistencias por Fecha, Nombre o DNI
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filtra por cualquier fecha o busca directamente por nombre o número de DNI del alumno.
                  </p>
                </div>

                {/* Controles de Búsqueda y Filtro de Fecha */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-5 flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAttendanceDateMode('HOY')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        attendanceDateMode === 'HOY'
                          ? 'bg-burgundy-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceDateMode('TODAS')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        attendanceDateMode === 'TODAS'
                          ? 'bg-burgundy-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Historial
                    </button>
                    <div className="flex-1 flex items-center">
                      <input
                        type="date"
                        value={attendanceCustomDate}
                        onChange={(e) => {
                          setAttendanceCustomDate(e.target.value);
                          setAttendanceDateMode('CUSTOM');
                        }}
                        className={`w-full px-2 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                          attendanceDateMode === 'CUSTOM'
                            ? 'bg-burgundy-900 text-white border-burgundy-950'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-7 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por Nombre o DNI del alumno (Ej: 61460126, Yoshua)..."
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-burgundy-700 focus:ring-1 focus:ring-burgundy-700"
                    />
                    {attendanceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAttendanceSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    Mostrando {filteredAttendance.length} registro(s) para:{' '}
                    <strong>
                      {attendanceDateMode === 'HOY'
                        ? `Hoy (${todayStr})`
                        : attendanceDateMode === 'CUSTOM'
                        ? `Fecha ${attendanceCustomDate}`
                        : 'Todo el Historial'}
                    </strong>
                    {attendanceSearchQuery && ` • Búsqueda: "${attendanceSearchQuery}"`}
                  </span>
                  {(attendanceSearchQuery || attendanceDateMode !== 'HOY') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceSearchQuery('');
                        setAttendanceDateMode('HOY');
                      }}
                      className="text-burgundy-800 font-bold hover:underline"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>

                {/* Tabla de Resultados de la Consulta */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {filteredAttendance.length > 0 ? (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 bg-slate-50">
                          <tr>
                            <th className="py-2.5 px-3">Estudiante</th>
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-3">Nivel / Aula</th>
                            <th className="py-2.5 px-3">Ingreso</th>
                            <th className="py-2.5 px-3">Salida</th>
                            <th className="py-2.5 px-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredAttendance.slice(0, 50).map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-3">
                                <p className="font-bold text-slate-900">{a.userName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">DNI: {a.userDni}</p>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                                {a.date}
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                  {a.gradeOrClass}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-emerald-700 font-bold">
                                {a.time}
                              </td>
                              <td className="py-2 px-3 font-mono text-indigo-700 font-bold">
                                {a.exitTime || <span className="text-slate-400 text-[10px] italic font-normal">Pendiente</span>}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    a.status === 'PRESENTE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : a.status === 'TARDANZA'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <p className="text-xs font-bold text-slate-600">
                        No se encontraron registros para los criterios indicados.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Verifica la fecha seleccionada o los dígitos del DNI / nombres ingresados.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SUB-TAB 3: COMPARATIVA Y DIFERENCIA DE ASISTENCIAS ENTRE DÍAS      */}
            {/* ------------------------------------------------------------------ */}
            {attendanceSubTab === 'diferencia' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-burgundy-800" />
                    <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                      Comparativa y Diferencia de Asistencias entre Días
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compara la asistencia entre dos fechas para ver variación numérica (alumnos que aumentaron o disminuyeron), cambios de puntualidad y quiénes faltaron.
                  </p>
                </div>

                {/* SELECTOR DE FECHAS A COMPARAR */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Fecha 1 (Base) */}
                  <div className="w-full md:w-5/12 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Día 1 (Fecha Base):
                    </label>
                    <input
                      type="date"
                      value={compareDateA}
                      onChange={(e) => setCompareDateA(e.target.value)}
                      className="w-full font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-burgundy-700"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">
                      {totalA} alumnos registrados
                    </span>
                  </div>

                  {/* Botón Intercambiar */}
                  <button
                    type="button"
                    onClick={() => {
                      const temp = compareDateA;
                      setCompareDateA(compareDateB);
                      setCompareDateB(temp);
                    }}
                    title="Intercambiar fechas"
                    className="p-2.5 rounded-xl bg-burgundy-50 text-burgundy-900 hover:bg-burgundy-100 transition shadow-xs active:scale-95 shrink-0"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  {/* Fecha 2 (A Comparar) */}
                  <div className="w-full md:w-5/12 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Día 2 (Fecha a Contrastar):
                    </label>
                    <input
                      type="date"
                      value={compareDateB}
                      onChange={(e) => setCompareDateB(e.target.value)}
                      className="w-full font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-burgundy-700"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">
                      {totalB} alumnos registrados
                    </span>
                  </div>
                </div>

                {/* TARJETAS RESUMEN DE LA DIFERENCIA ENTRE LOS DOS DÍAS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Diferencia de Ingresos</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-black ${
                        diffTotalAB > 0 ? 'text-emerald-700' : diffTotalAB < 0 ? 'text-rose-700' : 'text-slate-800'
                      }`}>
                        {diffTotalAB > 0 ? `+${diffTotalAB}` : diffTotalAB}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">alumnos</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {totalA} (Día 1) vs {totalB} (Día 2)
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Diferencia de Puntuales</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-black ${
                        diffPresentAB > 0 ? 'text-emerald-700' : diffPresentAB < 0 ? 'text-rose-700' : 'text-slate-800'
                      }`}>
                        {diffPresentAB > 0 ? `+${diffPresentAB}` : diffPresentAB}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">puntuales</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {presentA} (Día 1) vs {presentB} (Día 2)
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Diferencia de Tardanzas</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-black ${
                        diffLateAB < 0 ? 'text-emerald-700' : diffLateAB > 0 ? 'text-amber-700' : 'text-slate-800'
                      }`}>
                        {diffLateAB > 0 ? `+${diffLateAB}` : diffLateAB}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">tardanzas</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {lateA} (Día 1) vs {lateB} (Día 2)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-burgundy-900 to-burgundy-800 text-white p-4 rounded-xl shadow-xs border border-lionGold-500/40">
                    <span className="text-[10px] font-bold text-lionGold-300 uppercase">Alumnos con Cambios</span>
                    <div className="text-2xl font-black text-white mt-1">
                      {countDifferencesTotal}
                    </div>
                    <p className="text-[10px] text-burgundy-200 mt-0.5">
                      {countAbsentB} faltaron en Día 2 • {countNewB} nuevos en Día 2
                    </p>
                  </div>
                </div>

                {/* FILTROS RÁPIDOS Y BUSCADOR DE DIFERENCIAS */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setCompareDiffFilter('TODOS')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        compareDiffFilter === 'TODOS'
                          ? 'bg-burgundy-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos ({comparisonItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareDiffFilter('SOLO_DIFERENCIAS')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        compareDiffFilter === 'SOLO_DIFERENCIAS'
                          ? 'bg-burgundy-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Solo con Diferencias ({countDifferencesTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareDiffFilter('FALTARON_B')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        compareDiffFilter === 'FALTARON_B'
                          ? 'bg-rose-700 text-white'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      🔴 Faltaron en Día 2 ({countAbsentB})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareDiffFilter('NUEVOS_B')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        compareDiffFilter === 'NUEVOS_B'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      🟢 Asistieron solo en Día 2 ({countNewB})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareDiffFilter('CAMBIO_PUNTUALIDAD')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        compareDiffFilter === 'CAMBIO_PUNTUALIDAD'
                          ? 'bg-amber-700 text-white'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      ⚠️ Varió Puntualidad ({countChangedPunctuality})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar por nombre o DNI de alumno..."
                      value={compareSearchQuery}
                      onChange={(e) => setCompareSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-burgundy-700"
                    />
                    {compareSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCompareSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TABLA COMPARATIVA ALUMNO POR ALUMNO */}
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  {filteredComparison.length > 0 ? (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 bg-slate-50">
                          <tr>
                            <th className="py-2.5 px-3">Estudiante</th>
                            <th className="py-2.5 px-3">Aula</th>
                            <th className="py-2.5 px-3">Día 1 ({compareDateA})</th>
                            <th className="py-2.5 px-3">Día 2 ({compareDateB})</th>
                            <th className="py-2.5 px-3">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredComparison.map((item) => (
                            <tr key={item.dni} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-3">
                                <p className="font-bold text-slate-900">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">DNI: {item.dni}</p>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                  {item.gradeOrClass}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {item.recordA ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      item.recordA.status === 'PRESENTE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {item.recordA.status}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500">({item.recordA.time})</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic">No registró</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {item.recordB ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      item.recordB.status === 'PRESENTE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {item.recordB.status}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500">({item.recordB.time})</span>
                                  </div>
                                ) : (
                                  <span className="text-rose-600 font-bold text-[10px]">No registró</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass}`}>
                                  {item.label}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <p className="text-xs font-bold text-slate-600">
                        No hay alumnos que coincidan con el filtro seleccionado.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Intenta con otro filtro de diferencias o verifica las fechas seleccionadas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* 4. MEJORES PUNTAJES DE SIMULACROS (SIEMPRE VISIBLE EN EL DASHBOARD) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-lionGold-500" />
            <h3 className="font-bold text-slate-900 text-sm">Mejores Puntajes de Simulacros</h3>
          </div>
          <Link href="/notas" className="text-xs text-burgundy-800 font-bold hover:underline">
            Ver todas las notas →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {topGrades.length > 0 ? (
            topGrades.map((g, idx) => (
              <div key={g.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-800">#{idx + 1} {g.userName}</p>
                  <p className="text-[10px] text-burgundy-700 font-semibold">{g.course} • {g.title}</p>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {g.score.toFixed(1)} / 20
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center col-span-2">
              Aún no hay evaluaciones registradas en el ciclo.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}

