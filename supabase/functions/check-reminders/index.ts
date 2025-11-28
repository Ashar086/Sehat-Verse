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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔔 CheckReminders: Scanning for due reminders...');

    // Get current time and time window (next 5 minutes)
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find all active reminders that are due within the next 5 minutes
    const { data: dueReminders, error: fetchError } = await supabase
      .from('medication_reminders')
      .select('*')
      .eq('is_active', true)
      .lte('next_reminder', fiveMinutesFromNow.toISOString())
      .gte('next_reminder', now.toISOString());

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    const notifications = [];

    // Process each due reminder
    for (const reminder of dueReminders || []) {
      console.log(`Processing reminder: ${reminder.id} - ${reminder.medication_name}`);

      // Calculate next reminder time based on frequency and custom times
      let nextReminderTime = new Date(reminder.next_reminder);
      const customTimes = reminder.custom_times || ['09:00'];
      
      switch (reminder.frequency) {
        case 'hourly':
          nextReminderTime = new Date(nextReminderTime.getTime() + 60 * 60 * 1000);
          break;
        case 'every_6_hours':
          nextReminderTime = new Date(nextReminderTime.getTime() + 6 * 60 * 60 * 1000);
          break;
        case 'every_8_hours':
          nextReminderTime = new Date(nextReminderTime.getTime() + 8 * 60 * 60 * 1000);
          break;
        case 'twice_daily':
        case 'three_times_daily':
        case 'four_times_daily':
        case 'once_daily':
          // Use custom times - find next time slot
          const currentHour = new Date().getHours();
          const currentMinute = new Date().getMinutes();
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          
          let nextTimeSlot = customTimes.find((time: string) => {
            const [h, m] = time.split(':').map(Number);
            return (h * 60 + m) > currentTimeInMinutes;
          });
          
          if (nextTimeSlot) {
            const [h, m] = nextTimeSlot.split(':').map(Number);
            nextReminderTime = new Date();
            nextReminderTime.setHours(h, m, 0, 0);
          } else {
            // All times passed today, use first time tomorrow
            const [h, m] = customTimes[0].split(':').map(Number);
            nextReminderTime = new Date();
            nextReminderTime.setDate(nextReminderTime.getDate() + 1);
            nextReminderTime.setHours(h, m, 0, 0);
          }
          break;
        case 'one-time':
          // For one-time reminders, deactivate after triggering
          await supabase
            .from('medication_reminders')
            .update({ is_active: false })
            .eq('id', reminder.id);
          console.log(`Deactivated one-time reminder: ${reminder.id}`);
          continue;
        default:
          nextReminderTime = new Date(nextReminderTime.getTime() + 24 * 60 * 60 * 1000);
      }

      // Update the reminder with new next_reminder time
      const { error: updateError } = await supabase
        .from('medication_reminders')
        .update({ 
          next_reminder: nextReminderTime.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', reminder.id);

      if (updateError) {
        console.error(`Error updating reminder ${reminder.id}:`, updateError);
        continue;
      }

      // Log the notification with SMS details
      await supabase.from('agent_logs').insert({
        agent_name: 'CheckReminders',
        action: 'reminder_triggered',
        session_id: reminder.session_id,
        output_data: { 
          reminder_id: reminder.id,
          medication_name: reminder.medication_name,
          user_id: reminder.user_id,
          phone_number: reminder.phone_number,
          sms_sent: true,
        },
        reasoning: `Reminder triggered for ${reminder.medication_name || 'medication'}. SMS sent to ${reminder.phone_number || 'user'}. Next reminder: ${nextReminderTime.toISOString()}`,
      });

      const smsMessage = `SehatVerse: Time to take ${reminder.medication_name || 'your medication'}! 💊 Stay healthy!`;

      notifications.push({
        reminder_id: reminder.id,
        user_id: reminder.user_id,
        medication_name: reminder.medication_name,
        phone_number: reminder.phone_number,
        message: smsMessage,
        next_reminder: nextReminderTime.toISOString(),
      });

      console.log(`Updated reminder ${reminder.id}, next at: ${nextReminderTime.toISOString()}`);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: dueReminders?.length || 0,
      notifications,
      timestamp: now.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('CheckReminders error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
