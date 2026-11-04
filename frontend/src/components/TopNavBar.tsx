'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWhitman } from '../context/WhitmanContext';
import { UserBubbleMenu } from './UserBubbleMenu';
import { Home, CalendarCheck, GraduationCap } from 'lucide-react';

interface TopNavBarProps {
  activeTab?: 'inicio' | 'asistencias' | 'gestion';
  onTabChange?: (tab: 'inicio' | 'asistencias' | 'gestion') => void;
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

  // Determinar pestaña activa si se usa por prop o por ruta
  const currentTab = activeTab
    ? activeTab
    : isAsistenciaRoute
    ? 'asistencias'
    : isGestionRoute
    ? 'gestion'
    : 'inicio';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* LADO IZQUIERDO: LOGO INSTITUCIONAL + NAVEGACIÓN */}
        <div className="flex items-center gap-6 sm:gap-8">
          
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <span className="font-serif font-black text-lg sm:text-xl tracking-wider text-burgundy-950 uppercase group-hover:text-burgundy-800 transition">
              WHITMAN
            </span>
            <span className="hidden sm:inline text-[10px] bg-burgundy-100 text-burgundy-900 font-black px-2 py-0.5 rounded-full border border-burgundy-200 uppercase">
              Aula Virtual
            </span>
          </Link>

          {/* BARRA DE NAVEGACIÓN: INICIO / ASISTENCIAS */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 gap-1 text-xs font-bold">
            
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

            {(currentUser.role === 'DOCENTE' || currentUser.role === 'ADMIN') && (
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

          </nav>

        </div>

        {/* LADO DERECHO: BURBUJA DEL USUARIO */}
        <div className="flex items-center gap-3">
          <UserBubbleMenu />
        </div>

      </div>
    </header>
  );
};

