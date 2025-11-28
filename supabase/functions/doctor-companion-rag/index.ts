import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Knowledge base for RAG
const KNOWLEDGE_BASE = `
Dengue Fever: Transmitted by Aedes mosquitoes. Symptoms include high fever, severe headache, pain behind eyes, joint/muscle pain, rash. Treatment: Rest, hydration, paracetamol. Avoid aspirin/NSAIDs. Seek ER if severe bleeding, persistent vomiting, severe abdominal pain.

Hypertension: High blood pressure >140/90 mmHg. Risk factors: age, family history, obesity, high salt, stress. Management: lifestyle changes, regular exercise, DASH diet, medications (ACE inhibitors, ARBs, diuretics). Monitor BP regularly.

Diabetes Type 2: High blood sugar due to insulin resistance. Symptoms: increased thirst, frequent urination, fatigue, blurred vision. Management: diet control, exercise, metformin, insulin if needed. Monitor HbA1c quarterly.

Tuberculosis: Bacterial lung infection. Symptoms: chronic cough >3 weeks, fever, night sweats, weight loss, blood in sputum. Diagnosis: chest X-ray, sputum test. Treatment: 6-9 months anti-TB drugs (DOTS program). Highly treatable if completed.

Malaria: Parasitic infection from mosquito bites. Symptoms: cyclical fever, chills, sweating, headache, body aches. Diagnosis: blood film/RDT. Treatment: ACT (artemisinin combination therapy). Prevention: mosquito nets, repellents.

Pneumonia: Lung infection causing cough, fever, chest pain, difficulty breathing. Can be bacterial/viral. Treatment: antibiotics for bacterial, supportive care for viral. Seek ER if severe breathing difficulty.

COVID-19: Viral respiratory illness. Symptoms: fever, cough, fatigue, loss of taste/smell. Most cases mild. Seek care if breathing difficulty, persistent chest pain, confusion. Prevention: vaccination, masking, hand hygiene.

Hepatitis B/C: Viral liver infections. B transmitted through blood/body fluids. C mainly through blood. Can cause chronic liver disease. Treatment: antivirals. Prevention: vaccination (B), safe practices.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, imageBase64, imageMode = 'scan', conversationHistory = [] } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🤖 Doctor Companion RAG: Processing query with RAG pipeline');

    // Log agent action
    const sessionId = crypto.randomUUID();
    await supabase.from('agent_logs').insert({
      agent_name: 'DoctorCompanionRAG',
      action: 'process_query',
      session_id: sessionId,
      input_data: { 
        hasQuery: !!query, 
        hasImage: !!imageBase64, 
        imageMode,
        conversationLength: conversationHistory.length 
      },
      reasoning: 'Processing multimodal query using RAG pipeline with knowledge base retrieval and Gemini 2.5 Flash for generation.',
    });

    // 1. Chunk knowledge base
    const chunkText = (text: string, chunkSize = 800, overlap = 200): string[] => {
      const cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const chunks: string[] = [];
      let start = 0;
      while (start < cleaned.length) {
        chunks.push(cleaned.slice(start, start + chunkSize));
        start += chunkSize - overlap;
      }
      return chunks;
    };

    const kbChunks = chunkText(KNOWLEDGE_BASE);
    console.log(`📚 Created ${kbChunks.length} knowledge base chunks`);

    // 2. Get embeddings for all chunks and query
    const getEmbedding = async (text: string): Promise<number[]> => {
      const embedUrl = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
      const response = await fetch(`${embedUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] }
        }),
      });
      const data = await response.json();
      return data.embedding.values;
    };

    // Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // Get embeddings for all chunks
    const chunkEmbeddings = await Promise.all(
      kbChunks.map(chunk => getEmbedding(chunk))
    );

    // 3. Calculate cosine similarity and retrieve top K chunks
    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magA * magB);
    };

    const similarities = chunkEmbeddings.map((embedding, idx) => ({
      chunk: kbChunks[idx],
      similarity: cosineSimilarity(queryEmbedding, embedding),
      index: idx,
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    const topChunks = similarities.slice(0, 4);
    
    const ragContext = topChunks
      .map((item, i) => `[KB ${i + 1}] ${item.chunk}`)
      .join('\n\n');

    console.log(`🔍 Retrieved ${topChunks.length} relevant chunks (top similarity: ${topChunks[0]?.similarity.toFixed(3)})`);

    // 4. Analyze image if provided
    let visualSummary = 'No image provided.';
    let threatLevel = 'N/A';

    if (imageBase64) {
      const imageAnalysisPrompt = imageMode === 'report'
        ? `You are analyzing a medical lab report or scan report image. Extract all text, values, and findings. Explain what the values mean in simple terms. Note any abnormal values but do NOT diagnose.`
        : `You are analyzing a medical image (X-ray, MRI, rash, wound, etc.). Describe what you observe in medical terms. Use cautious language like "appears to show" or "suggests". Estimate threat level: LOW/MODERATE/HIGH based on visual findings.`;

      try {
        const visionResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: imageAnalysisPrompt },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: imageBase64,
                    }
                  }
                ]
              }]
            }),
          }
        );
        const visionData = await visionResponse.json();
        visualSummary = visionData.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to analyze image.';
        
        // Extract threat level from response
        if (visualSummary.toLowerCase().includes('high') || visualSummary.toLowerCase().includes('severe')) {
          threatLevel = 'HIGH';
        } else if (visualSummary.toLowerCase().includes('moderate')) {
          threatLevel = 'MODERATE';
        } else {
          threatLevel = 'LOW';
        }
      } catch (e) {
        console.error('Image analysis error:', e);
      }
    }

    // 5. Build final prompt with RAG context and image analysis
    const systemPrompt = `You are a clinical AI assistant for doctors. Provide CONCISE, action-oriented responses.

KNOWLEDGE BASE:
${ragContext}

IMAGE ANALYSIS:
${visualSummary}
Threat Level: ${threatLevel}

RESPONSE FORMAT:
- Keep answers brief and summarized (2-3 short paragraphs max)
- Use bullet points for key information
- Focus on: diagnosis, immediate actions, red flags
- Only provide detailed explanations if doctor explicitly asks "provide more details", "explain further", or similar

Be direct and professional. Avoid lengthy explanations unless specifically requested.`;

    // Build conversation history for context
    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: query }] }
    ];

    // 6. Generate response with Gemini
    const generateUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const response = await fetch(`${generateUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: messages }),
    });

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';

    // Log completion
    await supabase.from('agent_logs').insert({
      agent_name: 'DoctorCompanionRAG',
      action: 'response_generated',
      session_id: sessionId,
      output_data: {
        responseLength: answer.length,
        chunksUsed: topChunks.length,
        threatLevel,
        hasImage: !!imageBase64,
      },
      reasoning: `RAG pipeline completed. Retrieved ${topChunks.length} relevant chunks. ${imageBase64 ? `Image analyzed with ${threatLevel} threat level.` : ''} Generated clinical assessment.`,
      confidence_score: topChunks[0]?.similarity || 0,
    });

    // Strip markdown formatting from answer
    const cleanAnswer = answer
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1');

    return new Response(JSON.stringify({
      success: true,
      answer: cleanAnswer,
      metadata: {
        chunksUsed: topChunks.length,
        topSimilarity: topChunks[0]?.similarity,
        threatLevel,
        visualSummary: imageBase64 ? visualSummary : null,
        ragContextLength: ragContext.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('DoctorCompanionRAG error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
