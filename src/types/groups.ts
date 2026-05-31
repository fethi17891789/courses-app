export type PaymentMode = "monthly" | "per_session" | "weekly";

export type Schedule = {
  day: number;
  start_time: string;
  end_time: string;
};

export type Group = {
  id: string;
  teacher_id: string;
  name: string;
  level: string;
  section: string | null;
  capacity: number;
  price: number;
  payment_mode: PaymentMode;
  schedules: Schedule[];
  join_code: string;
  created_at: string;
  member_count?: number;
};

export type GroupMember = {
  id: string;
  group_id: string;
  student_id: string;
  status: "active" | "inactive";
  joined_at: string;
  student?: {
    full_name: string;
    phone: string | null;
    level: string;
  };
};

export type JoinRequest = {
  id: string;
  group_id: string;
  student_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  resolved_at: string | null;
  student_name?: string;
  student_email?: string;
};
