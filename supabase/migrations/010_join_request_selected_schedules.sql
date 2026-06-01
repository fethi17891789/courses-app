-- Add selected_schedules column to join_requests
-- Stores the day numbers the student selected (null = all schedules)
ALTER TABLE join_requests
ADD COLUMN IF NOT EXISTS selected_schedules integer[] DEFAULT NULL;
