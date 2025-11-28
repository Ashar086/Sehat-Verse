import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalorieRequest {
  gender: string;
  age: number;
  weight: number;
  height: number;
  activity_level: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { gender, age, weight, height, activity_level }: CalorieRequest = await req.json();

    // Validate inputs
    if (!gender || !age || !weight || !height || !activity_level) {
      throw new Error("Missing required fields");
    }

    // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    let bmr: number;
    if (gender.toLowerCase() === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender.toLowerCase() === "female") {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      throw new Error("Invalid gender");
    }

    // Adjust BMR based on activity level to get TDEE (Total Daily Energy Expenditure)
    let tdee: number;
    switch (activity_level.toLowerCase()) {
      case "sedentary":
        tdee = bmr * 1.2;
        break;
      case "lightly active":
        tdee = bmr * 1.375;
        break;
      case "moderately active":
        tdee = bmr * 1.55;
        break;
      case "very active":
        tdee = bmr * 1.725;
        break;
      default:
        throw new Error("Invalid activity level");
    }

    // Generate personalized suggestion based on TDEE
    let suggestion: string;
    if (tdee > 2500) {
      suggestion = "Your TDEE is high. Consider adjusting your calorie intake to maintain or reduce your weight.";
    } else if (tdee >= 2000) {
      suggestion = "Your calorie needs are moderate. Maintain your current calorie intake to stay healthy.";
    } else {
      suggestion = "Your TDEE is low. You might want to increase your physical activity or watch your calorie intake to prevent weight gain.";
    }

    return new Response(
      JSON.stringify({ tdee, suggestion }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in calorie-agent:", error);
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
