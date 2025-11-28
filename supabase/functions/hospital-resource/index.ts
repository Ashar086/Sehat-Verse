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
    const { facilityId, city, action, sessionId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🏥 HospitalResourceAgent: Action:', action, 'Facility:', facilityId || city);

    // Log agent action
    await supabase.from('agent_logs').insert({
      agent_name: 'HospitalResourceAgent',
      action: action || 'check_capacity',
      session_id: sessionId,
      input_data: { facilityId, city },
      reasoning: 'Assessing hospital resources: bed availability, wait times, staff capacity. Predicting optimal patient routing.',
    });

    // Query facility data
    let facilityData;
    
    if (facilityId) {
      const { data, error: queryError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .single();
      
      if (queryError) throw queryError;
      facilityData = data ? [data] : [];
    } else if (city) {
      const { data, error: queryError } = await supabase
        .from('facilities')
        .select('*')
        .eq('city', city);
      
      if (queryError) throw queryError;
      facilityData = data || [];
    } else {
      const { data, error: queryError } = await supabase
        .from('facilities')
        .select('*')
        .limit(10);
      
      if (queryError) throw queryError;
      facilityData = data || [];
    }

    const facilityList = facilityData;

    // Autonomous capacity analysis
    let totalBeds = 0;
    let availableBeds = 0;
    let avgWaitTime = 0;
    let capacityStatus = 'normal';
    let reasoning = 'Hospital resources within normal operating capacity.';

    facilityList.forEach(facility => {
      totalBeds += facility.available_beds || 0;
      availableBeds += Math.max(0, (facility.available_beds || 0) - 10); // Assume 10 beds occupied
      avgWaitTime += facility.current_wait_time || 0;
    });

    avgWaitTime = facilityList.length > 0 ? Math.round(avgWaitTime / facilityList.length) : 0;
    const occupancyRate = totalBeds > 0 ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0;

    // Autonomous decision-making
    if (occupancyRate > 90) {
      capacityStatus = 'critical';
      reasoning = `CRITICAL: Hospital capacity at ${Math.round(occupancyRate)}%. Overflow risk. Activating contingency protocols.`;
    } else if (occupancyRate > 75) {
      capacityStatus = 'high';
      reasoning = `HIGH LOAD: ${Math.round(occupancyRate)}% occupancy. Recommending diversion to underutilized facilities.`;
    } else if (occupancyRate < 40) {
      capacityStatus = 'low';
      reasoning = `UNDERUTILIZED: ${Math.round(occupancyRate)}% occupancy. Capacity available for patient diversion.`;
    }

    // AI-powered wait time prediction
    const currentHour = new Date().getHours();
    const peakHours = currentHour >= 9 && currentHour <= 14; // Morning peak in Pakistan

    const aiPrompt = `You are a Pakistan hospital resource management AI.

**Current Status:**
- Facilities: ${facilityList.length}
- Total Beds: ${totalBeds}
- Occupancy: ${Math.round(occupancyRate)}%
- Avg Wait Time: ${avgWaitTime} min
- Time: ${currentHour}:00 (${peakHours ? 'Peak Hours' : 'Off-Peak'})

Predict:
1. Wait time adjustment (increase/decrease by X minutes)
2. Capacity recommendation (which facility to route new patients?)
3. Staffing needs (more doctors needed?)

Keep response under 3 lines. Be specific with numbers.`;

    const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai@0.21.0");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const prediction = response.text();

    // Determine recommended facility (lowest wait time + available beds)
    const recommendedFacility = facilityList.reduce((best, current) => {
      const bestScore = (best.available_beds || 0) - ((best.current_wait_time || 30) / 10);
      const currentScore = (current.available_beds || 0) - ((current.current_wait_time || 30) / 10);
      return currentScore > bestScore ? current : best;
    }, facilityList[0]);

    // Log autonomous decision
    await supabase.from('agent_logs').insert({
      agent_name: 'HospitalResourceAgent',
      action: 'capacity_assessed',
      session_id: sessionId,
      output_data: {
        capacityStatus,
        occupancyRate: Math.round(occupancyRate),
        recommendedFacility: recommendedFacility?.name,
        prediction: prediction.substring(0, 100)
      },
      reasoning,
      confidence_score: 0.75,
    });

    // If critical capacity, notify FacilityFinder to reroute
    if (capacityStatus === 'critical') {
      await supabase.from('agent_logs').insert({
        agent_name: 'HospitalResourceAgent',
        action: 'notify_facility_finder',
        session_id: sessionId,
        output_data: {
          notify_agent: 'FacilityFinderAgent',
          reason: 'critical_capacity_divert_patients',
          divertFrom: facilityId,
          occupancyRate: Math.round(occupancyRate)
        },
        reasoning: 'Critical capacity reached. Notifying FacilityFinder to divert new patients to alternative facilities with available resources.',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      capacityStatus,
      occupancyRate: Math.round(occupancyRate),
      availableBeds,
      totalBeds,
      avgWaitTime,
      recommendedFacility: recommendedFacility?.name,
      prediction,
      reasoning,
      nextAction: capacityStatus === 'critical' ? 'activate_overflow_protocol' : 'normal_operations',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('HospitalResourceAgent error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'Resource data unavailable. Using standard capacity assumptions.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
