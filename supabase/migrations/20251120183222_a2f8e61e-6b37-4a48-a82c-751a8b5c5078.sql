-- Create surveillance_alerts table for storing outbreak detection data
CREATE TABLE IF NOT EXISTS public.surveillance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  alert_type TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  city TEXT,
  case_count INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'low',
  recommendation TEXT,
  ai_assessment TEXT,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.surveillance_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all alerts
CREATE POLICY "Admins can view all surveillance alerts"
  ON public.surveillance_alerts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for public viewing (government dashboard access)
CREATE POLICY "Anyone can view surveillance alerts"
  ON public.surveillance_alerts
  FOR SELECT
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_surveillance_alerts_created_at ON public.surveillance_alerts(created_at DESC);
CREATE INDEX idx_surveillance_alerts_city ON public.surveillance_alerts(city);
CREATE INDEX idx_surveillance_alerts_disease ON public.surveillance_alerts(disease_name);
CREATE INDEX idx_surveillance_alerts_severity ON public.surveillance_alerts(severity);