ALTER TABLE groups
ADD COLUMN IF NOT EXISTS refund_absences boolean DEFAULT false;
