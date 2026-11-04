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

      {/* Toast Flotante Global de Eventos Socket.IO */}
      {realtimeToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-burgundy-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-lionGold-400 flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center shrink-0">
            🦁
          </div>
          <div>
            <p className="text-xs font-bold text-lionGold-300">{realtimeToast.title}</p>
            <p className="text-xs text-white">{realtimeToast.description}</p>
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
