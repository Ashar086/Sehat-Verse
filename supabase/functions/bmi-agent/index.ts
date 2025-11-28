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
    const { weight, height } = await req.json();

    if (!weight || !height) {
      throw new Error("Weight and height are required");
    }

    // Calculate BMI
    const bmi = weight / (height * height);

    // Classify BMI
    let category: string;
    let suggestion: string;

    if (bmi < 18.5) {
      category = "Underweight";
      suggestion = "You are underweight. It's recommended to increase your caloric intake and consult with a healthcare provider.";
    } else if (bmi >= 18.5 && bmi < 24.9) {
      category = "Normal weight";
      suggestion = "You have a healthy weight. Keep maintaining a balanced diet and regular exercise.";
    } else if (bmi >= 25 && bmi < 29.9) {
      category = "Overweight";
      suggestion = "You are overweight. Consider reducing your caloric intake and increasing physical activity.";
    } else {
      category = "Obese";
      suggestion = "You are obese. It's advisable to consult a doctor for a weight management plan.";
    }

    return new Response(
      JSON.stringify({ bmi, category, suggestion }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in bmi-agent:", error);
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
