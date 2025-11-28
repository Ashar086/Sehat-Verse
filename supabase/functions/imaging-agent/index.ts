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
    const { imageBase64, analysisType, patientContext, sessionId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔬 ImagingAgent: Analyzing X-ray image, type:', analysisType);

    // Log agent action
    await supabase.from('agent_logs').insert({
      agent_name: 'ImagingAgent',
      action: 'analyze_xray',
      session_id: sessionId,
      input_data: { analysisType, hasPatientContext: !!patientContext },
      reasoning: 'Initiating AI-powered X-ray analysis with multimodal vision model. Generating risk assessment and heatmap annotations.',
    });

    // Use Gemini 2.5 Flash for advanced vision analysis with clinical precision
    const visionPrompt = `You are an expert radiologist AI providing detailed X-ray analysis for clinical decision support in Pakistan's healthcare system.

${patientContext ? `Patient Context: ${patientContext}` : ''}

Analysis Type: ${analysisType || 'General X-ray analysis (all anatomical regions)'}

Provide your analysis in this EXACT format WITHOUT any markdown formatting like ** or ##:

Clinical Findings: [Provide detailed, accurate description of all visible abnormalities, lesions, opacities, or pathological findings. Be specific about location, size, shape, and density. If normal, state "No acute abnormalities detected."]

Risk Level: [Low/Medium/High/Critical]

Confidence: [0-100]%

Recommendations: [Evidence-based next steps for the healthcare provider. Include specific tests, specialist referrals, or follow-up timeline.]

Heatmap Regions: [For EACH area of concern, provide precise coordinates as JSON array. Include ALL abnormal regions detected]:
[
  {"area": "right upper lobe opacity", "severity": "high", "x": 65, "y": 25, "size": 18, "description": "consolidation pattern"},
  {"area": "left costophrenic angle", "severity": "medium", "x": 35, "y": 75, "size": 12, "description": "blunting"},
  {"area": "cardiac silhouette", "severity": "low", "x": 50, "y": 55, "size": 20, "description": "borderline cardiomegaly"}
]

IMPORTANT Instructions:
- x and y are percentages (0-100) from top-left corner of image
- size is the radius as percentage of image width
- severity must be: "high" (red), "medium" (yellow), or "low" (orange)
- Include 1-5 regions based on actual findings
- Be clinically accurate and specific
- Do NOT use markdown formatting (**, ##, etc.) in your response
- This is AI-assisted screening for clinical decision support

Analyze carefully and provide actionable insights.`;

    const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai@0.21.0");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent clinical analysis
        topP: 0.95,
        topK: 40,
      }
    });

    const result = await model.generateContent([
      visionPrompt,
      {
        inlineData: {
          mimeType: imageBase64.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png',
          data: imageBase64.split(',')[1] || imageBase64
        }
      }
    ]);

    const response = result.response;
    let analysis = response.text();
    
    // Extract heatmap regions FIRST before cleaning (to preserve JSON structure)
    let heatmapRegions = [];
    let heatmapUrl = null;
    
    try {
      const heatmapMatch = analysis.match(/Heatmap Regions:\s*(\[[\s\S]*?\])/);
      if (heatmapMatch) {
        const jsonStr = heatmapMatch[1];
        heatmapRegions = JSON.parse(jsonStr);
        console.log('✅ Parsed heatmap regions:', heatmapRegions);
        
        // Generate heatmap data for frontend rendering
        if (heatmapRegions.length > 0) {
          heatmapUrl = JSON.stringify(heatmapRegions);
        }
      } else {
        console.log('⚠️ No heatmap regions found in analysis');
      }
    } catch (e) {
      console.error('❌ Could not parse heatmap regions:', e);
      console.log('Analysis text:', analysis.substring(0, 500));
    }

    // Now clean the analysis: remove markdown AND heatmap JSON section
    analysis = analysis
      .replace(/\*\*/g, '')
      .replace(/##/g, '')
      .replace(/Heatmap Regions:\s*\[[\s\S]*?\]/g, '')
      .trim();

    // Extract risk level for autonomous decision-making
    let riskLevel = 'medium';
    let confidence = 0.5;
    const lowerAnalysis = analysis.toLowerCase();
    
    if (lowerAnalysis.includes('critical') || lowerAnalysis.includes('urgent')) {
      riskLevel = 'critical';
      confidence = 0.85;
    } else if (lowerAnalysis.includes('high risk')) {
      riskLevel = 'high';
      confidence = 0.75;
    } else if (lowerAnalysis.includes('low risk') || lowerAnalysis.includes('normal')) {
      riskLevel = 'low';
      confidence = 0.8;
    }

    const reasoning = `AI Analysis Complete. Risk: ${riskLevel.toUpperCase()}. Confidence: ${Math.round(confidence * 100)}%. Heatmap regions: ${heatmapRegions.length}. Decision: ${riskLevel === 'critical' || riskLevel === 'high' ? 'Immediate doctor review + facility referral' : 'Standard follow-up'}.`;

    // Log autonomous decision
    await supabase.from('agent_logs').insert({
      agent_name: 'ImagingAgent',
      action: 'analysis_complete',
      session_id: sessionId,
      output_data: { 
        riskLevel, 
        confidence,
        hasHeatmap: !!heatmapUrl,
        analysis: analysis.substring(0, 200) 
      },
      reasoning,
      confidence_score: confidence,
    });

    // If critical/high risk, notify DoctorCompanion and FacilityFinder
    if (riskLevel === 'critical' || riskLevel === 'high') {
      // Determine specialty based on analysis type
      let specialty = 'Radiology';
      if (analysisType?.toLowerCase().includes('chest')) {
        specialty = 'Pulmonology';
      } else if (analysisType?.toLowerCase().includes('bone') || analysisType?.toLowerCase().includes('fracture') || analysisType?.toLowerCase().includes('skeletal')) {
        specialty = 'Orthopedics';
      } else if (analysisType?.toLowerCase().includes('abdomen') || analysisType?.toLowerCase().includes('gastrointestinal')) {
        specialty = 'Gastroenterology';
      } else if (analysisType?.toLowerCase().includes('skull') || analysisType?.toLowerCase().includes('brain') || analysisType?.toLowerCase().includes('head')) {
        specialty = 'Neurology';
      } else if (analysisType?.toLowerCase().includes('spine') || analysisType?.toLowerCase().includes('spinal')) {
        specialty = 'Neurosurgery';
      }

      await supabase.from('agent_logs').insert([
        {
          agent_name: 'ImagingAgent',
          action: 'notify_doctor_companion',
          session_id: sessionId,
          output_data: { 
            notify_agent: 'DoctorCompanionAgent',
            reason: 'high_risk_imaging_found',
            riskLevel 
          },
          reasoning: 'High-risk imaging detected. Notifying DoctorCompanionAgent to prepare case review with annotations.',
        },
        {
          agent_name: 'ImagingAgent',
          action: 'notify_facility_finder',
          session_id: sessionId,
          output_data: { 
            notify_agent: 'FacilityFinderAgent',
            reason: 'immediate_specialist_referral',
            specialty
          },
          reasoning: `Urgent case requires specialist. Notifying FacilityFinder to locate facility with ${specialty} support.`,
        }
      ]);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      riskLevel,
      confidence: Math.round(confidence * 100),
      heatmapUrl,
      nextAction: riskLevel === 'critical' ? 'emergency_referral' : riskLevel === 'high' ? 'doctor_review' : 'routine_followup',
      reasoning,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('ImagingAgent error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'AI analysis unavailable. Please consult a radiologist directly.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
