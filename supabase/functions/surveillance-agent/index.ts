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
    const { analysisType, city, sessionId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🚨 SurveillanceAgent: Running outbreak detection for', city || 'national');

    // Log agent action
    await supabase.from('agent_logs').insert({
      agent_name: 'SurveillanceAgent',
      action: 'outbreak_detection',
      session_id: sessionId,
      input_data: { analysisType, city },
      reasoning: 'Analyzing anonymized triage data for unusual patterns. Detecting potential disease outbreaks via statistical anomaly detection.',
    });

    // Query anonymized triage data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let query = supabase
      .from('triage_sessions')
      .select('symptoms, urgency_level, created_at, session_data')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (city) {
      // Note: In production, city would be extracted from session_data or user profile
      // For now, we analyze all data
    }

    const { data: recentCases, error } = await query.limit(100);

    if (error) throw error;

    // Autonomous pattern detection with city-based tracking
    const symptomCounts: Record<string, number> = {};
    const citySymptomCounts: Record<string, Record<string, number>> = {};
    const urgencyCounts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0 };
    
    recentCases?.forEach(session => {
      const symptomsLower = session.symptoms?.toLowerCase() || '';
      const sessionCity = session.session_data?.city || city || 'unknown';
      
      // Initialize city tracking
      if (!citySymptomCounts[sessionCity]) {
        citySymptomCounts[sessionCity] = {};
      }
      
      // Count fever (potential dengue indicator)
      if (symptomsLower.includes('fever') || symptomsLower.includes('bukhar')) {
        symptomCounts['fever'] = (symptomCounts['fever'] || 0) + 1;
        citySymptomCounts[sessionCity]['fever'] = (citySymptomCounts[sessionCity]['fever'] || 0) + 1;
      }
      
      // Count dengue-specific symptoms
      if (symptomsLower.includes('dengue') || symptomsLower.includes('bleeding') || 
          symptomsLower.includes('rash') || symptomsLower.includes('joint pain')) {
        symptomCounts['dengue'] = (symptomCounts['dengue'] || 0) + 1;
        citySymptomCounts[sessionCity]['dengue'] = (citySymptomCounts[sessionCity]['dengue'] || 0) + 1;
      }
      
      // Count flu symptoms
      if (symptomsLower.includes('flu') || symptomsLower.includes('cough') || 
          symptomsLower.includes('khansi') || symptomsLower.includes('cold')) {
        symptomCounts['flu'] = (symptomCounts['flu'] || 0) + 1;
        citySymptomCounts[sessionCity]['flu'] = (citySymptomCounts[sessionCity]['flu'] || 0) + 1;
      }
      
      if (symptomsLower.includes('diarrhea') || symptomsLower.includes('vomit')) {
        symptomCounts['gastro'] = (symptomCounts['gastro'] || 0) + 1;
      }
      if (symptomsLower.includes('breathe') || symptomsLower.includes('saans')) {
        symptomCounts['respiratory'] = (symptomCounts['respiratory'] || 0) + 1;
      }

      // Count urgencies
      if (session.urgency_level) {
        urgencyCounts[session.urgency_level] = (urgencyCounts[session.urgency_level] || 0) + 1;
      }
    });

    // Anomaly detection: Z-score approach (simplified)
    const totalCases = recentCases?.length || 0;
    const avgCasesPerDay = totalCases / 7;
    const threshold = avgCasesPerDay * 1.5; // 50% above average = potential outbreak

    let alerts: any[] = [];
    let reasoning = 'No unusual patterns detected. Disease surveillance within normal parameters.';
    let confidenceScore = 0.6;

    // Check for concerning patterns with lower thresholds for early warning
    Object.entries(symptomCounts).forEach(([symptom, count]) => {
      const percentage = (count / totalCases) * 100;
      
      // Early warning system - 20% threshold for dengue/fever due to rapid spread
      const threshold = (symptom === 'dengue' || symptom === 'fever') ? 20 : 30;
      
      if (percentage > threshold) {
        const severity = percentage > 50 ? 'high' : percentage > 35 ? 'medium' : 'low';
        alerts.push({
          type: 'symptom_cluster',
          symptom,
          count,
          percentage: Math.round(percentage),
          severity,
          city: city || 'national',
          recommendation: `Potential ${symptom} outbreak detected. ${severity === 'high' ? 'URGENT: Alert district health authorities and WHO immediately.' : 'Alert district health authorities for monitoring.'}`
        });
        reasoning = `${severity === 'high' ? 'CRITICAL' : 'ALERT'}: Abnormal ${symptom} cluster detected (${count} cases, ${Math.round(percentage)}% of total). ${severity === 'high' ? 'Immediate action required.' : 'Monitoring recommended.'}`;
        confidenceScore = severity === 'high' ? 0.9 : 0.75;
      }
    });
    
    // Check city-specific outbreaks (e.g., "many users from Lahore report fever")
    Object.entries(citySymptomCounts).forEach(([cityName, symptoms]) => {
      Object.entries(symptoms).forEach(([symptom, count]) => {
        if (count >= 5) { // Cluster threshold: 5+ cases in same city
          const cityCaseCount = Object.values(symptoms).reduce((sum, c) => sum + c, 0);
          const cityPercentage = (count / cityCaseCount) * 100;
          
          if (cityPercentage > 40) { // 40% of city cases show same symptom
            alerts.push({
              type: 'city_cluster',
              symptom,
              count,
              city: cityName,
              percentage: Math.round(cityPercentage),
              severity: 'high',
              recommendation: `URGENT: Possible ${symptom} cluster in ${cityName}. Deploy mobile health units and test kits immediately.`
            });
            
            // Save to database for government dashboard
            supabase.from('surveillance_alerts').insert({
              alert_type: 'city_cluster',
              disease_name: symptom,
              city: cityName,
              case_count: count,
              percentage: cityPercentage,
              severity: 'high',
              recommendation: `Possible ${symptom} cluster detected in ${cityName}. Immediate investigation required.`,
              confidence_score: 0.85,
              metadata: { total_city_cases: cityCaseCount }
            }).then(({ error }) => {
              if (error) console.error('Error saving alert:', error);
            });
          }
        }
      });
    });

    // Check urgency spike
    const criticalHighRatio = (urgencyCounts.critical + urgencyCounts.high) / totalCases;
    if (criticalHighRatio > 0.4) { // >40% critical/high urgency
      alerts.push({
        type: 'urgency_spike',
        criticalHighCount: urgencyCounts.critical + urgencyCounts.high,
        percentage: Math.round(criticalHighRatio * 100),
        severity: 'high',
        recommendation: 'Urgent: High-severity case surge. Prepare emergency capacity.'
      });
      reasoning = `CRITICAL: Urgency spike detected. ${Math.round(criticalHighRatio * 100)}% of cases are critical/high severity. Hospital capacity alert.`;
      confidenceScore = 0.9;
    }

    // Use AI for contextual analysis
    const aiPrompt = `You are a Pakistan Disease Surveillance AI analyzing health data.

**Data Summary (Last 7 Days):**
- Total Cases: ${totalCases}
- Symptoms: ${JSON.stringify(symptomCounts)}
- Critical/High Urgency: ${urgencyCounts.critical + urgencyCounts.high}
${city ? `- Location: ${city}` : '- Scope: National'}

**Detected Alerts:** ${alerts.length > 0 ? JSON.stringify(alerts) : 'None'}

Provide:
1. Risk Assessment (Low/Medium/High)
2. Potential Disease/Outbreak (if any)
3. Recommended Action (alert authorities? monitor? no action?)

Keep response under 3 lines. Be specific and actionable.`;

    const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai@0.21.0");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const aiAssessment = response.text();

    // Log autonomous decision
    await supabase.from('agent_logs').insert({
      agent_name: 'SurveillanceAgent',
      action: 'surveillance_complete',
      session_id: sessionId,
      output_data: {
        totalCases,
        alertsDetected: alerts.length,
        symptomClusters: Object.keys(symptomCounts),
        aiAssessment: aiAssessment.substring(0, 100)
      },
      reasoning,
      confidence_score: confidenceScore,
    });

    // Save all high-severity alerts to database
    const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
    if (highSeverityAlerts.length > 0) {
      await Promise.all(
        highSeverityAlerts.map(alert => 
          supabase.from('surveillance_alerts').insert({
            alert_type: alert.type,
            disease_name: alert.symptom,
            city: alert.city || city || 'national',
            case_count: alert.count,
            percentage: alert.percentage,
            severity: alert.severity,
            recommendation: alert.recommendation,
            ai_assessment: aiAssessment.substring(0, 500),
            confidence_score: confidenceScore,
            metadata: { urgencyCounts, totalCases }
          })
        )
      );
    }
    
    // If high-severity alerts, notify authorities (mock) and FacilityFinder
    if (highSeverityAlerts.length > 0) {
      await supabase.from('agent_logs').insert([
        {
          agent_name: 'SurveillanceAgent',
          action: 'alert_authorities',
          session_id: sessionId,
          output_data: {
            alertType: 'outbreak_detected',
            location: city || 'national',
            alerts
          },
          reasoning: 'High-severity health alert detected. Autonomously notifying district health office and NIH (mock). Preparing public health response.',
        },
        {
          agent_name: 'SurveillanceAgent',
          action: 'notify_facility_finder',
          session_id: sessionId,
          output_data: {
            notify_agent: 'FacilityFinderAgent',
            reason: 'prepare_emergency_capacity',
            expectedSurge: Math.round(criticalHighRatio * 100)
          },
          reasoning: 'Potential disease surge detected. Notifying FacilityFinder to assess hospital capacity and prepare for increased patient load.',
        }
      ]);
    }

    return new Response(JSON.stringify({
      success: true,
      totalCases,
      alerts,
      symptomCounts,
      urgencyCounts,
      aiAssessment,
      reasoning,
      confidence: Math.round(confidenceScore * 100),
      nextAction: alerts.length > 0 ? 'monitor_closely' : 'routine_surveillance',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('SurveillanceAgent error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'Surveillance data unavailable. Using standard monitoring protocols.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
