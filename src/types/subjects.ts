// Teacher-facing subject (with the groups it targets).
export type Subject = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  file_path: string;
  file_size: number;
  created_at: string;
  group_ids: string[];
};

// Student-facing subject (flattened by the student_subjects() function).
export type StudentSubject = {
  id: string;
  title: string;
  teacher_name: string;
  file_size: number;
  created_at: string;
  group_names: string;
};
