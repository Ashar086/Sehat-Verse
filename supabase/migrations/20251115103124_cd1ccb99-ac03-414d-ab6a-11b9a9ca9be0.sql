-- Create app roles for access control
CREATE TYPE public.app_role AS ENUM ('citizen', 'doctor', 'lhw', 'admin');

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  language TEXT DEFAULT 'ur',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Sehat Cards table
CREATE TABLE public.sehat_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cnic TEXT UNIQUE NOT NULL,
  father_name TEXT NOT NULL,
  income_group TEXT NOT NULL,
  eligibility_status TEXT NOT NULL,
  remaining_credits BIGINT DEFAULT 1000000,
  past_diseases TEXT[],
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sehat_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sehat card"
  ON public.sehat_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sehat card"
  ON public.sehat_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Healthcare facilities table
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ur TEXT,
  type TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  specialties TEXT[],
  available_beds INTEGER DEFAULT 0,
  current_wait_time INTEGER DEFAULT 0,
  hours TEXT,
  phone TEXT,
  has_xray BOOLEAN DEFAULT false,
  has_lab BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view facilities"
  ON public.facilities FOR SELECT
  USING (true);

-- Triage sessions table
CREATE TABLE public.triage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  urgency_level TEXT,
  ai_recommendation TEXT,
  facility_suggested UUID REFERENCES public.facilities(id),
  status TEXT DEFAULT 'active',
  session_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.triage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own triage sessions"
  ON public.triage_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create triage sessions"
  ON public.triage_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Agent interaction logs table
CREATE TABLE public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  reasoning TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON public.agent_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_sehat_cards_updated_at
  BEFORE UPDATE ON public.sehat_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();