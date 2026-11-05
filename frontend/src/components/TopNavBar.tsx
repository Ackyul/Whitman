'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWhitman } from '../context/WhitmanContext';
import { UserBubbleMenu } from './UserBubbleMenu';
import { Home, CalendarCheck, GraduationCap, ScanLine, Award } from 'lucide-react';

interface TopNavBarProps {
  activeTab?: 'inicio' | 'asistencias' | 'gestion' | 'garita' | 'notas';
  onTabChange?: (tab: 'inicio' | 'asistencias' | 'gestion' | 'garita' | 'notas') => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ activeTab, onTabChange }) => {
  const pathname = usePathname();
  const { currentUser } = useWhitman();

  if (!currentUser || pathname === '/') {
    return null;
  }

  const isAsistenciaRoute = pathname === '/asistencia';
  const isDashboardRoute = pathname === '/dashboard';
  const isGestionRoute = pathname === '/gestion';
  const isGaritaRoute = pathname === '/garita';
  const isNotasRoute = pathname === '/notas';

  // Determinar pestaña activa si se usa por prop o por ruta
  const currentTab = activeTab
    ? activeTab
    : isNotasRoute
    ? 'notas'
    : isAsistenciaRoute
    ? 'asistencias'
    : isGestionRoute
    ? 'gestion'
    : isGaritaRoute
    ? 'garita'
    : 'inicio';

  const isDocenteOrAdmin = currentUser.role === 'DOCENTE' || currentUser.role === 'ADMIN';
  const isAuthorizedGarita =
    currentUser.role === 'DOCENTE' &&
    (currentUser.hierarchy === 'JEFE_NORMAS' || currentUser.hierarchy === 'DIRECTOR');
  const canAccessGestion =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'DOCENTE' &&
      (currentUser.hierarchy === 'DIRECTOR' ||
       currentUser.hierarchy === 'COORDINADOR' ||
       currentUser.hierarchy === 'JEFE_NORMAS'));

  const avatarInitial = currentUser.name.trim().charAt(0).toUpperCase();

  const handleOpenMobileProfile = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('whitman-toggle-user-menu'));
    }
  };

  return (
    <>
      {/* 1. BARRA SUPERIOR (LOGO + MENÚ EN DESKTOP, LOGO + BURBUJA EN MÓVIL) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LADO IZQUIERDO: LOGO INSTITUCIONAL + NAVEGACIÓN DESKTOP */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
              <span className="font-serif font-black text-lg sm:text-xl tracking-wider text-burgundy-950 uppercase group-hover:text-burgundy-800 transition">
                WHITMAN
              </span>
              <span className="text-[10px] bg-burgundy-100 text-burgundy-900 font-black px-2 py-0.5 rounded-full border border-burgundy-200 uppercase">
                Aula Virtual
              </span>
            </Link>

            {/* BARRA DE NAVEGACIÓN DESKTOP (OCULTA EN CELULAR, SE TRASLADA ABAJO) */}
            <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 gap-1 text-xs font-bold">
              {onTabChange ? (
                <button
                  onClick={() => onTabChange('inicio')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    currentTab === 'inicio'
                      ? 'bg-burgundy-900 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Inicio</span>
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    currentTab === 'inicio'
                      ? 'bg-burgundy-900 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Inicio</span>
                </Link>
              )}

              {onTabChange ? (
                <button
                  onClick={() => onTabChange('asistencias')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    currentTab === 'asistencias'
                      ? 'bg-burgundy-900 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-lionGold-400" />
                  <span>Asistencias</span>
                </button>
              ) : (
                <Link
                  href="/asistencia"
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    currentTab === 'asistencias'
                      ? 'bg-burgundy-900 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-lionGold-400" />
                  <span>Asistencias</span>
                </Link>
              )}

              {/* Pestaña: NOTAS / CALIFICACIONES (Para todos los usuarios) */}
              <Link
                href="/notas"
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  currentTab === 'notas'
                    ? 'bg-burgundy-900 text-white shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-lionGold-400" />
                <span>Notas</span>
              </Link>

              {canAccessGestion && (
                <Link
                  href="/gestion"
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    currentTab === 'gestion'
                      ? 'bg-burgundy-900 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-lionGold-400" />
                  <span>Gestión y Matrícula</span>
                </Link>
              )}

              {isAuthorizedGarita && (
                <Link
                  href="/garita"
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    currentTab === 'garita'
                      ? 'bg-burgundy-900 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <ScanLine className="w-3.5 h-3.5 text-lionGold-400" />
                  <span>Garita Lector</span>
                </Link>
              )}
            </nav>
          </div>

          {/* LADO DERECHO: BURBUJA DEL USUARIO */}
          <div className="flex items-center gap-2">
            <UserBubbleMenu />
          </div>

        </div>
      </header>

      {/* 2. BARRA DE NAVEGACIÓN INFERIOR PARA CELULARES (ESTILO INSTAGRAM) */}
      <nav
        aria-label="Navegación Móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] flex items-center justify-around"
      >
        {/* Pestaña: INICIO */}
        {onTabChange ? (
          <button
            onClick={() => onTabChange('inicio')}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          >
            <Home
              className={`w-5 h-5 transition-colors ${
                currentTab === 'inicio' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 transition-colors ${
                currentTab === 'inicio' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
              }`}
            >
              Inicio
            </span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                currentTab === 'inicio' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          >
            <Home
              className={`w-5 h-5 transition-colors ${
                currentTab === 'inicio' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 transition-colors ${
                currentTab === 'inicio' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
              }`}
            >
              Inicio
            </span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                currentTab === 'inicio' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </Link>
        )}

        {/* Pestaña: ASISTENCIAS */}
        {onTabChange ? (
          <button
            onClick={() => onTabChange('asistencias')}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          >
            <CalendarCheck
              className={`w-5 h-5 transition-colors ${
                currentTab === 'asistencias' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 transition-colors ${
                currentTab === 'asistencias' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
              }`}
            >
              Asistencias
            </span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                currentTab === 'asistencias' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </button>
        ) : (
          <Link
            href="/asistencia"
            className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          >
            <CalendarCheck
              className={`w-5 h-5 transition-colors ${
                currentTab === 'asistencias' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 transition-colors ${
                currentTab === 'asistencias' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
              }`}
            >
              Asistencias
            </span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                currentTab === 'asistencias' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </Link>
        )}

        {/* Pestaña Móvil: NOTAS */}
        <Link
          href="/notas"
          className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
        >
          <Award
            className={`w-5 h-5 transition-colors ${
              currentTab === 'notas' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span
            className={`text-[10px] mt-0.5 transition-colors ${
              currentTab === 'notas' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
            }`}
          >
            Notas
          </span>
          <span
            className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
              currentTab === 'notas' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
            }`}
          />
        </Link>

        {/* Pestaña: GESTIÓN (COORDINADOR, JEFE DE NORMAS O DIRECTOR) */}
        {canAccessGestion && (
          <Link
            href="/gestion"
            className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          >
            <GraduationCap
              className={`w-5 h-5 transition-colors ${
                currentTab === 'gestion' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 transition-colors ${
                currentTab === 'gestion' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
              }`}
            >
              Gestión
            </span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                currentTab === 'gestion' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </Link>
        )}

        {/* Pestaña: GARITA (NORMAS O DIRECCIÓN) */}
        {isAuthorizedGarita && (
          <Link
            href="/garita"
            className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          >
            <ScanLine
              className={`w-5 h-5 transition-colors ${
                currentTab === 'garita' ? 'text-burgundy-900 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 transition-colors ${
                currentTab === 'garita' ? 'font-black text-burgundy-900' : 'font-medium text-slate-500'
              }`}
            >
              Garita
            </span>
            <span
              className={`w-1 h-1 rounded-full mt-0.5 transition-all ${
                currentTab === 'garita' ? 'bg-burgundy-900 scale-100' : 'bg-transparent scale-0'
              }`}
            />
          </Link>
        )}

        {/* Pestaña: PERFIL (Estilo Instagram con el avatar del usuario) */}
        <button
          onClick={handleOpenMobileProfile}
          className="flex flex-col items-center justify-center flex-1 py-1 transition-transform active:scale-90 group"
          title="Mi Perfil y Opciones"
        >
          <div className="w-5 h-5 rounded-full bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center text-[10px] shadow-sm border border-lionGold-300">
            {currentUser.role === 'PADRE' ? '👨‍👩‍👦' : avatarInitial}
          </div>
          <span className="text-[10px] font-medium text-slate-500 mt-0.5 group-hover:text-slate-700">
            Perfil
          </span>
          <span className="w-1 h-1 rounded-full mt-0.5 bg-transparent" />
        </button>
      </nav>
    </>
  );
};
