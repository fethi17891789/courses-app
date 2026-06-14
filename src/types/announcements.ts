// Teacher-facing announcement (with the groups it targets).
export type Announcement = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  group_ids: string[];
};

// Student-facing announcement (flattened by the student_announcements() function).
export type StudentAnnouncement = {
  id: string;
  title: string;
  body: string;
  teacher_name: string;
  pinned: boolean;
  created_at: string;
  group_names: string;
  read_at: string | null;
};
