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
      appointmentId,
      action, // 'reschedule' or 'cancel'
      appointmentDate,
      appointmentTime,
    } = await req.json();

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
      throw new Error('Unauthorized');
    }

    console.log(`📅 UpdateAppointment: ${action} appointment ${appointmentId} for user:`, user.id);

    // Verify appointment belongs to user
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingAppointment) {
      throw new Error('Appointment not found or unauthorized');
    }

    let updateData: any = {};
    let message = '';

    if (action === 'cancel') {
      updateData = { status: 'cancelled' };
      message = 'Appointment cancelled successfully';
    } else if (action === 'reschedule') {
      if (!appointmentDate || !appointmentTime) {
        throw new Error('Date and time required for rescheduling');
      }
      updateData = {
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'pending'
      };
      message = `Appointment rescheduled to ${appointmentDate} at ${appointmentTime}`;
    } else {
      throw new Error('Invalid action');
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      throw new Error('Failed to update appointment');
    }

    // Log the action
    await supabase.from('agent_logs').insert({
      agent_name: 'AppointmentAgent',
      action: `appointment_${action}`,
      input_data: { appointmentId, action, appointmentDate, appointmentTime },
      output_data: { updatedAppointment },
      reasoning: `User ${user.id} ${action}d appointment ${appointmentId}`,
      confidence_score: 1.0,
    });

    const result = {
      success: true,
      appointment: updatedAppointment,
      message
    };

    console.log(`✅ Appointment ${action}d successfully:`, appointmentId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('UpdateAppointment error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to update appointment. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});