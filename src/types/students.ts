export type Student = {
  id: string;
  teacher_id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  level: string;
  section: string | null;
  notes: string | null;
  auth_user_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  group_count?: number;
  // Profs associes a l'eleve (proprietaire + profs des groupes ou il est
  // inscrit). Sert au filtre "par prof" cote directeur.
  teacher_ids?: string[];
};
