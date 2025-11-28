-- Seed facilities data from PDF
INSERT INTO public.facilities (name, name_ur, type, address, city, phone, specialties, available_beds, current_wait_time, has_lab, has_xray, hours, rating, latitude, longitude) VALUES
-- Karachi
('Jinnah Postgraduate Medical Centre', 'اسپتال جناح', 'hospital', 'Rafiqui Shaheed Road, Karachi', 'Karachi', '+92-21-99201300', ARRAY['Emergency', 'General Medicine', 'Surgery'], 150, 45, true, true, '24/7', 4.2, 24.8607, 67.0011),
('Aga Khan University Hospital', NULL, 'hospital', 'Stadium Road, Karachi', 'Karachi', '+92-21-34930051', ARRAY['Emergency', 'Cardiology', 'Oncology'], 120, 30, true, true, '24/7', 4.8, 24.8879, 67.0697),
('Dr. Ruth Pfau Civil Hospital', 'سول ہسپتال کراچی', 'hospital', 'Baba-e-Urdu Road, Saddar, Karachi', 'Karachi', '+92-21-99215740', ARRAY['Emergency', 'General Medicine'], 200, 60, true, true, '24/7', 3.9, 24.8546, 67.0071),

-- Lahore
('Mayo Hospital', NULL, 'hospital', 'Anarkali Bazaar, Lahore', 'Lahore', '+92-42-99211501', ARRAY['Emergency', 'General Medicine', 'Surgery'], 180, 50, true, true, '24/7', 4.1, 31.5629, 74.3297),
('Jinnah Hospital', NULL, 'hospital', 'Allama Shabbir Ahmed Usmani Road, Faisal Town, Lahore', 'Lahore', '+92-42-99231441', ARRAY['Emergency', 'Orthopedics'], 160, 40, true, true, '24/7', 4.3, 31.4633, 74.2726),
('Shaukat Khanum Memorial Cancer Hospital', 'ہسپتال خانم شوکت', 'hospital', 'Johar Town, Lahore', 'Lahore', '+92-42-35905000', ARRAY['Oncology', 'Radiology'], 100, 25, true, true, '8 AM - 8 PM', 4.9, 31.4711, 74.2678),

-- Islamabad
('Pakistan Institute of Medical Sciences (PIMS)', NULL, 'hospital', 'Sector G-8/3, Islamabad', 'Islamabad', '+92-51-9260500', ARRAY['Emergency', 'General Medicine', 'Pediatrics'], 140, 35, true, true, '24/7', 4.0, 33.6938, 73.0651),
('Federal Govt. Services Hospital (Polyclinic)', NULL, 'hospital', 'Sector G-6, Islamabad', 'Islamabad', '+92-51-9210404', ARRAY['Emergency', 'General Medicine'], 130, 40, true, true, '24/7', 3.8, 33.7115, 73.0578),
('Shifa International Hospital', NULL, 'hospital', 'Pitras Bukhari Road, Sector H-8/4, Islamabad', 'Islamabad', '+92-51-8463000', ARRAY['Emergency', 'Cardiology', 'Neurology'], 110, 20, true, true, '24/7', 4.7, 33.6645, 73.0765),

-- Peshawar
('Lady Reading Hospital', 'ہسپتال ریڈنگ لیڈی', 'hospital', 'Near Grand Trunk (GT) Road, Peshawar', 'Peshawar', '+92-91-9211430', ARRAY['Emergency', 'General Medicine', 'Surgery'], 170, 55, true, true, '24/7', 4.1, 34.0070, 71.5249),
('Khyber Teaching Hospital', NULL, 'hospital', 'University Road, Peshawar', 'Peshawar', '+92-91-9217140', ARRAY['Emergency', 'Pediatrics'], 150, 45, true, true, '24/7', 4.2, 33.9972, 71.4711),
('Hayatabad Medical Complex', NULL, 'hospital', 'Phase 4, Hayatabad, Peshawar', 'Peshawar', '+92-91-9217704', ARRAY['Emergency', 'General Medicine'], 140, 50, true, true, '24/7', 4.0, 33.9700, 71.4267),

-- Quetta
('Civil Hospital Quetta', 'کوئٹہ ہسپتال سول', 'hospital', 'Jinnah Road, Quetta', 'Quetta', '+92-81-9201710', ARRAY['Emergency', 'General Medicine'], 130, 50, true, true, '24/7', 3.7, 30.1798, 66.9750),
('Bolan Medical Complex', NULL, 'hospital', 'Brewery Road, Quetta', 'Quetta', '+92-81-9202720', ARRAY['Emergency', 'Surgery'], 120, 45, true, true, '24/7', 3.9, 30.1832, 67.0102),
('Sheikh Khalifa Bin Zayed Hospital', NULL, 'hospital', 'Mastung Road, Quetta', 'Quetta', '+92-81-9260400', ARRAY['Emergency', 'General Medicine', 'Pediatrics'], 100, 30, true, true, '24/7', 4.5, 30.2032, 67.0298);

-- Seed sample user Sehat Card data (redacted CNICs for privacy)
-- Note: In production, CNICs would be hashed
INSERT INTO public.sehat_cards (cnic, father_name, city, income_group, eligibility_status, past_diseases, remaining_credits) VALUES
-- Karachi
('42101-8765432-1', 'Hassan Raza', 'Karachi', 'Low income', 'Eligible', ARRAY['Hypertension'], 800000),
('42103-3456789-3', 'Rahim Hussain', 'Karachi', 'Low income', 'Eligible', ARRAY['Diabetes'], 600000),
('42104-4567890-4', 'Farooq Ahmed', 'Karachi', 'Low income', 'Eligible', ARRAY[]::text[], 1000000),

-- Lahore
('35201-5678901-5', 'Muhammad Ali', 'Lahore', 'Low income', 'Eligible', ARRAY['Heart Disease'], 200000),
('35202-6789012-6', 'Waheed Akhtar', 'Lahore', 'Low income', 'Eligible', ARRAY[]::text[], 1000000),

-- Islamabad
('61301-1234567-1', 'Rashid Mahmood', 'Islamabad', 'Low income', 'Eligible', ARRAY['Asthma'], 750000),
('61302-2345678-2', 'Akram Sheikh', 'Islamabad', 'Low income', 'Eligible', ARRAY[]::text[], 900000),

-- Peshawar
('17401-3456789-3', 'Gul Muhammad', 'Peshawar', 'Low income', 'Eligible', ARRAY[]::text[], 1000000),
('17402-4567890-4', 'Iqbal Shah', 'Peshawar', 'Low income', 'Eligible', ARRAY['Tuberculosis'], 600000),

-- Quetta
('54501-5678901-5', 'Abdul Razzaq', 'Quetta', 'Low income', 'Eligible', ARRAY[]::text[], 950000),
('54502-6789012-6', 'Nawaz Baloch', 'Quetta', 'Low income', 'Eligible', ARRAY[]::text[], 1000000);
