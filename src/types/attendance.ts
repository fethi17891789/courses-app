export type AttendanceStatus = "present" | "absent";

export type AttendanceRecord = {
  id: string;
  group_id: string;
  student_id: string;
  teacher_id: string;
  session_day: number;
  session_date: string;
  status: AttendanceStatus;
  created_at: string;
};

export type PaymentRecord = {
  id: string;
  group_id: string;
  student_id: string;
  teacher_id: string;
  amount: number;
  session_date: string;
  session_day: number | null;
  method: string;
  created_at: string;
};

export type TodaySession = {
  group_id: string;
  group_name: string;
  day: number;
  start_time: string;
  end_time: string;
  price: number;
  completed: boolean;
  called_student_ids: string[];
  students: {
    id: string;
    full_name: string;
    phone: string | null;
    level: string;
  }[];
};
