-- 032: Nettoyage feedback a la suppression + FORCE RLS sur quiz/orgs
--
-- 1) feedback : remplacer ON DELETE SET NULL par un trigger qui efface
--    aussi user_name et user_email (conformite droit a l'effacement).
-- 2) FORCE ROW LEVEL SECURITY sur les tables quiz et organizations
--    (defense en profondeur, alignement avec 013_fix_rls_leak).

-- ============================================================
-- 1. Feedback : trigger de nettoyage PII a la suppression user
-- ============================================================

-- On ne peut pas changer le ON DELETE d'une FK existante sans la recréer.
-- Plutot qu'un ALTER lourd, on ajoute un trigger sur auth.users BEFORE DELETE
-- qui nettoie les champs texte de feedback (le SET NULL sur user_id se fait
-- automatiquement par la FK existante).

CREATE OR REPLACE FUNCTION public.cleanup_feedback_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.feedback
  SET user_name = NULL, user_email = NULL
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cleanup_feedback ON auth.users;
CREATE TRIGGER trg_cleanup_feedback
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_feedback_on_user_delete();

-- ============================================================
-- 2. FORCE RLS sur les tables quiz
-- ============================================================

ALTER TABLE public.quizzes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_choices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_players FORCE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 3. FORCE RLS sur les tables organizations
-- ============================================================

ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members FORCE ROW LEVEL SECURITY;
