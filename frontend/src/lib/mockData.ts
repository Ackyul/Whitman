import { User, AttendanceRecord, GradeRecord, WhitmanStats } from '../types';

export const MOCK_USERS: User[] = [];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [];

export const MOCK_GRADES: GradeRecord[] = [];

export const MOCK_STATS: WhitmanStats = {
  totalStudents: 0,
  totalTeachers: 0,
  todayAttendance: {
    present: 0,
    late: 0,
    absent: 0,
    justified: 0,
    totalMarked: 0,
    attendanceRate: 100,
  },
  academicAverage: 0,
};
