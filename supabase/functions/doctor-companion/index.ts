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
    const { patientId, caseType, imagingData, triageData, sessionId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('👨‍⚕️ DoctorCompanionAgent: Preparing case for doctor review, type:', caseType);

    // Log agent action
    await supabase.from('agent_logs').insert({
      agent_name: 'DoctorCompanionAgent',
      action: 'prepare_case',
      session_id: sessionId,
      input_data: { patientId, caseType, hasImaging: !!imagingData, hasTriage: !!triageData },
      reasoning: 'Aggregating patient data from multiple agents. Generating AI-assisted case summary with differential diagnoses for doctor review.',
    });

    // Autonomous case aggregation from other agents
    let caseContext = '';
    let urgencyLevel = 'routine';
    let reasoning = 'Standard case preparation completed.';

    // Pull triage data if available
    if (triageData) {
      caseContext += `**Triage Assessment:**\n${triageData.symptoms}\nUrgency: ${triageData.urgency}\n\n`;
      urgencyLevel = triageData.urgency;
    }

    // Pull imaging data if available
    if (imagingData) {
      caseContext += `**Imaging Analysis:**\n${imagingData.analysis}\nRisk: ${imagingData.riskLevel}\n\n`;
      if (imagingData.riskLevel === 'critical' || imagingData.riskLevel === 'high') {
        urgencyLevel = 'high';
      }
    }

    // AI-generated case prep with differential diagnoses
    const aiPrompt = `You are a doctor's AI companion preparing a case review for a Pakistan BHU/hospital physician.

${caseContext || 'No prior data available.'}

**Case Type:** ${caseType || 'General consultation'}

Generate a structured case summary:
1. **Chief Complaint**: 1-line summary
2. **Key Findings**: Bullet points from triage/imaging
3. **Differential Diagnoses**: Top 3 possibilities ranked by likelihood
4. **Recommended Workup**: Tests/examinations needed
5. **Treatment Considerations**: Initial management options
6. **Red Flags**: Warning signs to watch for

Keep response under 250 words. Be clinical and actionable for resource-limited settings.`;

    const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai@0.21.0");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const caseSummary = response.text();

    // Autonomous decision: Prioritize case based on urgency
    let priorityLevel = 1; // Normal
    if (urgencyLevel === 'critical') {
      priorityLevel = 5; // Immediate attention
      reasoning = 'URGENT CASE: Critical urgency detected. Prioritized for immediate doctor review. Pre-annotated with AI differentials.';
    } else if (urgencyLevel === 'high') {
      priorityLevel = 4;
      reasoning = 'HIGH PRIORITY: Requires prompt doctor attention. Case prep includes imaging annotations and differential diagnoses.';
    } else if (urgencyLevel === 'moderate') {
      priorityLevel = 3;
      reasoning = 'MODERATE PRIORITY: Routine urgent care. Case summary prepared with AI-assisted differentials.';
    } else {
      reasoning = 'ROUTINE CASE: Standard consultation. AI-generated case summary available for doctor efficiency.';
    }

    // Log autonomous decision
    await supabase.from('agent_logs').insert({
      agent_name: 'DoctorCompanionAgent',
      action: 'case_prepared',
      session_id: sessionId,
      output_data: {
        priorityLevel,
        urgencyLevel,
        hasCaseSummary: true,
        caseSummaryLength: caseSummary.length
      },
      reasoning,
      confidence_score: 0.8,
    });

    // If high priority, notify HospitalResourceAgent to update queue
    if (priorityLevel >= 4) {
      await supabase.from('agent_logs').insert({
        agent_name: 'DoctorCompanionAgent',
        action: 'notify_hospital_resource',
        session_id: sessionId,
        output_data: {
          notify_agent: 'HospitalResourceAgent',
          reason: 'high_priority_case',
          priorityLevel
        },
        reasoning: 'High-priority case prepared. Notifying HospitalResourceAgent to adjust queue and allocate doctor time appropriately.',
      });
    }

    // Mock annotation canvas data (for imaging cases)
    const annotations = imagingData ? [
      { x: 120, y: 80, label: 'Area of concern', type: 'circle' },
      { x: 200, y: 150, label: 'Abnormality detected', type: 'arrow' }
    ] : [];

    return new Response(JSON.stringify({
      success: true,
      caseSummary,
      priorityLevel,
      urgencyLevel,
      annotations,
      reasoning,
      nextAction: priorityLevel >= 4 ? 'immediate_doctor_review' : 'queue_for_consultation',
      estimatedReviewTime: priorityLevel >= 4 ? '< 15 min' : '< 1 hour',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('DoctorCompanionAgent error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'AI case prep unavailable. Doctor will review manually.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
