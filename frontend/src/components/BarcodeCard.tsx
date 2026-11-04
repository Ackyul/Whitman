import React from 'react';
import { User } from '../types';
import { WhitmanLionMascot } from './WhitmanLionMascot';

interface BarcodeCardProps {
  user: User;
  onPrint?: () => void;
}

export const BarcodeCard: React.FC<BarcodeCardProps> = ({ user, onPrint }) => {
  // Generador visual de barras estilo Code 128 basado en los dígitos del DNI
  const generateBarcodeLines = (dni: string) => {
    const bars: { width: number; isBlack: boolean }[] = [];
    const seed = dni.split('').map(Number);

    // Patrón de inicio
    bars.push({ width: 3, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });

    seed.forEach((digit, index) => {
      const d = isNaN(digit) ? 5 : digit;
      const w1 = ((d + index) % 3) + 1;
      const w2 = ((d * 2 + 1) % 3) + 1;
      const w3 = (d % 2) + 1;

      bars.push({ width: w1, isBlack: true });
      bars.push({ width: w2, isBlack: false });
      bars.push({ width: w3, isBlack: true });
      bars.push({ width: 2, isBlack: false });
    });

    // Patrón de parada
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 4, isBlack: true });

    return bars;
  };

  const barcodeBars = generateBarcodeLines(user.dni);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-200 max-w-sm mx-auto flex flex-col justify-between space-y-5 print:shadow-none print:border-slate-800">
      
      {/* Cabecera del Carnet */}
      <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 p-4 rounded-2xl text-white flex items-center justify-between border border-lionGold-400/40">
        <div className="flex items-center gap-2.5">
          <WhitmanLionMascot size="sm" />
          <div>
            <h4 className="font-serif font-black tracking-wider text-xs uppercase leading-tight">
              COLEGIO & ACADEMIA WHITMAN
            </h4>
            <span className="text-[9px] text-lionGold-300 font-bold uppercase tracking-wider">
              {user.level === 'ACADEMIA' ? 'CICLO PREUNIVERSITARIO' : 'NIVEL SECUNDARIA'}
            </span>
          </div>
        </div>
        <span className="bg-lionGold-500 text-burgundy-950 text-[10px] font-black px-2 py-0.5 rounded font-mono">
          2026
        </span>
      </div>

      {/* Foto y Datos del Estudiante */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-burgundy-800 shrink-0 shadow-sm">
          <img
            src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 uppercase font-black">Estudiante Titular</p>
          <h3 className="text-sm font-black text-slate-900 leading-snug truncate">
            {user.name}
          </h3>
          <p className="text-xs font-bold text-burgundy-800 truncate mt-0.5">
            {user.gradeOrClass}
          </p>
          <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
            CÓD: <span className="text-slate-800">{user.studentCode || 'WHT-2026'}</span>
          </p>
        </div>
      </div>

      {/* CÓDIGO DE BARRAS FÍSICO PARA PISTOLA LECTORA */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
        <div className="flex items-center justify-center h-14 overflow-hidden px-2 bg-white border border-slate-200 rounded-lg">
          {barcodeBars.map((bar, i) => (
            <div
              key={i}
              className={`h-full shrink-0 ${bar.isBlack ? 'bg-black' : 'bg-transparent'}`}
              style={{ width: `${bar.width * 2}px` }}
            />
          ))}
        </div>
        <p className="text-sm font-mono font-black tracking-[0.25em] text-slate-800 pt-1">
          * {user.dni} *
        </p>
        <p className="text-[9px] text-slate-400 uppercase font-semibold">
          Código de barras para pistola lectora en portería
        </p>
      </div>

      {/* Footer del Carnet */}
      <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Apoderado DNI: {user.parentDni || '—'}</span>
        <span className="font-bold text-burgundy-800">Leones Whitman 🦁</span>
      </div>

      {onPrint && (
        <button
          onClick={onPrint}
          className="w-full bg-burgundy-800 hover:bg-burgundy-900 text-white font-bold py-2 rounded-xl text-xs transition print:hidden"
        >
          Imprimir Carnet Físico
        </button>
      )}
    </div>
  );
};

