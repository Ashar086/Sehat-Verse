import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embedded medicine data (CSV data as constant)
const MEDICINE_DATA_CSV = `title,price_range,company,packing
Amoxicillin 735,47-62,Sanofi,injection 5ml
Cefixime 260,126-165,Sami Pharma,tablets
Panadol 873,39-50,Sami Pharma,capsules
Panadol 381,32-41,Abbott,syrup 100ml
Panadol 743,33-42,Various,soft gel
Paracetamol 182,23-32,GlaxoSmithKline,syrup 60ml
Amoxicillin 622,55-78,Sami Pharma,powder
Ibuprofen 676,23-46,Sanofi,syrup 60ml
Ciprofloxacin 224,50-88,Sami Pharma,powder
Ibuprofen 398,29-47,Sanofi,tablets
Azithromycin 964,86-125,Abbott,powder
Loratadine 697,32-52,Sami Pharma,injection 5ml
Ibuprofen 472,26-46,Pfizer,tablets
Panadol 854,43-50,Sanofi,soft gel
Panadol 565,34-41,Sami Pharma,powder
Azithromycin 796,83-135,Abbott,powder
Loratadine 400,27-43,Sami Pharma,tablets
Paracetamol 837,19-40,Sanofi,injection 5ml
Cefixime 134,128-157,Various,syrup 60ml
Azithromycin 566,88-140,Various,powder
Loratadine 662,25-41,GlaxoSmithKline,syrup 60ml
Cefixime 473,125-163,Abbott,capsules
Ibuprofen 672,27-43,Pfizer,capsules
Azithromycin 497,85-121,GlaxoSmithKline,injection 2ml
Paracetamol 637,21-31,Various,soft gel
Loratadine 641,32-40,Sami Pharma,tablets
Panadol 770,39-47,Sami Pharma,soft gel
Panadol 687,37-42,Getz Pharma,injection 5ml
Cefixime 377,123-157,Pfizer,injection 5ml
Cefixime 892,129-163,GlaxoSmithKline,soft gel
Ibuprofen 401,28-44,GlaxoSmithKline,powder
Loratadine 244,25-55,Various,injection 5ml
Ciprofloxacin 170,58-86,GlaxoSmithKline,injection 2ml
Cetirizine 507,22-35,Sanofi,tablets
Ibuprofen 214,27-43,Sanofi,capsules
Panadol 273,36-58,Getz Pharma,syrup 100ml
Azithromycin 930,84-126,GlaxoSmithKline,tablets
Amoxicillin 527,46-80,Sanofi,injection 5ml
Ciprofloxacin 764,54-71,Getz Pharma,injection 2ml
Ciprofloxacin 422,53-83,GlaxoSmithKline,tablets
Panadol 280,33-49,Pfizer,soft gel
Cetirizine 956,21-37,Getz Pharma,tablets
Paracetamol 486,20-32,Various,syrup 100ml
Cetirizine 623,18-34,Various,soft gel
Cetirizine 482,22-33,Sami Pharma,soft gel
Panadol 656,41-67,Getz Pharma,injection 5ml
Cetirizine 841,23-33,Sanofi,tablets
Cefixime 690,127-152,Getz Pharma,soft gel
Ibuprofen 364,27-47,GlaxoSmithKline,capsules
Cetirizine 410,25-44,GlaxoSmithKline,tablets
Amoxicillin 587,46-76,Abbott,tablets
Cetirizine 437,17-37,Abbott,syrup 60ml
Cefixime 837,130-164,Abbott,injection 5ml
Cefixime 168,122-152,Sanofi,syrup 60ml
Loratadine 531,33-57,Sami Pharma,soft gel
Panadol 651,46-53,Sami Pharma,soft gel
Loratadine 817,32-56,Various,syrup 60ml
Panadol 897,47-54,Getz Pharma,powder
Cefixime 682,120-152,Pfizer,tablets
Ibuprofen 998,21-55,Sami Pharma,injection 5ml
Loratadine 902,33-53,Various,soft gel
Amoxicillin 838,51-72,Various,injection 5ml
Loratadine 232,28-43,Getz Pharma,powder
Panadol 652,39-40,Sanofi,injection 2ml
Ibuprofen 467,20-55,Abbott,syrup 60ml
Ibuprofen 730,30-47,Abbott,injection 5ml
Cetirizine 783,15-48,Abbott,injection 2ml
Panadol 888,31-58,Various,injection 5ml
Azithromycin 825,83-133,Getz Pharma,syrup 100ml
Ciprofloxacin 783,51-87,Sanofi,injection 2ml
Cefixime 580,122-164,Sanofi,capsules
Azithromycin 757,80-121,Getz Pharma,powder
Panadol 788,45-65,Sami Pharma,injection 5ml
Panadol 368,32-42,Various,capsules
Loratadine 666,28-43,Pfizer,syrup 60ml
Ibuprofen 882,26-44,Abbott,capsules
Amoxicillin 955,48-71,Abbott,syrup 100ml
Cetirizine 757,23-32,Various,powder
Ciprofloxacin 405,52-72,Abbott,tablets
Ibuprofen 131,21-49,Pfizer,injection 2ml
Loratadine 791,35-56,Various,capsules
Ibuprofen 516,25-47,Sanofi,tablets
Paracetamol 240,19-25,Various,soft gel
Cefixime 481,123-160,Sanofi,capsules
Amoxicillin 249,50-74,Sami Pharma,injection 5ml
Azithromycin 105,81-120,GlaxoSmithKline,powder
Cetirizine 220,20-43,GlaxoSmithKline,soft gel
Loratadine 632,30-42,Pfizer,syrup 60ml
Ibuprofen 848,22-52,Abbott,injection 2ml
Azithromycin 868,84-129,Sami Pharma,syrup 100ml
Loratadine 322,25-58,Sanofi,soft gel
Azithromycin 733,90-137,Getz Pharma,capsules
Azithromycin 411,87-131,Abbott,powder
Ibuprofen 378,29-36,Various,tablets
Panadol 424,49-69,Pfizer,syrup 60ml
Cetirizine 174,21-50,Sanofi,tablets
Ibuprofen 762,22-38,GlaxoSmithKline,injection 5ml
Paracetamol 113,21-38,Abbott,injection 2ml
Amoxicillin 655,49-65,GlaxoSmithKline,tablets
Cefixime 361,121-169,Getz Pharma,powder
Loratadine 391,30-60,Sanofi,soft gel
Cetirizine 861,21-33,GlaxoSmithKline,soft gel
Cetirizine 321,22-43,Sami Pharma,injection 5ml
Panadol 851,32-52,Abbott,soft gel
Panadol 876,48-63,GlaxoSmithKline,injection 5ml
Paracetamol 238,15-34,Getz Pharma,soft gel
Cefixime 460,127-156,Pfizer,tablets
Ibuprofen 590,22-48,Getz Pharma,capsules
Amoxicillin 396,45-75,GlaxoSmithKline,capsules
Ibuprofen 854,22-43,Sami Pharma,injection 2ml
Cefixime 131,127-169,Abbott,soft gel
Panadol 571,41-66,Getz Pharma,capsules
Azithromycin 268,83-134,Getz Pharma,injection 5ml
Amoxicillin 993,49-61,Sami Pharma,syrup 60ml
Paracetamol 259,24-42,Various,powder
Panadol 644,43-59,GlaxoSmithKline,syrup 60ml
Azithromycin 618,89-138,Sami Pharma,injection 2ml
Cetirizine 403,16-42,Sami Pharma,capsules
Ciprofloxacin 961,55-88,GlaxoSmithKline,soft gel
Cefixime 975,122-157,Sanofi,powder
Cefixime 886,121-154,Getz Pharma,powder
Panadol 715,47-66,Getz Pharma,capsules
Azithromycin 612,85-123,Sanofi,soft gel
Loratadine 828,26-55,Sami Pharma,soft gel
Panadol 700,47-63,Sanofi,injection 2ml
Amoxicillin 988,52-60,Abbott,syrup 60ml
Cefixime 452,128-157,Various,injection 2ml
Panadol 364,40-55,Abbott,soft gel
Ciprofloxacin 779,56-83,Pfizer,injection 2ml
Paracetamol 379,19-39,Sami Pharma,tablets
Cefixime 160,122-161,Various,injection 2ml
Amoxicillin 346,50-76,Getz Pharma,injection 2ml
Cefixime 349,124-163,GlaxoSmithKline,syrup 100ml
Cefixime 446,123-154,Abbott,powder
Cefixime 340,122-169,Abbott,capsules
Panadol 212,37-46,GlaxoSmithKline,powder
Panadol 902,42-62,Sami Pharma,syrup 60ml
Loratadine 728,25-47,Getz Pharma,syrup 60ml
Cetirizine 952,19-34,GlaxoSmithKline,powder
Ibuprofen 832,30-41,Sanofi,tablets
Panadol 527,32-53,GlaxoSmithKline,syrup 60ml
Loratadine 674,30-44,Sanofi,syrup 100ml
Ciprofloxacin 189,50-77,Various,injection 5ml
Loratadine 767,35-51,Various,syrup 60ml
Azithromycin 975,84-123,Sami Pharma,tablets
Cefixime 631,121-170,Sanofi,tablets
Ciprofloxacin 848,53-82,Sanofi,soft gel
Loratadine 326,34-60,Various,syrup 60ml
Amoxicillin 249,55-69,Abbott,powder
Ibuprofen 285,22-54,Pfizer,tablets
Cefixime 497,130-169,GlaxoSmithKline,syrup 100ml
Azithromycin 736,84-138,GlaxoSmithKline,capsules
Ibuprofen 600,22-46,Sanofi,injection 2ml
Ciprofloxacin 390,55-76,Sanofi,injection 2ml
Cetirizine 226,15-31,Sami Pharma,soft gel
Amoxicillin 430,51-70,Pfizer,injection 2ml
Ibuprofen 215,28-47,Various,tablets
Cetirizine 282,21-44,Various,capsules
Cetirizine 431,22-39,Various,injection 2ml
Paracetamol 499,21-45,Sanofi,powder
Cefixime 460,126-168,Pfizer,syrup 60ml
Amoxicillin 251,49-61,Sami Pharma,capsules
Paracetamol 630,25-44,GlaxoSmithKline,injection 2ml
Cefixime 239,122-157,Getz Pharma,injection 5ml
Panadol 889,34-58,Various,injection 5ml
Cetirizine 306,18-49,GlaxoSmithKline,injection 5ml
Ciprofloxacin 753,50-78,Sami Pharma,powder
Cefixime 544,126-153,GlaxoSmithKline,injection 5ml
Cetirizine 305,21-46,Sanofi,injection 5ml
Azithromycin 942,85-125,Abbott,syrup 100ml
Azithromycin 527,83-124,Various,powder
Ibuprofen 432,21-35,Various,syrup 60ml
Panadol 624,32-48,Pfizer,tablets
Azithromycin 367,89-136,Sami Pharma,capsules
Paracetamol 363,25-36,Sami Pharma,injection 2ml
Cefixime 286,128-153,Various,injection 5ml
Azithromycin 805,88-139,Sami Pharma,injection 5ml
Azithromycin 989,84-140,GlaxoSmithKline,syrup 100ml
Cefixime 897,125-157,Abbott,powder
Ibuprofen 879,28-36,GlaxoSmithKline,injection 2ml
Panadol 681,45-69,GlaxoSmithKline,syrup 100ml
Loratadine 625,33-40,Sami Pharma,tablets
Panadol 687,34-44,GlaxoSmithKline,injection 5ml
Loratadine 754,33-53,Getz Pharma,syrup 100ml
Panadol 281,40-57,Getz Pharma,soft gel
Cetirizine 359,23-49,Pfizer,tablets
Ciprofloxacin 481,60-81,Getz Pharma,injection 5ml
Panadol 152,35-45,Getz Pharma,tablets
Ciprofloxacin 185,59-70,Sanofi,soft gel
Cetirizine 109,25-50,Various,soft gel
Loratadine 325,30-57,GlaxoSmithKline,capsules
Cefixime 786,130-170,Pfizer,injection 5ml
Ibuprofen 218,29-52,Various,injection 2ml
Amoxicillin 688,53-78,Sanofi,tablets
Ibuprofen 585,23-42,Sanofi,soft gel
Ciprofloxacin 132,58-76,Sami Pharma,syrup 60ml
Cefixime 376,121-151,Getz Pharma,syrup 60ml
Cefixime 719,120-153,Abbott,injection 5ml
Panadol 781,34-46,Pfizer,powder
Azithromycin 559,80-130,Sanofi,injection 2ml`;

// Vector store in-memory (for production, consider using Supabase pgvector)
let vectorStore: Array<{
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
}> = [];

let isInitialized = false;

// Load CSV and create embeddings
async function initializeVectorStore(genAI: GoogleGenerativeAI) {
  if (isInitialized) return;
  
  console.log('🔄 Initializing medicine knowledge base...');
  
  try {
    // Parse embedded CSV data
    const lines = MEDICINE_DATA_CSV.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Parse CSV and create documents
    const docs = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === 4) {
        const [title, priceRange, company, packing] = values;
        const content = `Medicine: ${title}\nPrice: ${priceRange} PKR\nCompany: ${company}\nPacking: ${packing}`;
        docs.push({
          content,
          metadata: { medicine: title, price: priceRange, company, packing }
        });
      }
    }
    
    console.log(`📚 Processing ${docs.length} medicine entries...`);
    
    // Generate embeddings for all documents
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const result = await model.embedContent(doc.content);
      const embedding = result.embedding.values;
      
      vectorStore.push({
        id: String(i),
        content: doc.content,
        metadata: doc.metadata,
        embedding: embedding as number[]
      });
      
      // Log progress every 50 items
      if ((i + 1) % 50 === 0) {
        console.log(`   ✓ Processed ${i + 1}/${docs.length} medicines`);
      }
    }
    
    isInitialized = true;
    console.log(`✅ Vector store initialized with ${vectorStore.length} medicine entries`);
  } catch (error) {
    console.error('❌ Error initializing vector store:', error);
    throw error;
  }
}

// Cosine similarity for vector comparison
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Fuzzy search for medicine names
function fuzzySearchMedicines(query: string, threshold: number = 3): Array<{ content: string; metadata: Record<string, any>; score: number }> {
  const queryLower = query.toLowerCase();
  const matches = vectorStore
    .map(doc => {
      const medicineName = doc.metadata.medicine.toLowerCase();
      const distance = levenshteinDistance(queryLower, medicineName);
      return { ...doc, fuzzyScore: distance };
    })
    .filter(doc => doc.fuzzyScore <= threshold)
    .sort((a, b) => a.fuzzyScore - b.fuzzyScore)
    .slice(0, 5)
    .map(doc => ({
      content: doc.content,
      metadata: doc.metadata,
      score: 1 - (doc.fuzzyScore / 10) // Convert distance to similarity score
    }));
  
  return matches;
}

// Query vector store
async function queryVectorStore(
  genAI: GoogleGenerativeAI,
  query: string,
  topK: number = 5
): Promise<Array<{ content: string; metadata: Record<string, any>; score: number }>> {
  // Generate query embedding
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(query);
  const queryEmbedding = result.embedding.values as number[];
  
  // Calculate similarities
  const results = vectorStore.map(doc => ({
    content: doc.content,
    metadata: doc.metadata,
    score: cosineSimilarity(queryEmbedding, doc.embedding)
  }));
  
  // Sort by similarity and return top-k
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context, sessionId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('gemini_api_key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    console.log('📚 KnowledgeAgent RAG: Query received:', query);

    // Initialize vector store on first request
    if (!isInitialized) {
      await initializeVectorStore(genAI);
    }

    // Log agent action
    await supabase.from('agent_logs').insert({
      agent_name: 'KnowledgeAgent',
      action: 'rag_query',
      session_id: sessionId,
      input_data: { query, hasContext: !!context },
      reasoning: 'RAG-based medicine price lookup using vector embeddings and semantic search',
    });

    // Retrieve relevant documents using vector search
    const startTime = Date.now();
    let relevantDocs = await queryVectorStore(genAI, query, 5);
    let retrievalTime = Date.now() - startTime;
    let usedFuzzySearch = false;
    let usedGeminiSearch = false;

    // If no good matches, try fuzzy search
    if (relevantDocs.length === 0 || relevantDocs[0].score < 0.5) {
      console.log('📝 Low similarity, attempting fuzzy search...');
      const fuzzyMatches = fuzzySearchMedicines(query, 4);
      if (fuzzyMatches.length > 0) {
        relevantDocs = fuzzyMatches;
        usedFuzzySearch = true;
        console.log(`🔍 Fuzzy search found ${fuzzyMatches.length} matches`);
      }
    }

    console.log(`🔍 Retrieved ${relevantDocs.length} relevant medicines in ${retrievalTime}ms`);
    console.log(`   Top match: ${relevantDocs[0]?.metadata.medicine} (similarity: ${(relevantDocs[0]?.score * 100).toFixed(1)}%)`);

    // If still no good results, search with Gemini for verified info
    let geminiSearchResult = null;
    if (relevantDocs.length === 0 || relevantDocs[0].score < 0.4) {
      console.log('🤖 Using Gemini to search for medicine information...');
      const searchModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const searchPrompt = `You are a Pakistan medicine price expert. Search for information about: "${query}"
      
      Provide ONLY verified information about the medicine including:
      - Medicine name
      - Price range in PKR
      - Company/Manufacturer
      - Packing/Dosage form
      
      If you don't have verified information, clearly state "Information not available in verified sources."
      Keep response concise and factual (max 100 words).`;
      
      const searchResult = await searchModel.generateContent(searchPrompt);
      geminiSearchResult = searchResult.response.text();
      usedGeminiSearch = true;
    }

    // Build context from retrieved documents
    const retrievedContext = relevantDocs.length > 0
      ? relevantDocs
          .map((doc, idx) => `[Result ${idx + 1}] (Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.content}`)
          .join('\n\n')
      : 'No matches found in database.';

    // Generate answer using Gemini with RAG context
    const aiPrompt = geminiSearchResult 
      ? `You are a Pakistan Healthcare Medicine Price Assistant providing accurate, evidence-based information.

**Gemini Search Result:**
${geminiSearchResult}

**User Query:** ${query}
${context ? `\n**Additional Context:** ${context}` : ''}

**Instructions:**
1. Use the Gemini search result to provide information
2. Always mention if information is from external verified sources
3. Include price ranges in PKR if available
4. Keep the response clear, concise, and helpful (max 150 words)
5. If no verified information is available, clearly state that

Provide your answer now:`
      : `You are a Pakistan Healthcare Medicine Price Assistant providing accurate, evidence-based information.

**Retrieved Medicine Data:**
${retrievedContext}

**User Query:** ${query}
${context ? `\n**Additional Context:** ${context}` : ''}

**Instructions:**
1. Answer based ONLY on the retrieved medicine data above
2. If asking about a specific medicine, provide ALL matching entries with their prices, companies, and packing
3. If the medicine is not found in the data, clearly state "This medicine is not available in our database"
4. Always mention price ranges in PKR (Pakistani Rupees)
5. Keep the response clear, concise, and helpful (max 150 words)
6. If multiple companies make the same medicine, list all options

Provide your answer now:`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await chatModel.generateContent(aiPrompt);
    const response = result.response;
    const synthesizedAnswer = response.text();

    // Log response
    await supabase.from('agent_logs').insert({
      agent_name: 'KnowledgeAgent',
      action: 'rag_response_generated',
      session_id: sessionId,
      output_data: {
        retrievedDocs: relevantDocs.length,
        topMatchScore: relevantDocs[0]?.score,
        topMedicine: relevantDocs[0]?.metadata.medicine,
        answerLength: synthesizedAnswer.length,
        retrievalTimeMs: retrievalTime
      },
      reasoning: `RAG retrieval successful. Top match: ${relevantDocs[0]?.metadata.medicine} with ${(relevantDocs[0]?.score * 100).toFixed(1)}% similarity`,
      confidence_score: relevantDocs[0]?.score || 0,
    });

    return new Response(JSON.stringify({
      success: true,
      answer: synthesizedAnswer,
      retrievedDocs: relevantDocs.map(doc => ({
        medicine: doc.metadata.medicine,
        price: doc.metadata.price,
        company: doc.metadata.company,
        packing: doc.metadata.packing,
        relevance: Math.round(doc.score * 100)
      })),
      confidence: Math.round((relevantDocs[0]?.score || 0) * 100),
      reasoning: usedGeminiSearch 
        ? 'Used Gemini search for verified information (not found in database)'
        : usedFuzzySearch
        ? `Found ${relevantDocs.length} medicines using fuzzy search (typo correction)`
        : `Found ${relevantDocs.length} relevant medicines using semantic search`,
      retrievalTimeMs: retrievalTime,
      searchMethod: usedGeminiSearch ? 'gemini' : usedFuzzySearch ? 'fuzzy' : 'semantic'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('KnowledgeAgent RAG error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallback: 'Medicine knowledge base temporarily unavailable. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
