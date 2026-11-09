'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { WhitmanProvider, useWhitman } from '../context/WhitmanContext';
import { TopNavBar } from './TopNavBar';

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { realtimeToast, currentUser } = useWhitman();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <div className={`min-h-screen flex flex-col ${isHomePage ? 'bg-[#220008]' : 'bg-[#fdfbfb]'}`}>
      
      {/* Barra de navegación superior (Inicio, Asistencias y Burbuja de Usuario) */}
      <TopNavBar />

      {/* Toast Flotante Global Moderno */}
      {realtimeToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-gradient-to-r from-burgundy-950 to-burgundy-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-lionGold-400/80 flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-200 max-w-sm sm:max-w-md">
          <div className="w-9 h-9 rounded-xl bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center shrink-0 shadow-md text-base">
            🦁
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-lionGold-300 tracking-wide uppercase">{realtimeToast.title}</p>
            <p className="text-xs text-slate-100 font-medium leading-snug break-words mt-0.5">{realtimeToast.description}</p>
          </div>
        </div>
      )}

      {/* Contenido Principal con padding inferior en móvil para la barra estilo Instagram */}
      <main className={`flex-1 ${isHomePage ? 'flex items-center justify-center p-4' : 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6'}`}>
        {children}
      </main>

    </div>
  );
}

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WhitmanProvider>
      <InnerLayout>{children}</InnerLayout>
    </WhitmanProvider>
  );
};
