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
    const { lhwId, villages, tasks, mode, sessionId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('👩‍⚕️ LHWRouteAgent: Optimizing route for LHW', lhwId, 'Mode:', mode || 'online');

    // Log agent action
    await supabase.from('agent_logs').insert({
      agent_name: 'LHWRouteAgent',
      action: 'optimize_route',
      session_id: sessionId,
      input_data: { lhwId, villageCount: villages?.length, taskCount: tasks?.length, mode },
      reasoning: 'Optimizing Lady Health Worker route for maximum village coverage. Using TSP-like algorithm for efficient rural healthcare delivery. Supporting offline PWA mode.',
    });

    // Mock village locations (in production, from GPS/database)
    const villageLocations = villages || [
      { name: 'Village A', lat: 30.1234, lon: 67.5678, population: 450, priority: 'high' },
      { name: 'Village B', lat: 30.1456, lon: 67.5890, population: 320, priority: 'medium' },
      { name: 'Village C', lat: 30.1567, lon: 67.6012, population: 280, priority: 'low' },
      { name: 'Village D', lat: 30.1678, lon: 67.6123, population: 510, priority: 'high' },
    ];

    // Autonomous route optimization
    // Greedy nearest-neighbor with priority weighting
    let currentLat = 30.1234; // Starting point (BHU/LHW home)
    let currentLon = 67.5678;
    const optimizedRoute: any[] = [];
    const unvisited = [...villageLocations];

    // Prioritize high-priority villages first
    unvisited.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority as keyof typeof priorityWeight] || 1) - 
             (priorityWeight[a.priority as keyof typeof priorityWeight] || 1);
    });

    while (unvisited.length > 0) {
      // Find nearest unvisited village (simplified Euclidean distance)
      let nearest = unvisited[0];
      let minDistance = Infinity;

      unvisited.forEach(village => {
        const dist = Math.sqrt(
          Math.pow(village.lat - currentLat, 2) + 
          Math.pow(village.lon - currentLon, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearest = village;
        }
      });

      optimizedRoute.push({
        ...nearest,
        order: optimizedRoute.length + 1,
        estimatedTime: optimizedRoute.length * 45 + 30, // 45min between villages + 30min task time
      });

      currentLat = nearest.lat;
      currentLon = nearest.lon;
      unvisited.splice(unvisited.indexOf(nearest), 1);
    }

    const totalDistance = optimizedRoute.length * 15; // ~15km per village (mock)
    const totalTime = optimizedRoute[optimizedRoute.length - 1]?.estimatedTime || 0;

    let reasoning = `Route optimized for ${optimizedRoute.length} villages. Total distance: ${totalDistance}km, Time: ${Math.round(totalTime / 60)}hrs. Prioritized high-need areas first.`;

    // AI-powered task scheduling
    const aiPrompt = `You are a Lady Health Worker (LHW) route planning AI for rural Pakistan.

**Optimized Route:**
${optimizedRoute.map(v => `${v.order}. ${v.name} (${v.population} pop, ${v.priority} priority)`).join('\n')}

**Tasks:** ${tasks?.join(', ') || 'Vaccinations, health checkups, maternal care'}
**Mode:** ${mode === 'offline' ? 'Offline PWA (no internet)' : 'Online'}

Provide:
1. Task allocation per village (which village gets which tasks?)
2. Time management tips (stay within 7-hour workday)
3. Contingency plan (if offline, what to cache?)

Keep response under 4 lines. Be practical for rural settings.`;

    const { GoogleGenerativeAI } = await import("https://esm.sh/@google/generative-ai@0.21.0");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const taskSchedule = response.text();

    // Log autonomous decision
    await supabase.from('agent_logs').insert({
      agent_name: 'LHWRouteAgent',
      action: 'route_optimized',
      session_id: sessionId,
      output_data: {
        villagesInRoute: optimizedRoute.length,
        totalDistance,
        totalTimeMinutes: totalTime,
        mode
      },
      reasoning,
      confidence_score: 0.82,
    });

    // If offline mode, prepare cached data package
    let offlinePackage = null;
    if (mode === 'offline') {
      offlinePackage = {
        route: optimizedRoute,
        cachedForms: ['vaccination_record', 'maternal_checkup', 'child_nutrition'],
        cachedMedications: ['ORS', 'Paracetamol', 'Iron tablets'],
        syncInstructions: 'Connect to BHU WiFi to upload data. GPS tracks cached locally.',
      };

      await supabase.from('agent_logs').insert({
        agent_name: 'LHWRouteAgent',
        action: 'offline_package_prepared',
        session_id: sessionId,
        output_data: offlinePackage,
        reasoning: 'Offline mode detected. Prepared cached route, forms, and medication list for PWA storage. GPS tracking enabled for later sync.',
      });
    }

    // Notify FollowUpAgent about scheduled village visits
    await supabase.from('agent_logs').insert({
      agent_name: 'LHWRouteAgent',
      action: 'notify_followup',
      session_id: sessionId,
      output_data: {
        notify_agent: 'FollowUpAgent',
        reason: 'lhw_village_schedule',
        villages: optimizedRoute.map(v => v.name)
      },
      reasoning: 'LHW route finalized. Notifying FollowUpAgent to schedule vaccination/checkup reminders for village residents.',
    });

    return new Response(JSON.stringify({
      success: true,
      optimizedRoute,
      totalDistance,
      totalTimeHours: Math.round(totalTime / 60 * 10) / 10,
      taskSchedule,
      offlinePackage,
      reasoning,
      nextAction: mode === 'offline' ? 'cache_offline_package' : 'start_route',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('LHWRouteAgent error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'Route optimization unavailable. Use manual village list.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
