'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AttendanceRecord, GradeRecord, WhitmanStats, UserRole, EducationLevel } from '../types';
import { fetchUsers, fetchAttendance, fetchGrades, fetchStats, loginUser, registerStudent as apiRegisterStudent, assignStudentToClass } from '../lib/api';
import { getSocket } from '../lib/socket';
import { MOCK_USERS, MOCK_ATTENDANCE, MOCK_GRADES, MOCK_STATS } from '../lib/mockData';

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
  login: (identifier: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  registerNewStudent: (data: any) => Promise<{ success: boolean; message: string; user?: User }>;
  updateUserProfile: (updatedData: Partial<User>) => void;
  updateStudentDesignation: (studentId: string, level: EducationLevel, gradeOrClass: string) => void;
  refreshData: () => Promise<void>;
  realtimeToast: { title: string; description: string } | null;
  setRealtimeToast: (toast: { title: string; description: string } | null) => void;
}

const WhitmanContext = createContext<WhitmanContextType | undefined>(undefined);

export const WhitmanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [grades, setGrades] = useState<GradeRecord[]>(MOCK_GRADES);
  const [stats, setStats] = useState<WhitmanStats>(MOCK_STATS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('ALUMNO');
  const [realtimeToast, setRealtimeToast] = useState<{ title: string; description: string } | null>(null);

  // Cargar sesión guardada de localStorage al inicio
  useEffect(() => {
    try {
      const saved = localStorage.getItem('whitman_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed.user);
        setCurrentRole(parsed.user.role);
        if (parsed.linkedStudents) {
          setLinkedStudents(parsed.linkedStudents);
        }
      }
    } catch (e) {
      console.warn('Error leyendo sesión de localStorage:', e);
    }
  }, []);

  const login = async (identifier: string, role: UserRole) => {
    try {
      const res = await loginUser(identifier, role);
      setCurrentUser(res.user);
      setCurrentRole(res.user.role);
      if (res.linkedStudents) {
        setLinkedStudents(res.linkedStudents);
      } else {
        setLinkedStudents([]);
      }
      localStorage.setItem(
        'whitman_user_session',
        JSON.stringify({ user: res.user, linkedStudents: res.linkedStudents || [] })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al iniciar sesión' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setLinkedStudents([]);
    setCurrentRole('ALUMNO');
    localStorage.removeItem('whitman_user_session');
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
          JSON.stringify({ ...parsed, user: updated })
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
            JSON.stringify({ ...parsed, user: updated })
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
      console.warn('Usando datos de respaldo de Whitman:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    let socket: any = null;
    try {
      socket = getSocket();

      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      const handleNewAttendance = (record: AttendanceRecord) => {
        setAttendance((prev) => {
          const filtered = prev.filter((i) => i.userId !== record.userId || i.date !== record.date);
          return [record, ...filtered];
        });
        setRealtimeToast({
          title: '⚡ Asistencia Marcada en Tiempo Real',
          description: `${record.userName} registró ${record.status} a las ${record.time}`,
        });
        setTimeout(() => setRealtimeToast(null), 5000);
      };

      const handleUpdateAttendance = (record: AttendanceRecord) => {
        setAttendance((prev) => prev.map((i) => (i.id === record.id ? record : i)));
      };

      const handleNewGrade = (grade: GradeRecord) => {
        setGrades((prev) => [grade, ...prev]);
        setRealtimeToast({
          title: '🎓 Calificación Publicada',
          description: `${grade.userName} recibió nota en ${grade.course} (${grade.score}/20)`,
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
