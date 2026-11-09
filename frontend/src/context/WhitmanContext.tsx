'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, AttendanceRecord, GradeRecord, WhitmanStats, UserRole, EducationLevel } from '../types';
import {
  fetchUsers,
  fetchAttendance,
  fetchGrades,
  fetchStats,
  loginUser,
  registerStudent as apiRegisterStudent,
  assignStudentToClass,
} from '../lib/api';
import { getSocket } from '../lib/socket';
import { MOCK_STATS } from '../lib/mockData';

export interface ToastMessage {
  id?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  message?: string;
}

interface WhitmanContextType {
  currentUser: User | null;
  linkedStudents: User[];
  users: User[];
  students: User[];
  teachers: User[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  stats: WhitmanStats;
  loading: boolean;
  isConnected: boolean;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  login: (identifier: string, role: UserRole, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  registerNewStudent: (data: any) => Promise<{ success: boolean; message: string; user?: User }>;
  updateUserProfile: (updatedData: Partial<User>) => void;
  updateStudentDesignation: (studentId: string, level: EducationLevel, gradeOrClass: string) => void;
  refreshData: () => Promise<void>;
  realtimeToast: { title: string; description: string } | null;
  setRealtimeToast: (toast: { title: string; description: string } | null) => void;
  showToast: (toast: { type?: 'success' | 'error' | 'info' | 'warning'; title: string; message: string; duration?: number }) => void;
}

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutos de inactividad
const WhitmanContext = createContext<WhitmanContextType | undefined>(undefined);

export const WhitmanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [stats, setStats] = useState<WhitmanStats>(MOCK_STATS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('ALUMNO');
  const [realtimeToast, setRealtimeToast] = useState<{ title: string; description: string } | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(
    (t: { type?: 'success' | 'error' | 'info' | 'warning'; title: string; message: string; duration?: number }) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setRealtimeToast({
        title: t.title,
        description: t.message,
      });
      toastTimeoutRef.current = setTimeout(() => {
        setRealtimeToast(null);
      }, t.duration || 4500);
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setSessionToken(null);
    setLinkedStudents([]);
    setCurrentRole('ALUMNO');
    try {
      localStorage.removeItem('whitman_user_session');
    } catch (e) {
      console.warn('Error borrando storage:', e);
    }
  }, []);

  // Cargar sesión guardada de localStorage al inicio con verificación de inactividad
  useEffect(() => {
    try {
      const saved = localStorage.getItem('whitman_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        const lastActivity = parsed.lastActivity || 0;
        const now = Date.now();

        // Si han pasado más de 20 minutos desde la última actividad, la sesión ha expirado
        if (now - lastActivity > INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem('whitman_user_session');
          showToast({
            type: 'warning',
            title: 'Sesión Expirada por Inactividad',
            message: 'Han transcurrido más de 20 minutos sin actividad. Ingresa nuevamente.',
          });
        } else if (parsed.user) {
          setCurrentUser(parsed.user);
          setCurrentRole(parsed.user.role);
          setSessionToken(parsed.sessionToken || null);
          if (parsed.linkedStudents) {
            setLinkedStudents(parsed.linkedStudents);
          }
          // Actualizar hora de actividad
          lastActivityRef.current = now;
          localStorage.setItem(
            'whitman_user_session',
            JSON.stringify({ ...parsed, lastActivity: now })
          );
        }
      }
    } catch (e) {
      console.warn('Error leyendo sesión de localStorage:', e);
    }
    refreshData();
  }, [showToast]);

  // Listener de actividad de usuario (mouse, teclado, touch, scroll)
  useEffect(() => {
    if (!currentUser) return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Verificador periódico de inactividad (cada 15 segundos)
    const inactivityInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        logout();
        showToast({
          type: 'warning',
          title: 'Sesión cerrada por inactividad',
          message: 'Tu cuenta se cerró automáticamente tras 20 minutos de inactividad para proteger tus datos.',
        });
      } else {
        // Persistir timestamp de actividad en localStorage periódicamente
        try {
          const saved = localStorage.getItem('whitman_user_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem(
              'whitman_user_session',
              JSON.stringify({ ...parsed, lastActivity: lastActivityRef.current })
            );
          }
        } catch (e) {}
      }
    }, 15000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(inactivityInterval);
    };
  }, [currentUser, logout, showToast]);

  // Verificador de concurrencia de sesión en servidor (detectar inicio de sesión en otro dispositivo)
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    const verifySessionConcurrency = async () => {
      try {
        const id = currentUser.dni || currentUser.id;
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id, sessionToken }),
        });
        const data = await res.json();
        if (data && data.valid === false && data.reason === 'CONCURRENT_LOGIN') {
          logout();
          showToast({
            type: 'error',
            title: 'Sesión abierta en otro dispositivo',
            message: 'Se ha iniciado sesión con tu cuenta desde otro equipo. Esta sesión fue finalizada por seguridad.',
            duration: 7000,
          });
        }
      } catch (e) {
        // Falla de red transitoria: no desloguear
      }
    };

    const interval = setInterval(verifySessionConcurrency, 45000);
    return () => clearInterval(interval);
  }, [currentUser, sessionToken, logout, showToast]);

  const login = async (identifier: string, role: UserRole, password?: string) => {
    try {
      const res = await loginUser(identifier, role, password);
      const token = res.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      setCurrentUser(res.user);
      setCurrentRole(res.user.role);
      setSessionToken(token);

      if (res.linkedStudents) {
        setLinkedStudents(res.linkedStudents);
      } else {
        setLinkedStudents([]);
      }

      const now = Date.now();
      lastActivityRef.current = now;

      localStorage.setItem(
        'whitman_user_session',
        JSON.stringify({
          user: res.user,
          linkedStudents: res.linkedStudents || [],
          sessionToken: token,
          lastActivity: now,
        })
      );

      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al iniciar sesión' };
    }
  };

  const registerNewStudent = async (data: any) => {
    try {
      const res = await apiRegisterStudent(data);
      if (res.user) {
        setUsers((prev) => [res.user, ...prev]);
      }
      return { success: true, message: res.message, user: res.user };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al registrar alumno' };
    }
  };

  const updateUserProfile = (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedData };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    try {
      const saved = localStorage.getItem('whitman_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem(
          'whitman_user_session',
          JSON.stringify({ ...parsed, user: updated, lastActivity: Date.now() })
        );
      }
    } catch (e) {
      console.warn('Error actualizando sesión en storage:', e);
    }
  };

  const updateStudentDesignation = (studentId: string, level: EducationLevel, gradeOrClass: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === studentId ? { ...u, level, gradeOrClass } : u))
    );
    if (currentUser && currentUser.id === studentId) {
      const updated = { ...currentUser, level, gradeOrClass };
      setCurrentUser(updated);
      try {
        const saved = localStorage.getItem('whitman_user_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          localStorage.setItem(
            'whitman_user_session',
            JSON.stringify({ ...parsed, user: updated, lastActivity: Date.now() })
          );
        }
      } catch (e) {
        console.warn('Error storage:', e);
      }
    }
    setLinkedStudents((prev) =>
      prev.map((st) => (st.id === studentId ? { ...st, level, gradeOrClass } : st))
    );
    assignStudentToClass(studentId, gradeOrClass).catch((err) => {
      console.warn('Sync asignación en Neon:', err);
    });
  };

  const refreshData = useCallback(async () => {
    try {
      const [u, a, g, s] = await Promise.all([
        fetchUsers(),
        fetchAttendance(),
        fetchGrades(),
        fetchStats(),
      ]);
      setUsers(u);
      setAttendance(a);
      setGrades(g);
      setStats(s);
    } catch (err) {
      console.warn('Fallo cargando datos de Neon DB:', err);
    }
  }, []);

  // WebSockets para tiempo real (asistencia, calificaciones y estadísticas)
  useEffect(() => {
    let socket: any;
    try {
      socket = getSocket();

      const handleConnect = () => {
        setIsConnected(true);
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      const handleNewAttendance = (record: AttendanceRecord) => {
        setAttendance((prev) => [record, ...prev]);
        setRealtimeToast({
          title: 'Asistencia Registrada',
          description: `${record.userName} marcó ${record.status} a las ${record.time}`,
        });
        setTimeout(() => setRealtimeToast(null), 5000);
      };

      const handleUpdateAttendance = (record: AttendanceRecord) => {
        setAttendance((prev) => prev.map((a) => (a.id === record.id ? record : a)));
      };

      const handleNewGrade = (grade: GradeRecord) => {
        setGrades((prev) => [grade, ...prev]);
        setRealtimeToast({
          title: 'Nueva Calificación Registrada',
          description: `${grade.userName}: ${grade.score}/20 en ${grade.course}`,
        });
        setTimeout(() => setRealtimeToast(null), 5000);
      };

      const handleUpdateGrade = (grade: GradeRecord) => {
        setGrades((prev) => prev.map((i) => (i.id === grade.id ? grade : i)));
      };

      const handleStatsUpdate = (newStats: WhitmanStats) => {
        setStats(newStats);
      };

      const handleNewUser = (user: User) => {
        setUsers((prev) => [user, ...prev]);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('attendance:new', handleNewAttendance);
      socket.on('attendance:update', handleUpdateAttendance);
      socket.on('grade:new', handleNewGrade);
      socket.on('grade:update', handleUpdateGrade);
      socket.on('stats:update', handleStatsUpdate);
      socket.on('user:new', handleNewUser);

      if (socket.connected) {
        setIsConnected(true);
      }
    } catch (e) {
      console.warn('Socket error:', e);
    }

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('attendance:new');
        socket.off('attendance:update');
        socket.off('grade:new');
        socket.off('grade:update');
        socket.off('stats:update');
        socket.off('user:new');
      }
    };
  }, [refreshData]);

  const students = users.filter((u) => u.role === 'ALUMNO');
  const teachers = users.filter((u) => u.role === 'DOCENTE');

  return (
    <WhitmanContext.Provider
      value={{
        currentUser,
        linkedStudents,
        users,
        students,
        teachers,
        attendance,
        grades,
        stats,
        loading,
        isConnected,
        currentRole,
        setCurrentRole,
        login,
        logout,
        registerNewStudent,
        updateUserProfile,
        updateStudentDesignation,
        refreshData,
        realtimeToast,
        setRealtimeToast,
        showToast,
      }}
    >
      {children}
    </WhitmanContext.Provider>
  );
};

export const useWhitman = () => {
  const context = useContext(WhitmanContext);
  if (!context) {
    throw new Error('useWhitman debe usarse dentro de un WhitmanProvider');
  }
  return context;
};
