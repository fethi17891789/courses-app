-- Quiz question types: single (QCM), multiple (plusieurs bonnes reponses), true_false (Vrai/Faux)
-- + support multi-selection answers (choice_ids)

alter table public.quiz_questions
  add column if not exists question_type text not null default 'single';

do $$ begin
  alter table public.quiz_questions
    add constraint quiz_questions_type_check
    check (question_type in ('single', 'multiple', 'true_false'));
exception
  when duplicate_object then null;
end $$;

-- A player can now select several choices (multiple-answer questions).
-- choice_id (single) is kept for backward compatibility; choice_ids holds the full selection.
alter table public.player_answers
  add column if not exists choice_ids uuid[];
