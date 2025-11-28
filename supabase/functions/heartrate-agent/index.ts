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
    const { age } = await req.json();

    if (!age) {
      throw new Error("Age is required");
    }

    // Calculate maximum heart rate
    const mhr = 220 - age;

    // Calculate target heart rate zones
    const moderate_low = mhr * 0.50;
    const moderate_high = mhr * 0.70;
    const vigorous_low = mhr * 0.70;
    const vigorous_high = mhr * 0.85;

    // Personalized suggestion
    const suggestion = "Maintain exercise within your target zones for optimal cardiovascular health. The moderate zone is ideal for fat burning, while the vigorous zone builds endurance.";

    return new Response(
      JSON.stringify({ 
        mhr, 
        moderate_low, 
        moderate_high, 
        vigorous_low, 
        vigorous_high, 
        suggestion 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in heartrate-agent:", error);
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
