'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WhitmanLionMascot } from './WhitmanLionMascot';
import {
  Wifi,
  WifiOff,
  LayoutDashboard,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { useWhitman } from '../context/WhitmanContext';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected, currentUser, logout } = useWhitman();
  const [currentTime, setCurrentTime] = useState<string>('');

  // En la primera página (landing "/") no mostramos este header; queda limpio con el hero y botón al aula virtual
  const isHomePage = pathname === '/';

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isHomePage) {
    return null;
  }

  // Obtenemos inicial para el avatar
  const avatarInitial = currentUser?.name
    ? currentUser.name.trim().charAt(0).toUpperCase()
    : 'W';

  // Obtenemos el texto del rol para el tag inferior en la cápsula
  const roleDisplay = currentUser?.hierarchyTitle
    ? currentUser.hierarchyTitle.toUpperCase()
    : currentUser?.role === 'ALUMNO'
    ? 'ALUMNO'
    : currentUser?.role === 'PADRE'
    ? 'APODERADO'
    : currentUser?.role === 'DOCENTE'
    ? 'PROFESOR'
    : 'USUARIO';

  return (
    <header className="sticky top-0 z-50 bg-[#38010d] text-white shadow-xl border-b border-[#d97706]/40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* 1. SECCIÓN IZQUIERDA: ESCUDO + LOGO + LEYENDA (Exacto a la imagen) */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="p-1 rounded-2xl bg-[#4a0011] border-2 border-[#d97706]/80 shadow-md group-hover:border-lionGold-300 transition-all">
              <WhitmanLionMascot size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-serif uppercase">
                  WHITMAN
                </span>
                <span className="inline-flex items-center gap-1 border border-[#d97706] bg-[#220008] text-lionGold-300 font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider shadow-inner">
                  <span>LEONES</span>
                  <span className="text-xs">🦁</span>
                </span>
              </div>
              <p className="text-[11px] text-burgundy-200 font-medium tracking-wide">
                Academia Preuniversitaria & Colegio
              </p>
            </div>
          </Link>

          {/* 2. SECCIÓN CENTRAL: MENÚ EN CÁPSULA REDONDEADA PARA LA PLATAFORMA */}
          <nav className="hidden md:flex items-center bg-[#240008]/90 p-1.5 rounded-full border border-[#800020]/80 shadow-inner gap-1">
            <Link
              href="/"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                pathname === '/'
                  ? 'bg-[#800020] text-white shadow border border-lionGold-500/50'
                  : 'text-burgundy-200 hover:text-white hover:bg-white/5'
              }`}
            >
              Inicio
            </Link>

            <Link
              href="/dashboard"
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                pathname === '/dashboard'
                  ? 'bg-[#800020] text-white shadow-md border border-[#d97706]/70'
                  : 'text-burgundy-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-lionGold-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/asistencia"
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                pathname === '/asistencia'
                  ? 'bg-[#800020] text-white shadow-md border border-[#d97706]/70'
                  : 'text-burgundy-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              </span>
              <span>Asistencia</span>
            </Link>

            {currentUser?.role === 'DOCENTE' && (
              <>
                <Link
                  href="/notas"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    pathname === '/notas'
                      ? 'bg-[#800020] text-white shadow border border-[#d97706]/70'
                      : 'text-burgundy-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Notas
                </Link>
                <Link
                  href="/usuarios"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    pathname === '/usuarios'
                      ? 'bg-[#800020] text-white shadow border border-[#d97706]/70'
                      : 'text-burgundy-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Directorio
                </Link>
              </>
            )}
          </nav>

          {/* 3. SECCIÓN DERECHA: RELOJ + ESTADO + CÁPSULA DE USUARIO CON BORDE DORADO */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Reloj y Estado Socket "En Vivo" */}
            <div className="hidden sm:flex flex-col items-end text-xs">
              <div className="font-mono font-bold text-lionGold-300 tracking-wider text-xs">
                {currentTime || '08:00:00 a. m.'}
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">En Vivo</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400" />
                    <span className="text-rose-300 font-medium">Reconectando</span>
                  </>
                )}
              </div>
            </div>

            {/* Cápsula de Usuario (Exacto a la imagen del usuario) */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-[#260009] px-3.5 py-1.5 rounded-full border-2 border-[#d97706] shadow-lg">
                
                {/* Avatar circular dorado con inicial */}
                <div className="w-7 h-7 rounded-full bg-[#d97706] text-[#240008] font-black flex items-center justify-center text-xs shrink-0 shadow-inner">
                  {currentUser.role === 'PADRE' ? '👨‍👩‍👦' : avatarInitial}
                </div>

                {/* Nombre de usuario y rol en dorado */}
                <div className="text-left min-w-0 max-w-[130px] sm:max-w-[160px]">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.name}
                  </p>
                  <span className="text-[10px] text-lionGold-400 font-black tracking-wider uppercase block truncate leading-tight">
                    {roleDisplay}
                  </span>
                </div>

                {/* Botón Salir */}
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  title="Cerrar sesión"
                  className="p-1 text-burgundy-200 hover:text-white hover:bg-white/10 rounded-full transition ml-0.5"
                >
                  <LogOut className="w-4 h-4 text-lionGold-300 hover:text-lionGold-200" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-lionGold-500 hover:bg-lionGold-400 text-burgundy-950 font-black px-4 py-2 rounded-full text-xs transition flex items-center gap-1.5 shadow active:scale-95 border border-lionGold-300"
              >
                <GraduationCap className="w-4 h-4 text-burgundy-950" />
                <span>Aula Virtual</span>
              </Link>
            )}

          </div>

        </div>

        {/* Barra móvil adaptativa */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-[#800020]/60 text-xs">
          <Link
            href="/"
            className={`py-1 px-3 rounded-full text-xs font-bold ${
              pathname === '/' ? 'bg-[#800020] text-white' : 'text-burgundy-200'
            }`}
          >
            Inicio
          </Link>
          <Link
            href="/dashboard"
            className={`py-1 px-3 rounded-full text-xs font-bold ${
              pathname === '/dashboard' ? 'bg-[#800020] text-white' : 'text-lionGold-300'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/asistencia"
            className={`py-1 px-3 rounded-full text-xs font-bold ${
              pathname === '/asistencia' ? 'bg-[#800020] text-white' : 'text-burgundy-200'
            }`}
          >
            Asistencia
          </Link>
        </div>

      </div>
    </header>
  );
};
