-- Espace Ecoles (multi-prof) -- fondations
--
-- Une ecole = une "organization" possedee par un directeur (owner_id).
-- Le directeur paie un nombre de sieges (seat_limit). Il invite des profs
-- via son code de parrainage existant : le filleul devient un membre de
-- l'ecole (organization_members) au lieu d'ouvrir un compte inde.
--
-- Isolation : chaque prof ne voit que ses propres donnees (teacher_id).
-- Le directeur voit TOUTES les donnees des profs de son ecole (org_id).
-- Un prof d'ecole ne peut PAS creer de donnees "perso" : un trigger force
-- org_id = son ecole a l'insertion. Impossible de detourner le compte.

-- 1. Cles d'activation : deux plans ecole + nombre de sieges (profs)
--    school_starter : jusqu'a 5 profs / school_pro : jusqu'a 10 profs.
--    La difference entre les deux = uniquement le seat_limit (nb de profs).
ALTER TABLE public.activation_keys
  DROP CONSTRAINT IF EXISTS activation_keys_plan_check;

ALTER TABLE public.activation_keys
  ADD CONSTRAINT activation_keys_plan_check
    CHECK (plan IN ('starter', 'pro', 'school_starter', 'school_pro'));

-- Nombre de profs autorises pour une cle ecole (NULL pour les cles inde)
ALTER TABLE public.activation_keys
  ADD COLUMN IF NOT EXISTS seat_limit int;

-- 2. Ecoles
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  seat_limit int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Membres (les profs salaries de l'ecole ; le directeur n'est pas membre)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS organization_members_org_idx
  ON public.organization_members (org_id, status);

-- 4. Rattachement des donnees metier a une ecole (NULL = compte inde)
ALTER TABLE public.groups     ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.students   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.payments   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS groups_org_idx     ON public.groups (org_id);
CREATE INDEX IF NOT EXISTS students_org_idx   ON public.students (org_id);
CREATE INDEX IF NOT EXISTS attendance_org_idx ON public.attendance (org_id);
CREATE INDEX IF NOT EXISTS payments_org_idx   ON public.payments (org_id);

-- 5. Fonctions d'aide (SECURITY DEFINER = ne declenchent pas la RLS,
--    ce qui evite la recursion de policies deja rencontree)

-- L'ecole dont l'utilisateur courant est le directeur (ou NULL)
CREATE OR REPLACE FUNCTION public.admin_org_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT id FROM public.organizations WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- L'ecole dont l'utilisateur courant est un prof membre actif (ou NULL)
CREATE OR REPLACE FUNCTION public.member_org_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active' LIMIT 1;
$$;

-- 5b. Acces actif : sa propre cle (prof inde / directeur) OU, pour un prof
--     d'ecole sans cle, l'abonnement du directeur de son ecole.
CREATE OR REPLACE FUNCTION public.has_active_access(p_user uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  exp timestamptz;
  owner uuid;
BEGIN
  -- Derniere cle de l'utilisateur lui-meme
  SELECT expires_at INTO exp
    FROM public.activation_keys
    WHERE used_by = p_user
    ORDER BY used_at DESC LIMIT 1;
  IF FOUND AND (exp IS NULL OR exp > now()) THEN
    RETURN true;
  END IF;

  -- Prof d'ecole : on se rabat sur l'abonnement du directeur
  SELECT o.owner_id INTO owner
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.org_id
    WHERE m.user_id = p_user AND m.status = 'active'
    LIMIT 1;
  IF owner IS NOT NULL THEN
    SELECT expires_at INTO exp
      FROM public.activation_keys
      WHERE used_by = owner
      ORDER BY used_at DESC LIMIT 1;
    IF FOUND AND (exp IS NULL OR exp > now()) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- 6. RLS des tables ecole
CREATE POLICY "Directeur voit son ecole"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Prof voit son ecole"
  ON public.organizations FOR SELECT
  USING (id = public.member_org_id());

CREATE POLICY "Directeur gere ses membres"
  ON public.organization_members FOR ALL
  USING (org_id = public.admin_org_id());

CREATE POLICY "Prof voit sa fiche membre"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- 7. Le directeur voit (lecture) toutes les donnees des profs de son ecole.
--    Les policies "teacher_id = auth.uid()" existantes restent inchangees.
CREATE POLICY "Directeur lit les groupes de l'ecole"
  ON public.groups FOR SELECT
  USING (org_id IS NOT NULL AND org_id = public.admin_org_id());

CREATE POLICY "Directeur lit les eleves de l'ecole"
  ON public.students FOR SELECT
  USING (org_id IS NOT NULL AND org_id = public.admin_org_id());

CREATE POLICY "Directeur lit les presences de l'ecole"
  ON public.attendance FOR SELECT
  USING (org_id IS NOT NULL AND org_id = public.admin_org_id());

CREATE POLICY "Directeur lit les paiements de l'ecole"
  ON public.payments FOR SELECT
  USING (org_id IS NOT NULL AND org_id = public.admin_org_id());

-- 8. Anti-abus : un prof d'ecole ne peut PAS creer de donnees "perso".
--    A l'insertion, org_id est force a son ecole. Un prof inde (non membre)
--    n'est pas concerne : org_id reste NULL.
CREATE OR REPLACE FUNCTION public.force_org_id()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  my_org uuid;
BEGIN
  my_org := public.member_org_id();
  IF my_org IS NOT NULL THEN
    NEW.org_id := my_org;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER groups_force_org     BEFORE INSERT ON public.groups     FOR EACH ROW EXECUTE FUNCTION public.force_org_id();
CREATE TRIGGER students_force_org   BEFORE INSERT ON public.students   FOR EACH ROW EXECUTE FUNCTION public.force_org_id();
CREATE TRIGGER attendance_force_org BEFORE INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.force_org_id();
CREATE TRIGGER payments_force_org   BEFORE INSERT ON public.payments   FOR EACH ROW EXECUTE FUNCTION public.force_org_id();
