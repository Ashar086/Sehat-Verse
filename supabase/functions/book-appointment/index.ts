import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      facilityId, 
      appointmentDate, 
      appointmentTime, 
      purpose, 
      patientName, 
      patientPhone, 
      notes 
    } = await req.json();

    console.log('📅 BookAppointment request:', { facilityId, appointmentDate, appointmentTime, purpose });

    // Validate required fields
    if (!facilityId || !appointmentDate || !appointmentTime || !patientName || !patientPhone) {
      throw new Error('Missing required fields: facilityId, appointmentDate, appointmentTime, patientName, and patientPhone are required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('📅 BookAppointment: Creating appointment for user:', user.id);

    // Get facility details
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('name, address, phone, city')
      .eq('id', facilityId)
      .maybeSingle();

    if (facilityError) {
      console.error('Facility query error:', facilityError);
      throw new Error('Failed to query facility');
    }

    if (!facility) {
      console.error('Facility not found for ID:', facilityId);
      throw new Error(`Facility not found. Please select a valid facility from the list.`);
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        facility_id: facilityId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        purpose,
        patient_name: patientName,
        patient_phone: patientPhone,
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw new Error('Failed to create appointment');
    }

    // Log the booking action
    await supabase.from('agent_logs').insert({
      agent_name: 'AppointmentAgent',
      action: 'book_appointment',
      input_data: { 
        facilityId, 
        appointmentDate, 
        appointmentTime, 
        purpose 
      },
      output_data: { 
        appointmentId: appointment.id, 
        status: 'pending',
        facility: facility.name
      },
      reasoning: `User ${user.id} booked appointment at ${facility.name} for ${purpose} on ${appointmentDate} at ${appointmentTime}`,
      confidence_score: 1.0,
    });

    const result = {
      success: true,
      appointment: {
        ...appointment,
        facility
      },
      message: `Appointment booked successfully at ${facility.name} on ${appointmentDate} at ${appointmentTime}`,
      confirmationNumber: appointment.id.slice(0, 8).toUpperCase()
    };

    console.log('✅ Appointment created successfully:', appointment.id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('BookAppointment error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to book appointment. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});