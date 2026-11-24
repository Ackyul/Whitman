'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import QRCode from 'qrcode';
import { X, Printer, IdCard, Users } from 'lucide-react';

interface StudentBulkCardModalProps {
  students: User[];
  classroomTitle: string;
  onClose: () => void;
}

export const StudentBulkCardModal: React.FC<StudentBulkCardModalProps> = ({
  students,
  classroomTitle,
  onClose,
}) => {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function generateAllQrs() {
      setLoading(true);
      const map: Record<string, string> = {};
      for (const st of students) {
        try {
          const url = await QRCode.toDataURL(st.dni, {
            width: 200,
            margin: 1,
            color: { dark: '#450a0a', light: '#ffffff' },
          });
          map[st.id] = url;
        } catch (e) {
          console.error('Error generando QR para', st.dni, e);
        }
      }
      if (isMounted) {
        setQrMap(map);
        setLoading(false);
      }
    }

    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [students]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 animate-in fade-in overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none">
        
        {/* Cabecera (Oculta al imprimir) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lionGold-500/20 border border-lionGold-500/40 flex items-center justify-center text-lionGold-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg text-white">
                Impresión Masiva de Carnets • {classroomTitle}
              </h3>
              <p className="text-xs text-slate-300">
                {students.length} carnets listos para imprimir en hoja A4 (frente)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="px-4 py-2 bg-lionGold-500 text-burgundy-950 rounded-xl text-xs font-black hover:bg-lionGold-400 transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Todo ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de Carnets en Rejilla */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 print:bg-white print:p-2 print:overflow-visible">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <div className="animate-spin w-8 h-8 border-3 border-burgundy-800 border-t-transparent rounded-full mx-auto" />
              <p className="font-bold">Generando códigos QR oficiales para los alumnos...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <IdCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold">No hay alumnos asignados a esta aula.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
              {students.map((st) => {
                const rawClass = st.gradeOrClass || classroomTitle;
                const cycleName = rawClass.includes(' - ') ? rawClass.split(' - ')[0].trim() : rawClass;
                const classroomName = rawClass.includes(' - ') ? rawClass.split(' - ')[1].trim() : 'Aula 1';
                const studentCode = st.studentCode || `WHT-2026-${st.dni.slice(-4)}`;
                const qrUrl = qrMap[st.id];

                return (
                  <div
                    key={st.id}
                    className="w-full aspect-[1.586/1] rounded-2xl shadow-md border-2 border-lionGold-500/50 bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-850 text-white flex flex-col justify-between p-3.5 sm:p-4 relative overflow-hidden break-inside-avoid print:shadow-none print:border-burgundy-900"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-lionGold-500/30 pb-1.5 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center text-xs font-serif">
                          W
                        </div>
                        <div>
                          <span className="text-[7.5px] font-black tracking-widest text-lionGold-400 uppercase block leading-none">
                            Academia Whitman
                          </span>
                          <h4 className="font-serif font-black text-xs text-white leading-tight">
                            CARNET OFICIAL
                          </h4>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full bg-lionGold-500 text-burgundy-950 text-[8px] font-black uppercase">
                        2026
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="flex items-center gap-2.5 my-auto relative z-10">
                      <div className="w-14 h-16 rounded-lg border border-lionGold-400 bg-burgundy-800/80 overflow-hidden flex items-center justify-center shrink-0">
                        {st.avatar ? (
                          <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-black font-serif text-lionGold-300">
                            {st.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-[7.5px] font-bold text-lionGold-400 uppercase block">
                          Estudiante
                        </span>
                        <h3 className="font-black font-serif text-xs text-white uppercase line-clamp-2 leading-tight">
                          {st.name}
                        </h3>
                        <div className="text-[9px] pt-0.5">
                          <span className="text-slate-300">DNI: </span>
                          <strong className="font-mono text-white">{st.dni}</strong>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-lionGold-300 font-mono">{studentCode}</span>
                        </div>
                        <div className="text-[8px] text-slate-300 font-bold truncate">
                          {cycleName} • {classroomName}
                        </div>
                      </div>

                      <div className="shrink-0 bg-white p-1 rounded-lg">
                        {qrUrl && (
                          <img src={qrUrl} alt={`QR ${st.dni}`} className="w-14 h-14 object-contain" />
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-lionGold-500/30 pt-1 text-[7.5px] text-slate-300 relative z-10">
                      <span>Control de Acceso Garita</span>
                      <span className="font-mono font-bold text-lionGold-400">WHITMAN</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Se ajusta automáticamente al formato de impresión A4.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition cursor-pointer text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:overflow-visible,
          .print\\:overflow-visible * {
            visibility: visible;
          }
          .print\\:overflow-visible {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
