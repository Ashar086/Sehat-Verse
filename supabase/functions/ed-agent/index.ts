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
    const { difficulty, smoking, blood_pressure, exercise, stress, heart_disease } = await req.json();

    if (!difficulty || !smoking || !blood_pressure || !exercise || !stress || !heart_disease) {
      throw new Error("All fields are required");
    }

    let score = 0;

    // Difficulty in maintaining an erection
    if (difficulty === "Always") score += 4;
    else if (difficulty === "Frequently") score += 3;
    else if (difficulty === "Occasionally") score += 2;
    else score += 1;

    // Smoking habit
    if (smoking === "Yes") score += 3;

    // Health conditions
    if (blood_pressure === "Yes" || heart_disease === "Yes") score += 3;

    // Exercise habit
    if (exercise === "No") score += 2;

    // Stress level
    if (stress === "High") score += 2;

    // Risk Assessment
    let risk_level: string;
    let suggestion: string;

    if (score <= 5) {
      risk_level = "Low risk";
      suggestion = "Your risk of erectile dysfunction seems low. Keep maintaining a healthy lifestyle.";
    } else if (score <= 8) {
      risk_level = "Moderate risk";
      suggestion = "You might be at moderate risk for erectile dysfunction. Consider managing stress, quitting smoking, and exercising regularly.";
    } else {
      risk_level = "High risk";
      suggestion = "You seem to be at high risk for erectile dysfunction. It's recommended to see a healthcare provider for a professional evaluation.";
    }

    return new Response(
      JSON.stringify({ score, risk_level, suggestion }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in ed-agent:", error);
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
