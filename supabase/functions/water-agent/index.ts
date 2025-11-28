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
    const { weight, activity_level, environment, health_condition } = await req.json();

    if (!weight || !activity_level || !environment || !health_condition) {
      throw new Error("All fields are required");
    }

    // Base water intake calculation (in milliliters)
    let water_intake = weight * 30;

    // Adjust based on activity level
    if (activity_level === "Sedentary") water_intake += 500;
    else if (activity_level === "Lightly active") water_intake += 750;
    else if (activity_level === "Moderately active") water_intake += 1000;
    else water_intake += 1500;

    // Adjust based on environment
    if (environment === "Hot") water_intake += 500;
    else if (environment === "Humid") water_intake += 300;

    // Adjust based on health condition
    if (health_condition === "Pregnant") water_intake += 300;
    else if (health_condition === "Lactating") water_intake += 700;
    else if (health_condition === "Diabetic") water_intake += 500;

    // Generate suggestion
    let suggestion: string;
    if (water_intake > 3000) {
      suggestion = "Your water intake needs are high. Make sure to drink water regularly throughout the day. Keep a water bottle with you at all times.";
    } else if (water_intake >= 2000) {
      suggestion = "Your water needs are moderate. Drink water consistently throughout the day to stay hydrated.";
    } else {
      suggestion = "Your water needs are relatively low, but don't forget to stay hydrated. Drink water regularly, especially before, during, and after physical activities.";
    }

    return new Response(
      JSON.stringify({ water_intake, suggestion }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in water-agent:", error);
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
