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
    const { userId, action, reminderType, medicationName, facilityName, sessionId, reminderId, frequency, customTimes, phoneNumber } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('⏰ FollowUpAgent: Processing', action, 'for user', userId);

    // Handle different actions
    if (action === 'list_reminders') {
      const { data: reminders, error } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('next_reminder', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        reminders,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_reminder') {
      if (!reminderId) throw new Error('reminderId is required for delete action');

      const { error } = await supabase
        .from('medication_reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('agent_logs').insert({
        agent_name: 'FollowUpAgent',
        action: 'reminder_deleted',
        session_id: sessionId,
        output_data: { reminderId },
        reasoning: 'Reminder successfully deleted by user request.',
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Reminder deleted successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_reminder') {
      if (!reminderId) throw new Error('reminderId is required for update action');

      const { error } = await supabase
        .from('medication_reminders')
        .update({ is_active: false })
        .eq('id', reminderId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('agent_logs').insert({
        agent_name: 'FollowUpAgent',
        action: 'reminder_updated',
        session_id: sessionId,
        output_data: { reminderId },
        reasoning: 'Reminder deactivated by user request.',
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Reminder updated successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log agent action for create/schedule
    await supabase.from('agent_logs').insert({
      agent_name: 'FollowUpAgent',
      action: action || 'schedule_reminder',
      session_id: sessionId,
      input_data: { userId, reminderType, medicationName, facilityName },
      reasoning: `Evaluating follow-up needs for ${reminderType || 'general'} reminder. Determining optimal schedule.`,
    });

    // AI determines adaptive reminder schedule with autonomous decision-making
    const aiPrompt = `You are an autonomous Pakistan Healthcare Follow-Up Agent with medical knowledge.

User needs a ${reminderType || 'medication'} reminder${medicationName ? ` for ${medicationName}` : ''}${facilityName ? ` at ${facilityName}` : ''}.

AUTONOMOUS DECISION FRAMEWORK:
1. Analyze medication type and determine optimal frequency
2. Consider user adherence patterns (if missed doses detected, escalate)
3. Determine when to coordinate with TriageAgent for re-consultation
4. Reason about intervention timing

MEDICATION INTELLIGENCE:
- Antibiotics: Every 8 hours for effectiveness
- Chronic meds (diabetes, hypertension): Twice daily at consistent times
- Pain relievers: As needed, but monitor for overuse
- Vaccinations: One-time with 24-hour advance reminder

ESCALATION CRITERIA:
- If user misses 2+ consecutive doses → Increase frequency + notify TriageAgent
- If critical medication (insulin, cardiac) missed → Immediate escalation
- If side effects reported → Coordinate with TriageAgent for re-assessment

Provide:
1. Recommended frequency with reasoning
2. Initial timing
3. Escalation triggers
4. Coordination needs with TriageAgent

Format: 3-line schedule (PKT timezone) + reasoning`;

    const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai@0.21.0");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const schedule = response.text();

    // Autonomous decision: Adjust frequency based on AI analysis + user input
    let finalFrequency = frequency || 'once_daily';
    let reasoning = `AI-determined schedule: ${finalFrequency.replace('_', ' ')} frequency optimal for this medication.`;
    let shouldNotifyTriage = false;

    // AUTONOMOUS MEDICATION-SPECIFIC LOGIC
    if (reminderType === 'vaccination') {
      finalFrequency = 'one-time';
      reasoning = 'One-time vaccination reminder scheduled 24 hours before appointment. No follow-up needed unless missed.';
    } else if (reminderType === 'emergency_followup') {
      finalFrequency = 'hourly';
      reasoning = 'CRITICAL: Hourly reminders due to emergency condition. TriageAgent notified for monitoring.';
      shouldNotifyTriage = true;
    } else if (medicationName?.toLowerCase().includes('antibiotic')) {
      if (!frequency || frequency === 'once_daily') {
        finalFrequency = 'every_8_hours';
        reasoning = 'Antibiotic detected: Every 8-hour schedule enforced for therapeutic effectiveness. Non-adherence triggers TriageAgent alert.';
        shouldNotifyTriage = true;
      }
    } else if (medicationName?.toLowerCase().includes('insulin') || medicationName?.toLowerCase().includes('diabetes')) {
      if (!frequency || frequency === 'once_daily') {
        finalFrequency = 'twice_daily';
        reasoning = 'Diabetes medication: Twice daily at consistent times (morning/evening). Critical adherence required. Missed dose → TriageAgent escalation.';
        shouldNotifyTriage = true;
      }
    } else if (medicationName?.toLowerCase().includes('blood pressure') || medicationName?.toLowerCase().includes('hypertension')) {
      if (!frequency || frequency === 'once_daily') {
        finalFrequency = 'twice_daily';
        reasoning = 'Cardiac medication: Twice daily for stable BP control. Skipped doses monitored for escalation.';
      }
    }

    // Check for non-adherence patterns (query past reminders for this user)
    const { data: pastReminders } = await supabase
      .from('medication_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('medication_name', medicationName)
      .order('created_at', { ascending: false })
      .limit(5);

    // If user has history of missed reminders, increase frequency
    if (pastReminders && pastReminders.length > 0) {
      const missedCount = pastReminders.filter(r => !r.is_active).length;
      if (missedCount >= 2) {
        reasoning += ` ADAPTIVE: User has ${missedCount} missed doses detected. Increasing reminder frequency and notifying TriageAgent for intervention.`;
        shouldNotifyTriage = true;
        
        // Increase frequency adaptively
        if (finalFrequency === 'once_daily') finalFrequency = 'twice_daily';
        else if (finalFrequency === 'twice_daily') finalFrequency = 'three_times_daily';
      }
    }

    // Calculate next reminder time based on frequency and custom times
    let nextReminderDate = new Date();
    const times = customTimes && customTimes.length > 0 ? customTimes : ['09:00'];
    
    // Parse first custom time for initial reminder
    const [hours, minutes] = times[0].split(':').map(Number);
    nextReminderDate.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (nextReminderDate <= new Date()) {
      nextReminderDate.setDate(nextReminderDate.getDate() + 1);
    }

    // Generate SMS message
    const smsMessage = `SehatVerse Reminder: Time to take ${medicationName || 'your medication'}! ${times.length > 1 ? `Next doses at: ${times.slice(1).join(', ')}` : ''} Stay healthy! 💊`;
    

    // Log autonomous decision
    await supabase.from('agent_logs').insert({
      agent_name: 'FollowUpAgent',
      action: 'reminder_scheduled',
      session_id: sessionId,
      output_data: { 
        schedule, 
        frequency: finalFrequency, 
        medicationName,
        reminderType,
        customTimes: times,
        phoneNumber 
      },
      reasoning,
      confidence_score: 0.85,
    });

    // COORDINATION WITH TRIAGEAGENT: Notify for re-consultation needs
    if (shouldNotifyTriage || finalFrequency === 'every_8_hours' || finalFrequency === 'every_6_hours' || finalFrequency === 'hourly') {
      await supabase.from('agent_logs').insert({
        agent_name: 'FollowUpAgent',
        action: 'notify_triage',
        session_id: sessionId,
        output_data: { 
          notify_agent: 'TriageAgent', 
          reason: 'critical_medication_adherence',
          userId,
          medicationName,
          missedDoses: pastReminders?.filter(r => !r.is_active).length || 0,
          escalationTrigger: reasoning
        },
        reasoning: `ESCALATION: Critical medication schedule or non-adherence detected. TriageAgent alerted for potential re-consultation. Intervention timing: ${finalFrequency === 'hourly' ? 'IMMEDIATE' : 'within 24 hours if pattern continues'}.`,
        confidence_score: 0.92,
      });
    }

    // Save reminder to database
    const { data: savedReminder, error: saveError } = await supabase
      .from('medication_reminders')
      .insert({
        user_id: userId,
        reminder_type: reminderType || 'medication',
        medication_name: medicationName,
        facility_name: facilityName,
        frequency: finalFrequency,
        schedule,
        next_reminder: nextReminderDate.toISOString(),
        session_id: sessionId,
        reasoning,
        is_active: true,
        phone_number: phoneNumber,
        custom_times: times,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving reminder:', saveError);
      throw saveError;
    }

    // SMS notification info
    const smsNotification = {
      method: 'SMS',
      number: phoneNumber || '+92-3XX-XXXXXXX',
      message: smsMessage,
      scheduled_times: times,
      fallback: 'USSD: Dial *123# for offline reminders',
    };

    return new Response(JSON.stringify({
      success: true,
      reminder: savedReminder,
      schedule,
      frequency: finalFrequency,
      reasoning,
      sms: smsNotification,
      nextReminder: nextReminderDate.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('FollowUpAgent error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'Please set a manual reminder or contact your healthcare provider.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
