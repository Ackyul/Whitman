'use client';

import React, { useState } from 'react';
import { User, UserRole, EducationLevel } from '../types';
import { useWhitman } from '../context/WhitmanContext';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  GraduationCap,
  ShieldAlert,
  Building,
  School,
  QrCode,
  CheckCircle,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { markAttendance } from '../lib/api';

interface UsersDirectoryProps {
  users: User[];
  currentRole: UserRole;
  onRefresh: () => void;
}

export const UsersDirectory: React.FC<UsersDirectoryProps> = ({
  users,
  currentRole,
  onRefresh,
}) => {
  const { updateStudentDesignation } = useWhitman();
  const [filterRole, setFilterRole] = useState<'TODOS' | UserRole>('TODOS');
  const [filterLevel, setFilterLevel] = useState<'TODOS' | EducationLevel>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [markedFeedback, setMarkedFeedback] = useState<string | null>(null);

  // Modal para designar clase y grado
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [targetLevel, setTargetLevel] = useState<EducationLevel>('SECUNDARIA');
  const [targetClass, setTargetClass] = useState<string>('');

  const handleOpenEdit = (user: User) => {
    setEditingStudent(user);
    setTargetLevel(user.level || 'SECUNDARIA');
    setTargetClass(user.gradeOrClass || '');
  };

  const handleSaveDesignation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !targetClass.trim()) return;

    updateStudentDesignation(editingStudent.id, targetLevel, targetClass.trim());
    setMarkedFeedback(`¡Grado y clase actualizados para ${editingStudent.name}: ${targetClass.trim()}!`);
    setEditingStudent(null);
    setTimeout(() => setMarkedFeedback(null), 4000);
    onRefresh();
  };

  const handleQuickMark = async (dni: string, name: string) => {
    try {
      await markAttendance({ dni, method: 'QR' });
      setMarkedFeedback(`¡Asistencia marcada para ${name}!`);
      setTimeout(() => setMarkedFeedback(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al marcar asistencia');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'TODOS' && u.role !== filterRole) return false;
    if (filterLevel !== 'TODOS' && u.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchDni = u.dni.includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchClass = u.gradeOrClass.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchEmail && !matchClass) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Notificación de marcado rápido */}
      {markedFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{markedFeedback}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-burgundy-800" />
            <span>Directorio de Miembros Whitman ({filteredUsers.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Alumnos de Academia Preuniversitaria, Colegio y Plana Docente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-burgundy-600 w-48"
            />
          </div>

          {/* Filtro Rol */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
          >
            <option value="TODOS">Todos los roles</option>
            <option value="ALUMNO">Alumnos</option>
            <option value="DOCENTE">Docentes</option>
            <option value="ADMIN">Directivos</option>
          </select>

          {/* Filtro Nivel */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium bg-white text-slate-700 focus:outline-none focus:border-burgundy-600"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="PRIMARIA">🎒 Primaria</option>
            <option value="SECUNDARIA">🏫 Secundaria</option>
            <option value="ACADEMIA">🦁 Academia</option>
          </select>
        </div>
      </div>

      {/* Grid de Carnets de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-burgundy-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    user.role === 'ALUMNO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : user.role === 'DOCENTE'
                      ? 'bg-burgundy-100 text-burgundy-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {user.role}
                </span>

                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {user.level === 'ACADEMIA'
                    ? '🦁 Academia'
                    : user.level === 'PRIMARIA'
                    ? '🎒 Primaria'
                    : user.level === 'SECUNDARIA'
                    ? '🏫 Secundaria'
                    : '🏫 Colegio'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-burgundy-100 border-2 border-lionGold-400/50 shrink-0">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {user.name}
                  </h4>
                  <p className="text-xs text-burgundy-800 font-semibold truncate">
                    {user.gradeOrClass}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    DNI: {user.dni}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {user.role === 'ALUMNO' && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(user)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Designar Grado y Clase</span>
                </button>

                <button
                  onClick={() => handleQuickMark(user.dni, user.name)}
                  className="w-full bg-burgundy-50 hover:bg-burgundy-800 text-burgundy-900 hover:text-white border border-burgundy-200 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Marcar Asistencia Hoy</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal para designar grado y clase */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-serif font-black text-lg">Designar Grado y Clase</h3>
                <p className="text-xs text-burgundy-200 mt-0.5">{editingStudent.name} (DNI: {editingStudent.dni})</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="w-8 h-8 rounded-full bg-burgundy-900/80 hover:bg-burgundy-800 flex items-center justify-center transition text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDesignation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nivel Educativo
                </label>
                <select
                  value={targetLevel}
                  onChange={(e) => {
                    const lvl = e.target.value as EducationLevel;
                    setTargetLevel(lvl);
                    if (lvl === 'PRIMARIA') setTargetClass('6to Primaria - Leones');
                    if (lvl === 'SECUNDARIA') setTargetClass('5to Secundaria - Alfa');
                    if (lvl === 'ACADEMIA') setTargetClass('Ciclo Semianual UNI');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold focus:outline-none focus:border-burgundy-700 bg-white"
                >
                  <option value="PRIMARIA">🎒 Primaria</option>
                  <option value="SECUNDARIA">🏫 Secundaria</option>
                  <option value="ACADEMIA">🦁 Academia Preuniversitaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Grado / Clase / Ciclo
                </label>
                <input
                  type="text"
                  required
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  placeholder="Ej: 5to Secundaria - Alfa o Ciclo UNI"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold focus:outline-none focus:border-burgundy-700"
                />
              </div>

              {/* Opciones rápidas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                  Sugerencias Rápidas para {targetLevel}:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {targetLevel === 'PRIMARIA' && (
                    <>
                      {['3ro Primaria - Beta', '5to Primaria - Alfa', '6to Primaria - Leones'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTargetClass(c)}
                          className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition"
                        >
                          {c}
                        </button>
                      ))}
                    </>
                  )}
                  {targetLevel === 'SECUNDARIA' && (
                    <>
                      {['1ro Secundaria - Alfa', '3ro Secundaria - Beta', '5to Secundaria - Alfa'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTargetClass(c)}
                          className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition"
                        >
                          {c}
                        </button>
                      ))}
                    </>
                  )}
                  {targetLevel === 'ACADEMIA' && (
                    <>
                      {['Ciclo Semianual UNI', 'Ciclo San Marcos - Medicina', 'Ciclo Repaso Intensivo', 'Ciclo Anual'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTargetClass(c)}
                          className="text-xs bg-slate-100 hover:bg-burgundy-50 hover:text-burgundy-900 border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition"
                        >
                          {c}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-burgundy-800 hover:bg-burgundy-900 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Check className="w-4 h-4 text-lionGold-400" />
                  <span>Guardar Designación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

