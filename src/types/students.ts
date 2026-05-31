export type Student = {
  id: string;
  teacher_id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  level: string;
  section: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
  group_count?: number;
};
