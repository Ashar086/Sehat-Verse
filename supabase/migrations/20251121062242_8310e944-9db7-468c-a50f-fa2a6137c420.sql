-- Create medicines table for Pakistan-based medicine database
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  generic_name TEXT,
  price_pkr NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  dosage_form TEXT NOT NULL,
  strength TEXT,
  prescription_required BOOLEAN NOT NULL DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  manufacturer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view medicines"
ON public.medicines
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_medicines_updated_at
BEFORE UPDATE ON public.medicines
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster searches
CREATE INDEX idx_medicines_category ON public.medicines(category);
CREATE INDEX idx_medicines_name ON public.medicines(name);
CREATE INDEX idx_medicines_generic ON public.medicines(generic_name);

-- Insert sample Pakistan medicines data
INSERT INTO public.medicines (name, brand, generic_name, price_pkr, category, description, dosage_form, strength, prescription_required, manufacturer) VALUES
('Panadol', 'GlaxoSmithKline', 'Paracetamol', 15, 'Painkiller', 'For fever, headache, and mild to moderate pain', 'Tablet', '500mg', false, 'GSK Pakistan'),
('Brufen', 'Abbott', 'Ibuprofen', 25, 'Painkiller', 'Anti-inflammatory for pain and fever', 'Tablet', '400mg', false, 'Abbott Laboratories'),
('Panadol Extra', 'GlaxoSmithKline', 'Paracetamol + Caffeine', 30, 'Painkiller', 'Extra strength for severe headaches', 'Tablet', '500mg+65mg', false, 'GSK Pakistan'),
('Augmentin', 'GlaxoSmithKline', 'Amoxicillin + Clavulanic Acid', 450, 'Antibiotic', 'Bacterial infections treatment', 'Tablet', '625mg', true, 'GSK Pakistan'),
('Flagyl', 'Sanofi', 'Metronidazole', 180, 'Antibiotic', 'For parasitic and bacterial infections', 'Tablet', '400mg', true, 'Sanofi Pakistan'),
('Arinac', 'Hilton Pharma', 'Paracetamol + Pseudoephedrine + Chlorpheniramine', 120, 'Cold & Flu', 'Relief from cold and flu symptoms', 'Tablet', '500mg+30mg+2mg', false, 'Hilton Pharma'),
('Risek', 'Getz Pharma', 'Omeprazole', 280, 'Antacid', 'For acidity and stomach ulcers', 'Capsule', '20mg', false, 'Getz Pharma'),
('Calpol', 'GSK', 'Paracetamol', 95, 'Painkiller', 'Liquid paracetamol for children', 'Syrup', '120mg/5ml', false, 'GSK Pakistan'),
('Disprin', 'Reckitt Benckiser', 'Aspirin', 18, 'Painkiller', 'Fast relief from pain and fever', 'Tablet', '300mg', false, 'RB Pakistan'),
('Ponstan', 'Pfizer', 'Mefenamic Acid', 95, 'Painkiller', 'For menstrual pain and inflammation', 'Tablet', '250mg', false, 'Pfizer Pakistan'),
('Ciproxin', 'Bayer', 'Ciprofloxacin', 380, 'Antibiotic', 'For bacterial infections', 'Tablet', '500mg', true, 'Bayer Pakistan'),
('Ventolin', 'GSK', 'Salbutamol', 450, 'Respiratory', 'For asthma and breathing problems', 'Inhaler', '100mcg', true, 'GSK Pakistan'),
('Cetrizine', 'Various', 'Cetirizine', 45, 'Antihistamine', 'For allergies and hay fever', 'Tablet', '10mg', false, 'Generic'),
('Dextromethorphan', 'Various', 'DXM', 85, 'Cough Syrup', 'Cough suppressant', 'Syrup', '15mg/5ml', false, 'Generic');
