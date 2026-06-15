-- ============================================================
-- FIX (isolation): la policy "Anyone authenticated can lookup group by join_code"
-- (migration 005) autorisait TOUT utilisateur connecte a lire TOUS les groupes
-- via la cle anon : noms, prix, horaires, teacher_id et join_code de tous les profs.
--
-- Elle n'est plus necessaire : le flux d'inscription passe par l'API serveur
-- /api/join/[code] (service_role, controles d'autorisation en code). On la
-- supprime pour que seul le prof proprietaire voie ses groupes
-- (policy "Teachers see own groups").
-- ============================================================

drop policy if exists "Anyone authenticated can lookup group by join_code" on public.groups;
