'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWhitman } from '../context/WhitmanContext';
import {
  Settings,
  LogOut,
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  X,
  ChevronDown,
  Lock,
} from 'lucide-react';

export const UserBubbleMenu: React.FC = () => {
  const router = useRouter();
  const { currentUser, logout, updateUserProfile } = useWhitman();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Formulario de edición de perfil
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Cargar datos actuales cuando se abre el modal
  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setParentPhone(currentUser.parentPhone || '');
    }
  }, [currentUser, modalOpen]);

  // Cerrar el menú si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      phone: phone.trim(),
      email: email.trim(),
      parentPhone: parentPhone.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setModalOpen(false);
    }, 900);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push('/login');
  };

  const avatarInitial = currentUser.name.trim().charAt(0).toUpperCase();

  const roleDisplay = currentUser.hierarchyTitle
    ? currentUser.hierarchyTitle
    : currentUser.role === 'ALUMNO'
    ? 'Alumno Whitman'
    : currentUser.role === 'PADRE'
    ? 'Padre de Familia'
    : 'Profesor';

  return (
    <>
      {/* 1. BURBUJA DEL USUARIO (Arriba a la derecha) */}
      <div className="relative z-40" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-850 hover:from-burgundy-900 hover:to-burgundy-800 text-white pl-2 pr-3.5 py-1.5 rounded-full border-2 border-lionGold-400 shadow-lg transition active:scale-95 group"
          title="Menú de Usuario"
        >
          {/* Círculo Avatar con Borde Dorado */}
          <div className="w-8 h-8 rounded-full bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center text-sm shrink-0 shadow border border-lionGold-200">
            {currentUser.role === 'PADRE' ? '👨‍👩‍👦' : avatarInitial}
          </div>

          {/* Nombre y Flecha */}
          <div className="hidden sm:block text-left max-w-[140px]">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {currentUser.name}
            </p>
            <span className="text-[10px] text-lionGold-300 font-bold block truncate leading-tight">
              {roleDisplay}
            </span>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-lionGold-400 transition-transform ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 2. MENÚ DESPLEGABLE DE LA BURBUJA */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
            {/* Cabecera del Menú */}
            <div className="bg-gradient-to-r from-burgundy-950 to-burgundy-900 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-lionGold-500 text-burgundy-950 font-black flex items-center justify-center text-lg shadow border-2 border-lionGold-300 shrink-0">
                  {currentUser.role === 'PADRE' ? '👨‍👩‍👦' : avatarInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-lionGold-300 font-mono">DNI: {currentUser.dni}</p>
                  <span className="inline-block mt-0.5 bg-burgundy-800 text-[10px] text-burgundy-100 font-semibold px-2 py-0.5 rounded border border-burgundy-700">
                    {roleDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Opciones del Menú */}
            <div className="p-2 space-y-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-burgundy-950 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-burgundy-100 text-burgundy-800 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-burgundy-800" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Configurar perfil</p>
                  <p className="text-[10px] text-slate-400">Teléfono, correo y datos</p>
                </div>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-rose-700" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-rose-700">Cerrar sesión</p>
                  <p className="text-[10px] text-rose-400">Salir de la plataforma segura</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MODAL: CONFIGURAR PERFIL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="bg-gradient-to-r from-burgundy-950 to-burgundy-900 text-white p-5 flex items-center justify-between border-b border-lionGold-500/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-burgundy-900 rounded-xl border border-lionGold-400/40">
                  <UserIcon className="w-5 h-5 text-lionGold-400" />
                </div>
                <div>
                  <h3 className="font-black font-serif text-base text-white">Configurar Perfil</h3>
                  <p className="text-[11px] text-burgundy-200">Actualiza tus canales de contacto</p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-burgundy-200 hover:text-white hover:bg-burgundy-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              
              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Cambios guardados correctamente en tu perfil!</span>
                </div>
              )}

              {/* DNI (Solo lectura para seguridad) */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">
                  DNI (Identificador Único)
                </label>
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 font-mono font-bold text-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser.dni}</span>
                  <span className="text-[10px] text-slate-400 ml-auto font-sans font-normal">(No editable por seguridad)</span>
                </div>
              </div>

              {/* Teléfono Personal */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-burgundy-800" />
                  <span>Teléfono Móvil / WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 987654321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-burgundy-800 focus:ring-2 focus:ring-burgundy-100 text-xs font-semibold text-slate-900 outline-none transition"
                />
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-burgundy-800" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-burgundy-800 focus:ring-2 focus:ring-burgundy-100 text-xs font-semibold text-slate-900 outline-none transition"
                />
              </div>

              {/* Teléfono de Apoderado si es Alumno */}
              {currentUser.role === 'ALUMNO' && (
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Teléfono del Padre / Apoderado</span>
                  </label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="Ej: 981122334"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-burgundy-800 focus:ring-2 focus:ring-burgundy-100 text-xs font-semibold text-slate-900 outline-none transition"
                  />
                </div>
              )}

              {/* Botones de acción */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-burgundy-900 hover:bg-burgundy-950 text-white shadow-md transition active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
};

