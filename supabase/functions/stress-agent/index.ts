import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { anxiety, sleep_hours, exercise } = await req.json();

    if (!anxiety || !sleep_hours || !exercise) {
      throw new Error("All fields are required");
    }

    let score = 0;

    // Anxiety question scoring
    if (anxiety === "Never") score += 1;
    else if (anxiety === "Occasionally") score += 2;
    else if (anxiety === "Frequently") score += 3;
    else score += 4;

    // Sleep hours question scoring
    if (sleep_hours === "Less than 6") score += 4;
    else if (sleep_hours === "6-7") score += 3;
    else if (sleep_hours === "8-9") score += 2;
    else score += 1;

    // Exercise question scoring
    if (exercise === "Yes") score += 1;
    else score += 3;

    // Classify stress level
    let stress_level: string;
    let suggestion: string;

    if (score <= 5) {
      stress_level = "Low stress";
      suggestion = "You seem to have a low stress level. Keep maintaining a healthy lifestyle with relaxation activities.";
    } else if (score <= 10) {
      stress_level = "Moderate stress";
      suggestion = "You may be experiencing moderate stress. Consider regular relaxation exercises and monitoring your stress.";
    } else {
      stress_level = "High stress";
      suggestion = "You seem to be highly stressed. Try practicing stress management techniques like meditation and deep breathing, and consider seeking professional help.";
    }

    return new Response(
      JSON.stringify({ score, stress_level, suggestion }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in stress-agent:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
