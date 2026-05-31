-- Allow students to update their own rejected requests (re-send after rejection)
create policy "Students can update own requests"
  on public.join_requests for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
