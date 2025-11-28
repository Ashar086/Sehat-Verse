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
    const { forecastDays = 7, city } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔮 OutbreakForecast: Analyzing historical patterns for prediction...');

    // Query historical triage data (last 30 days for pattern analysis)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from('triage_sessions')
      .select('symptoms, urgency_level, created_at, session_data')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (city) {
      query = query.eq('session_data->city', city);
    }

    const { data: historicalCases, error } = await query.limit(500);

    if (error) throw error;

    // Analyze historical patterns by day and disease
    const dailyPatterns: Record<string, Record<string, number>> = {};
    const diseases = ['fever', 'dengue', 'flu', 'respiratory', 'gastro'];

    historicalCases?.forEach(session => {
      const date = new Date(session.created_at).toISOString().split('T')[0];
      const symptomsLower = session.symptoms?.toLowerCase() || '';

      if (!dailyPatterns[date]) {
        dailyPatterns[date] = {};
        diseases.forEach(d => dailyPatterns[date][d] = 0);
      }

      // Count symptoms
      if (symptomsLower.includes('fever') || symptomsLower.includes('bukhar')) {
        dailyPatterns[date]['fever']++;
      }
      if (symptomsLower.includes('dengue') || symptomsLower.includes('bleeding') || symptomsLower.includes('rash')) {
        dailyPatterns[date]['dengue']++;
      }
      if (symptomsLower.includes('flu') || symptomsLower.includes('cough') || symptomsLower.includes('cold')) {
        dailyPatterns[date]['flu']++;
      }
      if (symptomsLower.includes('breathe') || symptomsLower.includes('saans')) {
        dailyPatterns[date]['respiratory']++;
      }
      if (symptomsLower.includes('diarrhea') || symptomsLower.includes('vomit')) {
        dailyPatterns[date]['gastro']++;
      }
    });

    // Calculate trends and averages
    const trends: Record<string, any> = {};
    diseases.forEach(disease => {
      const counts = Object.values(dailyPatterns).map(day => day[disease] || 0);
      const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
      const recentAvg = counts.slice(-7).reduce((sum, c) => sum + c, 0) / 7;
      const trend = recentAvg > avg * 1.2 ? 'increasing' : recentAvg < avg * 0.8 ? 'decreasing' : 'stable';
      
      trends[disease] = {
        average: avg,
        recentAverage: recentAvg,
        trend,
        changePercent: ((recentAvg - avg) / avg) * 100
      };
    });

    // Get real-time outbreak information using Gemini
    const currentDate = new Date().toISOString().split('T')[0];
    const aiPrompt = `You are a disease surveillance AI analyzing outbreak patterns in Pakistan.

**Current Date:** ${currentDate}
**Historical Data (Last 30 Days):**
${JSON.stringify(trends, null, 2)}

**Location:** ${city || 'National'}

**Task:** Predict disease outbreak risk for the next ${forecastDays} days based on:
1. Historical trends shown above
2. Current season and climate patterns in Pakistan
3. Known disease outbreak patterns (e.g., dengue peak months, flu season)
4. Recent global and regional health alerts

For each disease (fever, dengue, flu, respiratory, gastro), provide:
- Predicted daily case increase/decrease
- Risk level (low/medium/high/critical)
- Contributing factors (weather, season, regional patterns)
- Specific recommendations

Keep response focused and data-driven. Format as structured analysis.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert epidemiologist specializing in disease outbreak prediction in South Asia.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices?.[0]?.message?.content || 'Analysis unavailable';

    // Generate predictions and save to database
    const predictions: any[] = [];
    const today = new Date();

    for (const [disease, data] of Object.entries(trends)) {
      const trendData = data as any;
      
      // Calculate risk level based on trend
      let riskLevel = 'low';
      let predictedCases = Math.round(trendData.recentAverage);
      
      if (trendData.trend === 'increasing') {
        const growthRate = 1 + (trendData.changePercent / 100) * 0.5;
        predictedCases = Math.round(trendData.recentAverage * Math.pow(growthRate, forecastDays / 7));
        
        if (trendData.changePercent > 50) riskLevel = 'critical';
        else if (trendData.changePercent > 25) riskLevel = 'high';
        else if (trendData.changePercent > 10) riskLevel = 'medium';
      } else if (trendData.trend === 'decreasing') {
        const declineRate = 1 - Math.abs(trendData.changePercent) / 100 * 0.5;
        predictedCases = Math.round(trendData.recentAverage * Math.pow(declineRate, forecastDays / 7));
      }

      // Seasonal adjustments for specific diseases
      const month = today.getMonth();
      if (disease === 'dengue' && (month >= 7 && month <= 10)) { // Aug-Nov dengue season
        predictedCases = Math.round(predictedCases * 1.5);
        if (riskLevel === 'low') riskLevel = 'medium';
        if (riskLevel === 'medium') riskLevel = 'high';
      }
      if (disease === 'flu' && (month >= 10 || month <= 2)) { // Nov-Feb flu season
        predictedCases = Math.round(predictedCases * 1.3);
      }

      const contributingFactors: string[] = [];
      if (trendData.trend === 'increasing') contributingFactors.push('Rising case trend');
      if (disease === 'dengue' && month >= 7 && month <= 10) contributingFactors.push('Monsoon season');
      if (disease === 'flu' && (month >= 10 || month <= 2)) contributingFactors.push('Winter season');

      // Prepare forecast data
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + forecastDays);

      predictions.push({
        disease,
        riskLevel,
        predictedCases,
        trend: trendData.trend,
        contributingFactors,
        forecastDate: forecastDate.toISOString().split('T')[0],
        confidence: 0.7 + (trendData.trend === 'stable' ? 0.1 : 0)
      });

      // Save to database
      await supabase.from('outbreak_forecasts').insert({
        forecast_date: forecastDate.toISOString().split('T')[0],
        disease_name: disease,
        city: city || null,
        predicted_cases: predictedCases,
        risk_level: riskLevel,
        confidence_score: 0.7 + (trendData.trend === 'stable' ? 0.1 : 0),
        trend: trendData.trend,
        contributing_factors: contributingFactors,
        recommendation: riskLevel === 'critical' ? `URGENT: Prepare emergency response for ${disease}. Deploy additional resources.` :
                       riskLevel === 'high' ? `Alert health facilities about potential ${disease} surge.` :
                       riskLevel === 'medium' ? `Monitor ${disease} cases closely.` :
                       `Continue routine surveillance for ${disease}.`,
        ai_analysis: aiAnalysis.substring(0, 1000),
        metadata: { historical_trend: trendData }
      });
    }

    // Log the prediction
    await supabase.from('agent_logs').insert({
      agent_name: 'OutbreakForecast',
      action: 'forecast_generated',
      reasoning: `Generated ${forecastDays}-day outbreak forecast using historical patterns and AI analysis. Analyzed ${historicalCases?.length || 0} cases from last 30 days.`,
      confidence_score: 0.75,
      output_data: {
        predictions: predictions.length,
        location: city || 'national',
        forecastDays
      }
    });

    console.log(`✅ Generated ${predictions.length} outbreak predictions`);

    return new Response(JSON.stringify({
      success: true,
      predictions,
      aiAnalysis,
      historicalDataPoints: historicalCases?.length || 0,
      forecastDays,
      location: city || 'national'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('OutbreakForecast error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
