'use client';

import React from 'react';
import Link from 'next/link';
import { useWhitman } from '../../context/WhitmanContext';
import { UsersDirectory } from '../../components/UsersDirectory';
import { ArrowLeft } from 'lucide-react';

export default function UsuariosRoute() {
  const { users, currentRole, refreshData, loading } = useWhitman();

  if (loading) {
    return (
      <div className="bg-white p-16 rounded-3xl text-center border border-slate-200 shadow-sm">
        <div className="animate-spin w-10 h-10 border-4 border-burgundy-800 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="font-bold text-slate-700">Cargando directorio de usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-burgundy-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-burgundy-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-burgundy-800" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-serif">
            Directorio de Estudiantes y Docentes
          </h1>
          <p className="text-xs text-slate-500">
            Fichas académicas, datos de apoderados y marcado rápido de asistencia.
          </p>
        </div>
      </div>

      <UsersDirectory
        users={users}
        currentRole={currentRole}
        onRefresh={refreshData}
      />
    </div>
  );
}

