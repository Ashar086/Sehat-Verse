import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('No image provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Processing prescription image with Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all medicine names from this prescription image. Return ONLY a JSON array of medicine names, nothing else. Format: ["Medicine1", "Medicine2"]. If you cannot read any medicine names, return an empty array [].'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to process image');
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    console.log('AI Response:', extractedText);

    // Parse the JSON array from the response
    let medicineNames: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        medicineNames = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse medicine names:', e);
      // Fallback: try to extract medicine names from text
      const lines = extractedText.split('\n').filter((line: string) => line.trim());
      medicineNames = lines.map((line: string) => 
        line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim()
      ).filter((name: string) => name.length > 0);
    }

    console.log('Extracted medicines:', medicineNames);

    return new Response(
      JSON.stringify({ medicines: medicineNames }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing prescription:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process prescription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
