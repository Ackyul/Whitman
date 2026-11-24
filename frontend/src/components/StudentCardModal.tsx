'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  RotateCw,
  QrCode,
  ShieldCheck,
  Sparkles,
  Download,
  School,
  IdCard,
} from 'lucide-react';

interface StudentCardModalProps {
  student: User;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  student,
  onClose,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Extraer ciclo y aula
  const rawClass = student.gradeOrClass || 'Academia - Aula 1';
  const cycleName = rawClass.includes(' - ') ? rawClass.split(' - ')[0].trim() : rawClass;
  const classroomName = rawClass.includes(' - ') ? rawClass.split(' - ')[1].trim() : 'Aula General';
  const studentCode = student.studentCode || `WHT-2026-${student.dni.slice(-4)}`;

  // Generar código QR de alta resolución con el DNI del alumno
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(student.dni, {
      width: 280,
      margin: 1,
      color: {
        dark: '#450a0a', // burgundy profundo
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generando QR del carnet:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [student.dni]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 flex flex-col print:shadow-none print:border-none print:max-w-none">
        
        {/* Cabecera del Modal (Oculta al imprimir) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lionGold-500/20 border border-lionGold-500/40 flex items-center justify-center text-lionGold-400">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg text-white">
                Carnet Oficial del Estudiante
              </h3>
              <p className="text-xs text-slate-300">
                Academia Preuniversitaria Whitman • Ciclo 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Vista del Carnet */}
        <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-100/60 print:bg-white print:p-0">
          
          {/* Instrucciones de interacción en pantalla */}
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 print:hidden">
            <span>Haz clic en "Girar Carnet" para ver el reverso reglamentario</span>
          </div>

          {/* Tarjeta con efecto 3D Flip */}
          <div
            className="relative w-full max-w-[420px] aspect-[1.586/1] perspective-1000 cursor-pointer select-none"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className={`w-full h-full duration-500 preserve-3d transition-transform ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              
              {/* ========================================================= */}
              {/* ANVERSO (CARA PRINCIPAL)                                  */}
              {/* ========================================================= */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border-2 border-lionGold-500/40 bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white flex flex-col justify-between p-4 sm:p-5 relative">
                
                {/* Patrón decorativo de fondo y marcas de agua */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-lionGold-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Top: Logo y Encabezado */}
                <div className="flex items-center justify-between border-b border-lionGold-500/30 pb-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center text-sm shadow-sm font-serif">
                      W
                    </div>
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-lionGold-400 uppercase block leading-none">
                        Academia Preuniversitaria
                      </span>
                      <h4 className="font-serif font-black text-sm sm:text-base tracking-wider text-white leading-tight">
                        WHITMAN
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-lionGold-500 text-burgundy-950 text-[9px] font-black uppercase tracking-wider">
                      Ciclo 2026
                    </span>
                  </div>
                </div>

                {/* Centro: Foto + Datos del Alumno + QR */}
                <div className="flex items-center gap-3 sm:gap-4 my-auto relative z-10">
                  
                  {/* Foto / Avatar del Alumno */}
                  <div className="shrink-0">
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl border-2 border-lionGold-400 bg-burgundy-800/80 overflow-hidden shadow-md flex items-center justify-center relative">
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-1 text-lionGold-300">
                          <span className="text-xl sm:text-2xl font-black font-serif">
                            {student.name.charAt(0)}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300 mt-1">
                            Whitman
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos del Estudiante */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div>
                      <span className="text-[8px] font-bold text-lionGold-400 uppercase tracking-widest block">
                        Estudiante Preuniversitario
                      </span>
                      <h2 className="font-black font-serif text-xs sm:text-sm text-white uppercase tracking-tight leading-snug line-clamp-2">
                        {student.name}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
                      <div>
                        <span className="text-slate-400 text-[8px] uppercase block">DNI:</span>
                        <span className="font-mono font-bold text-white text-xs">{student.dni}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[8px] uppercase block">Código:</span>
                        <span className="font-mono font-bold text-lionGold-300 text-xs">{studentCode}</span>
                      </div>
                    </div>

                    <div className="pt-0.5 flex flex-wrap gap-1">
                      <span className="bg-white/10 text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {cycleName}
                      </span>
                      <span className="bg-white/10 text-lionGold-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {classroomName}
                      </span>
                    </div>
                  </div>

                  {/* QR Oficial para Garita */}
                  <div className="shrink-0 flex flex-col items-center bg-white p-1 rounded-xl shadow-md border border-lionGold-400/50">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR ${student.dni}`}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-burgundy-900 animate-pulse" />
                      </div>
                    )}
                    <span className="text-[7px] font-mono font-black text-burgundy-950 mt-0.5">
                      LECTURA GARITA
                    </span>
                  </div>
                </div>

                {/* Footer: Pie Institucional */}
                <div className="flex items-center justify-between border-t border-lionGold-500/30 pt-1.5 text-[8px] text-slate-300 relative z-10">
                  <span className="font-medium tracking-wide">
                    Documento de Identificación Académica
                  </span>
                  <span className="font-mono font-bold text-lionGold-400">
                    WHITMAN ID
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* REVERSO (REGLAMENTO, SEGURIDAD Y FIRMA)                  */}
              {/* ========================================================= */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border-2 border-slate-300 bg-white text-slate-900 flex flex-col justify-between p-4 sm:p-5 relative">
                
                {/* Encabezado Reverso */}
                <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-burgundy-900" />
                    <span className="text-[10px] font-black uppercase text-burgundy-950 font-serif">
                      Reglamento Institucional de Acceso
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-500">
                    2026-II
                  </span>
                </div>

                {/* Normativa */}
                <div className="text-[8px] sm:text-[9px] text-slate-600 space-y-1 leading-tight my-auto">
                  <p>
                    <strong>1.</strong> Este carnet es personal e intransferible. Acredita la condición de alumno matriculado.
                  </p>
                  <p>
                    <strong>2.</strong> Es de porte obligatorio para el escaneo de código QR en la garita de ingreso y salida.
                  </p>
                  <p>
                    <strong>3.</strong> Obligatorio para rendir los Exámenes Simulacro de fin de semana y evaluaciones ranking.
                  </p>
                  <p>
                    <strong>4.</strong> En caso de pérdida o deterioro, el estudiante debe solicitar un duplicado en Secretaría de Normas.
                  </p>
                </div>

                {/* Código de Barras decorativo + Firma de Dirección */}
                <div className="pt-2 border-t border-slate-200 flex items-end justify-between">
                  <div className="space-y-0.5">
                    {/* Barras verticales representativas */}
                    <div className="flex items-end gap-0.5 h-6">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 3, 1, 2].map((w, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900"
                          style={{ width: `${w * 1.5}px`, height: '100%' }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-mono font-bold text-slate-700 block">
                      *{student.dni}*
                    </span>
                  </div>

                  <div className="text-center w-36 border-t border-slate-400 pt-1">
                    <p className="text-[7.5px] font-bold text-slate-800 uppercase font-serif leading-none">
                      Lic. Dirección Académica
                    </p>
                    <p className="text-[6.5px] text-slate-500 uppercase mt-0.5">
                      Academia Whitman
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Botones de acción debajo del carnet */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 print:hidden">
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-3.5 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Girar Carnet</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-burgundy-900 text-white rounded-xl text-xs font-bold hover:bg-burgundy-950 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-lionGold-400" />
              <span>Imprimir Carnet</span>
            </button>
          </div>

        </div>

        {/* Footer del Modal (Oculto al imprimir) */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span className="text-[11px]">
            El código QR contiene el DNI del alumno para registro instantáneo en garita.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition cursor-pointer text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Estilos específicos para impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .perspective-1000,
          .perspective-1000 * {
            visibility: visible;
          }
          .perspective-1000 {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};
