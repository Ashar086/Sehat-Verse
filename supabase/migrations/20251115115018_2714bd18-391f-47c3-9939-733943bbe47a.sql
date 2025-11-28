-- Add notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_email BOOLEAN DEFAULT true,
ADD COLUMN notification_sms BOOLEAN DEFAULT false,
ADD COLUMN notification_push BOOLEAN DEFAULT true;

-- Create health_records table
CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('consultation', 'diagnosis', 'prescription', 'lab_result', 'imaging', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_name TEXT,
  facility_name TEXT,
  document_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on health_records
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_records
CREATE POLICY "Users can view own health records"
ON public.health_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health records"
ON public.health_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health records"
ON public.health_records
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health records"
ON public.health_records
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at on health_records
CREATE TRIGGER handle_health_records_updated_at
BEFORE UPDATE ON public.health_records
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', false);

-- Storage RLS policies for medical documents
CREATE POLICY "Users can view own medical documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own medical documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own medical documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own medical documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'medical-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add index for better query performance
CREATE INDEX idx_health_records_user_id ON public.health_records(user_id);
CREATE INDEX idx_health_records_date ON public.health_records(date DESC);
CREATE INDEX idx_health_records_type ON public.health_records(record_type);