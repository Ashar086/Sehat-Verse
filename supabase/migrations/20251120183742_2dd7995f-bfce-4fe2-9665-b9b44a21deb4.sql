-- Create outbreak_forecasts table for storing predictions
CREATE TABLE IF NOT EXISTS public.outbreak_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  forecast_date DATE NOT NULL,
  disease_name TEXT NOT NULL,
  city TEXT,
  predicted_cases INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'stable',
  contributing_factors TEXT[],
  recommendation TEXT,
  ai_analysis TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.outbreak_forecasts ENABLE ROW LEVEL SECURITY;

-- Create policy for public viewing (government dashboard access)
CREATE POLICY "Anyone can view outbreak forecasts"
  ON public.outbreak_forecasts
  FOR SELECT
  USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_outbreak_forecasts_date ON public.outbreak_forecasts(forecast_date DESC);
CREATE INDEX idx_outbreak_forecasts_city ON public.outbreak_forecasts(city);
CREATE INDEX idx_outbreak_forecasts_disease ON public.outbreak_forecasts(disease_name);
CREATE INDEX idx_outbreak_forecasts_risk ON public.outbreak_forecasts(risk_level);