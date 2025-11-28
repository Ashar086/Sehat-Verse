-- Add phone_number and custom_times columns to medication_reminders
ALTER TABLE public.medication_reminders 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS custom_times TEXT[] DEFAULT ARRAY['09:00'];