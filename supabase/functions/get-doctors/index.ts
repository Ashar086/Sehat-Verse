import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock Pakistani doctor data
const mockDoctors = [
  {
    id: '1',
    doctor_name: 'Dr. Ahmed Hassan',
    specialization: 'Eye Specialist',
    consultation_fee: 2000,
    available_timing: 'Mon-Fri: 9AM-5PM',
    experience_years: 12,
    phone_number: '0300-1234567',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.8,
    total_reviews: 156,
    qualifications: 'MBBS, FCPS (Ophthalmology)'
  },
  {
    id: '2',
    doctor_name: 'Dr. Ayesha Khan',
    specialization: 'Eye Specialist',
    consultation_fee: 2500,
    available_timing: 'Mon-Sat: 10AM-6PM',
    experience_years: 15,
    phone_number: '0321-9876543',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.9,
    total_reviews: 203,
    qualifications: 'MBBS, DOMS, FCPS'
  },
  {
    id: '3',
    doctor_name: 'Dr. Muhammad Ali',
    specialization: 'Teeth Specialist',
    consultation_fee: 1800,
    available_timing: 'Tue-Sat: 2PM-8PM',
    experience_years: 10,
    phone_number: '0333-4567890',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.6,
    total_reviews: 98,
    qualifications: 'BDS, FCPS (Dental Surgery)'
  },
  {
    id: '4',
    doctor_name: 'Dr. Fatima Noor',
    specialization: 'Teeth Specialist',
    consultation_fee: 2200,
    available_timing: 'Mon-Fri: 11AM-7PM',
    experience_years: 8,
    phone_number: '0311-2345678',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.7,
    total_reviews: 112,
    qualifications: 'BDS, MDS (Orthodontics)'
  },
  {
    id: '5',
    doctor_name: 'Dr. Imran Sheikh',
    specialization: 'Child Specialist',
    consultation_fee: 2500,
    available_timing: 'Mon-Sat: 9AM-4PM',
    experience_years: 18,
    phone_number: '0345-8765432',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.9,
    total_reviews: 287,
    qualifications: 'MBBS, FCPS (Pediatrics), MRCPCH'
  },
  {
    id: '6',
    doctor_name: 'Dr. Zainab Malik',
    specialization: 'Child Specialist',
    consultation_fee: 2800,
    available_timing: 'Mon-Fri: 10AM-5PM',
    experience_years: 20,
    phone_number: '0300-3456789',
    is_verified: true,
    degree_url: 'verified',
    rating: 5.0,
    total_reviews: 341,
    qualifications: 'MBBS, DCH, FCPS (Pediatrics)'
  },
  {
    id: '7',
    doctor_name: 'Dr. Bilal Aziz',
    specialization: 'Skin Specialist',
    consultation_fee: 3000,
    available_timing: 'Wed-Sun: 3PM-9PM',
    experience_years: 14,
    phone_number: '0321-5678901',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.7,
    total_reviews: 189,
    qualifications: 'MBBS, FCPS (Dermatology)'
  },
  {
    id: '8',
    doctor_name: 'Dr. Sana Iqbal',
    specialization: 'Skin Specialist',
    consultation_fee: 2700,
    available_timing: 'Mon-Sat: 1PM-7PM',
    experience_years: 11,
    phone_number: '0333-6789012',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.8,
    total_reviews: 167,
    qualifications: 'MBBS, MD (Dermatology)'
  },
  {
    id: '9',
    doctor_name: 'Dr. Usman Tariq',
    specialization: 'Cardiologist',
    consultation_fee: 3500,
    available_timing: 'Mon-Fri: 8AM-3PM',
    experience_years: 16,
    phone_number: '0311-7890123',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.9,
    total_reviews: 234,
    qualifications: 'MBBS, FCPS (Cardiology), MRCP'
  },
  {
    id: '10',
    doctor_name: 'Dr. Mariam Shah',
    specialization: 'Cardiologist',
    consultation_fee: 4000,
    available_timing: 'Tue-Sat: 10AM-5PM',
    experience_years: 22,
    phone_number: '0345-8901234',
    is_verified: true,
    degree_url: 'verified',
    rating: 5.0,
    total_reviews: 412,
    qualifications: 'MBBS, MD, FACC'
  },
  {
    id: '11',
    doctor_name: 'Dr. Hassan Raza',
    specialization: 'Neurologist',
    consultation_fee: 4500,
    available_timing: 'Mon-Thu: 9AM-4PM',
    experience_years: 19,
    phone_number: '0300-9012345',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.8,
    total_reviews: 276,
    qualifications: 'MBBS, FCPS (Neurology), FRCP'
  },
  {
    id: '12',
    doctor_name: 'Dr. Hina Farooq',
    specialization: 'Neurologist',
    consultation_fee: 4200,
    available_timing: 'Wed-Sun: 11AM-6PM',
    experience_years: 17,
    phone_number: '0321-0123456',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.7,
    total_reviews: 198,
    qualifications: 'MBBS, FCPS (Neurology)'
  },
  {
    id: '13',
    doctor_name: 'Dr. Kamran Yousaf',
    specialization: 'Orthopedic',
    consultation_fee: 3200,
    available_timing: 'Mon-Sat: 2PM-8PM',
    experience_years: 13,
    phone_number: '0333-1234567',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.6,
    total_reviews: 145,
    qualifications: 'MBBS, FCPS (Orthopedic Surgery)'
  },
  {
    id: '14',
    doctor_name: 'Dr. Nadia Butt',
    specialization: 'Orthopedic',
    consultation_fee: 3500,
    available_timing: 'Tue-Sat: 9AM-4PM',
    experience_years: 15,
    phone_number: '0311-2345678',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.8,
    total_reviews: 223,
    qualifications: 'MBBS, MS (Orthopedics), FRCS'
  },
  {
    id: '15',
    doctor_name: 'Dr. Asad Mahmood',
    specialization: 'General Physician',
    consultation_fee: 1500,
    available_timing: 'Mon-Sun: 8AM-10PM',
    experience_years: 9,
    phone_number: '0345-3456789',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.5,
    total_reviews: 178,
    qualifications: 'MBBS, FCPS (Medicine)'
  },
  {
    id: '16',
    doctor_name: 'Dr. Rabia Javed',
    specialization: 'General Physician',
    consultation_fee: 1800,
    available_timing: 'Mon-Fri: 9AM-9PM',
    experience_years: 12,
    phone_number: '0300-4567890',
    is_verified: true,
    degree_url: 'verified',
    rating: 4.7,
    total_reviews: 201,
    qualifications: 'MBBS, MCPS, FCPS'
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const specialization = url.searchParams.get('specialization');

    console.log('📋 Fetching doctors for specialization:', specialization);

    let filteredDoctors = mockDoctors;
    
    if (specialization) {
      filteredDoctors = mockDoctors.filter(
        doc => doc.specialization === specialization && doc.is_verified
      );
    }

    console.log(`✅ Found ${filteredDoctors.length} doctors`);

    return new Response(
      JSON.stringify({ doctors: filteredDoctors }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
