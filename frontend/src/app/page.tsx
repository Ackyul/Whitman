'use client';

import React from 'react';
import Link from 'next/link';
import { useWhitman } from '../context/WhitmanContext';
import { ArrowRight, GraduationCap } from 'lucide-react';

export default function HomePage() {
  const { currentUser } = useWhitman();

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      {/* Contenedor Principal Centrado */}
      <div className="w-full max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-[#3d000f] via-[#5c0018] to-[#2e000b] text-white shadow-2xl border-2 border-lionGold-500/40 p-8 sm:p-14 lg:p-20 text-center relative overflow-hidden">
        
        {/* Resplandor sutil dorado de fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(217,119,6,0.15),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-8 sm:space-y-10">
          
          {/* Logo y Marca Institucional (Sin imagen ni leones, solo WHITMAN y subtítulo) */}
          <div className="space-y-3">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black font-serif tracking-widest text-white uppercase drop-shadow-lg">
              WHITMAN
            </h1>

            {/* Subtítulo institucional */}
            <p className="text-lg sm:text-2xl lg:text-3xl text-burgundy-100 font-medium tracking-wide">
              Academia Preuniversitaria & Colegio
            </p>
          </div>

          {/* Botón único para ir al Aula Virtual */}
          <div className="pt-2 sm:pt-4 w-full max-w-sm">
            <Link
              href={currentUser ? '/dashboard' : '/login'}
              className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-lionGold-500 via-lionGold-400 to-lionGold-500 hover:from-lionGold-400 hover:to-lionGold-300 text-burgundy-950 font-black px-8 py-4 sm:py-5 rounded-2xl text-base sm:text-lg shadow-2xl shadow-lionGold-500/20 border-2 border-lionGold-200 transition-all active:scale-95 group"
            >
              <GraduationCap className="w-6 h-6 text-burgundy-950 group-hover:rotate-12 transition-transform" />
              <span>{currentUser ? 'Ir a mi Aula Virtual' : 'Ir al Aula Virtual'}</span>
              <ArrowRight className="w-5 h-5 text-burgundy-950 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
