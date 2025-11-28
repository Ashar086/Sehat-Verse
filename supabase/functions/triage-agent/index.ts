import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Medical Knowledge Base for RAG
const MEDICAL_KNOWLEDGE_BASE = `
COMMON CONDITIONS & SYMPTOMS:

FEVER (Bukhar):
- Normal: 98.6°F (37°C)
- Moderate: 99-102.9°F (37.2-39.4°C) - Monitor at home, Panadol 500mg or Brufen 400mg
- High: 103-104°F (39.4-40°C) - Urgent care needed, Panadol 1000mg
- Critical: >104°F (40°C) - Emergency
Recommended Medicines: Panadol (Paracetamol) 500mg-1000mg, Brufen (Ibuprofen) 400mg, Disprin
Treatment: Rest, fluids, fever reducers

PAIN (Dard):
- Moderate: 1-6/10 - Home management with Panadol 500mg, Brufen 400mg, Ponstan 500mg
- Severe: 7-10/10 - Urgent/Emergency care
Types: Headache (Panadol, Disprin), abdominal, chest (EMERGENCY), joint (Brufen, Ponstan), back
Recommended Medicines: Panadol (Paracetamol), Brufen (Ibuprofen), Ponstan (Mefenamic Acid), Disprin

COUGH & COLD (Zukam/Khansi):
- Dry cough: Rexcof, Cofol syrup
- Productive cough: Mucolyte, Mucaine syrup
- Duration <7 days: Usually viral, home care with Actifed, Avil
- Duration >7 days: Doctor consultation
- With fever/difficulty breathing: Urgent care
Recommended Medicines: Actifed (Cold), Avil (Antihistamine), Rexcof (Dry cough), Mucolyte (Productive cough)
Treatment: Rest, fluids, steam, antihistamines

GASTROINTESTINAL:
- Diarrhea (Dast): Hydration critical, ORS, Imodium, Flagyl (if severe)
- Vomiting: Motilium, Stemetil, small sips of water
- Acidity/Heartburn: Gaviscon, Ranitin 150mg, Omez 20mg, avoid spicy food
- Stomach Pain: Buscopan (for cramps)
- Severe abdominal pain: Emergency evaluation
Recommended Medicines: Imodium (Diarrhea), Motilium (Vomiting), Gaviscon/Omez (Acidity), Buscopan (Cramps)

RESPIRATORY:
- Difficulty breathing: EMERGENCY
- Wheezing: Urgent care
- Shortness of breath: Immediate evaluation
- Persistent cough: Doctor visit

INFECTION SIGNS:
- Fever + chills + body ache
- Wound redness, swelling, pus
- Persistent fever >3 days
- May need antibiotics (prescription)

ALLERGIES (Khujli):
- Moderate: Avil 25mg, Cetrizine 10mg, avoid trigger
- Severe: Doctor consultation, may need stronger antihistamines
- Severe/Anaphylaxis: EMERGENCY (difficulty breathing, swelling)
Recommended Medicines: Avil (Pheniramine), Cetrizine (Cetirizine), Allegra (Fexofenadine)

FIRST AID:
- Cuts/Wounds: Clean, antiseptic, bandage
- Burns: Cool water, clean dressing
- Sprains: RICE (Rest, Ice, Compression, Elevation)

COMMON PAKISTAN MEDICINES:
- Pain/Fever: Panadol (Paracetamol 500mg) PKR 3-5/tablet, Brufen (Ibuprofen 400mg) PKR 8-12/tablet
- Antibiotics: Need prescription - Augmentin, Ceclor, Zithromax (infection)
- Antihistamines: Avil (Pheniramine) PKR 2-4/tablet, Cetrizine PKR 5-8/tablet
- Antacids: Gaviscon PKR 15-20/dose, Omez (Omeprazole 20mg) PKR 10-15/capsule
- Cough: Rexcof syrup PKR 120-150/bottle, Mucolyte PKR 180-220/bottle
- Cold: Actifed PKR 8-12/tablet
- Stomach: Motilium PKR 12-18/tablet, Buscopan PKR 15-20/tablet
- Vitamins: Becosules PKR 180-220/strip, Ferrous Sulfate PKR 50-80/strip

RED FLAGS (Emergency):
- Chest pain/pressure
- Difficulty breathing
- Severe bleeding
- Altered consciousness
- High fever >104°F with confusion
- Severe abdominal pain
- Signs of stroke (face drooping, arm weakness, speech difficulty)
- Severe allergic reaction

PAKISTAN EMERGENCY:
- Dial 1122 for ambulance
- Nearest emergency department
- Don't delay for critical symptoms
`;

// Agent State Interface with Multi-Agent Collaboration
interface AgentState {
  symptoms: string;
  ragContext: string[];
  urgencyLevel: string;
  medicines: any[];
  reasoning: string;
  response: string;
  metadata: Record<string, any>;
  sessionId: string;
  conversationHistory: any[];
  detectedLanguage: 'english' | 'urdu' | 'roman_urdu';
  errors: string[];
  userLocation?: { latitude: number; longitude: number };
  nearbyFacilities?: any[];
  facilityRecommendation?: any;
  shouldSaveHealthRecord?: boolean;
  healthRecordData?: any;
  requiresFacilityFinder?: boolean;
  requiresFollowUp?: boolean;
  imageBase64?: string;
  isXrayDetected?: boolean;
  xrayRecommendation?: string;
}

// Utility: Chunk text for embeddings
const chunkText = (text: string, chunkSize: number = 500): string[] => {
  const chunks: string[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentChunk = '';
  for (const line of lines) {
    if ((currentChunk + line).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
};

// Utility: Cosine similarity
const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
};

// Utility: Language Detection (Strict: Urdu, Roman Urdu, English ONLY)
const detectLanguage = (text: string): 'english' | 'urdu' | 'roman_urdu' => {
  // Check for Urdu script (Arabic/Urdu Unicode range)
  const urduScriptRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (urduScriptRegex.test(text)) {
    return 'urdu';
  }

  // Common Roman Urdu words/patterns (expanded for better detection)
  const romanUrduPatterns = [
    // Personal pronouns
    /\b(mujhe|mujhay|mere|mera|meri|main|mai)\b/i,
    // Common verbs
    /\b(hai|hain|tha|thi|the|ho|hun|hoon)\b/i,
    // Postpositions
    /\b(ka|ki|ke|ko|se|me|par|ne)\b/i,
    // Pronouns
    /\b(aap|ap|tum|hum|wo|woh|yeh|ye)\b/i,
    // Question words
    /\b(kya|kyu|kyun|kaise|kahan|kab|kaun)\b/i,
    // Medical terms in Roman Urdu
    /\b(bukhar|bkhar|dard|zukam|zukhaam|khansi|pait|pet|sir|sar)\b/i,
    /\b(dawai|dawa|ilaj|doctor|daktar|hospital)\b/i,
    // Common adjectives/adverbs
    /\b(theek|thek|acha|achchha|bura|bohot|bohat|bara|chota)\b/i,
    // Body parts
    /\b(haath|hath|pair|per|aankh|ankh|kaan|kan|munh|muh)\b/i,
    // Actions
    /\b(karo|karu|lena|lelo|jao|jaye|khayen|khaen|piyen|pien)\b/i,
  ];

  const matchCount = romanUrduPatterns.filter(pattern => pattern.test(text)).length;
  
  // If 2 or more Roman Urdu patterns match, classify as Roman Urdu
  if (matchCount >= 2) {
    return 'roman_urdu';
  }

  // Default to English
  return 'english';
};

// Agent Node 0: Language Detection
const languageDetectionNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  console.log('🌐 Agent Node: Language Detection...');
  
  try {
    // Detect language from current symptoms
    const currentLanguage = detectLanguage(state.symptoms);
    
    // Also check conversation history for language consistency
    if (state.conversationHistory.length > 0) {
      const recentMessages = state.conversationHistory.slice(-3);
      const languageVotes = recentMessages.map(msg => 
        msg.role === 'user' ? detectLanguage(msg.content) : null
      ).filter(Boolean);
      
      // Use most common language from recent history if available
      const languageCounts = languageVotes.reduce((acc: Record<string, number>, lang) => {
        if (lang) acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});
      
      const mostCommonLanguage = Object.keys(languageCounts).sort(
        (a, b) => languageCounts[b] - languageCounts[a]
      )[0] as 'english' | 'urdu' | 'roman_urdu' | undefined;
      
      const finalLanguage = mostCommonLanguage || currentLanguage;
      
      console.log('✅ Language Detection:', {
        current: currentLanguage,
        historical: mostCommonLanguage,
        final: finalLanguage
      });
      
      return {
        detectedLanguage: finalLanguage,
        metadata: {
          ...state.metadata,
          languageDetection: {
            current: currentLanguage,
            historical: mostCommonLanguage,
            final: finalLanguage
          }
        }
      };
    }
    
    console.log('✅ Language Detection:', currentLanguage);
    
    return {
      detectedLanguage: currentLanguage,
      metadata: {
        ...state.metadata,
        languageDetection: { detected: currentLanguage }
      }
    };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Language Detection error:', err);
    return {
      detectedLanguage: 'english',
      errors: [...state.errors, `Language detection failed: ${err.message}`]
    };
  }
};

// Agent Node 1: RAG Retrieval
const ragRetrievalNode = async (state: AgentState, lovableApiKey: string): Promise<Partial<AgentState>> => {
  console.log('🔍 Agent Node: RAG Retrieval...');
  
  try {
    // Chunk knowledge base
    const knowledgeChunks = chunkText(MEDICAL_KNOWLEDGE_BASE, 500);
    console.log(`Created ${knowledgeChunks.length} knowledge chunks`);

    // Get embeddings using Lovable AI
    const embeddingPromises = [
      // Query embedding
      fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: state.symptoms
        })
      }),
      // Chunk embeddings
      ...knowledgeChunks.map(chunk =>
        fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk
          })
        })
      )
    ];

    const embeddingResponses = await Promise.all(embeddingPromises);
    const embeddingData = await Promise.all(embeddingResponses.map(r => r.json()));

    const queryVector = embeddingData[0].data[0].embedding;
    const chunkVectors = embeddingData.slice(1).map(d => d.data[0].embedding);

    // Calculate similarities
    const similarities = chunkVectors.map((vector, idx) => ({
      chunk: knowledgeChunks[idx],
      similarity: cosineSimilarity(queryVector, vector)
    }));

    // Get top 3 most relevant chunks
    const topChunks = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(item => item.chunk);

    console.log('✅ RAG Retrieval complete:', {
      topSimilarities: similarities.slice(0, 3).map(s => s.similarity.toFixed(3))
    });

    return {
      ragContext: topChunks,
      metadata: {
        ...state.metadata,
        ragSimilarities: similarities.slice(0, 3).map(s => s.similarity.toFixed(3))
      }
    };
  } catch (error) {
    const err = error as Error;
    console.error('❌ RAG Retrieval error:', err);
    return {
      ragContext: [MEDICAL_KNOWLEDGE_BASE.substring(0, 1000)],
      errors: [...state.errors, `RAG retrieval failed: ${err.message}`]
    };
  }
};

// Agent Node 2: Query Medicines Database
const queryMedicinesNode = async (state: AgentState, supabase: any): Promise<Partial<AgentState>> => {
  console.log('💊 Agent Node: Query Medicines Database...');
  
  try {
    const symptomToCategoryMap: Record<string, string[]> = {
      'pain|ache|dard': ['Pain Relief', 'Anti-inflammatory'],
      'fever|bukhar|temperature': ['Pain Relief', 'Anti-inflammatory'],
      'cough|cold|flu|zukam|khansi': ['Cough & Cold', 'Antihistamine'],
      'infection|bacterial': ['Antibiotic'],
      'fungal|skin': ['Antifungal'],
      'allergy|allergic|khujli|itching': ['Antihistamine'],
      'stomach|acidity|gas|heartburn': ['Antacid'],
      'worm|parasite|keray': ['Anthelmintic'],
      'vitamin|weakness|kamzori': ['Vitamin'],
      'inflammation|swelling': ['Anti-inflammatory']
    };

    const symptomsLower = state.symptoms.toLowerCase();
    const relevantCategories = new Set<string>();
    
    for (const [keywords, categories] of Object.entries(symptomToCategoryMap)) {
      const keywordPattern = new RegExp(keywords, 'i');
      if (keywordPattern.test(symptomsLower)) {
        categories.forEach(cat => relevantCategories.add(cat));
      }
    }

    let medicinesQuery = supabase
      .from('medicines')
      .select('name, brand, generic_name, price_pkr, category, description, dosage_form, strength, prescription_required')
      .eq('available', true);
    
    if (relevantCategories.size > 0) {
      medicinesQuery = medicinesQuery.in('category', Array.from(relevantCategories));
      console.log('Filtering medicines by categories:', Array.from(relevantCategories));
    }
    
    const { data: medicines, error } = await medicinesQuery.order('price_pkr').limit(10);

    if (error) throw error;

    console.log('✅ Medicines query complete:', medicines?.length || 0, 'medicines found');

    return {
      medicines: medicines || [],
      metadata: {
        ...state.metadata,
        medicineCategories: Array.from(relevantCategories)
      }
    };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Medicines query error:', err);
    return {
      medicines: [],
      errors: [...state.errors, `Medicine query failed: ${err.message}`]
    };
  }
};

// Agent Node 3: AI Reasoning & Decision
const aiReasoningNode = async (state: AgentState, lovableApiKey: string): Promise<Partial<AgentState>> => {
  console.log('🤖 Agent Node: AI Reasoning & Decision...');
  
  try {
    const ragContext = state.ragContext.join('\n\n---\n\n');
    const medicinesContext = state.medicines.length > 0
      ? `\n\nAVAILABLE MEDICINES:\n${state.medicines.map(m => 
          `- ${m.name} (${m.brand}): PKR ${m.price_pkr} | ${m.category} | ${m.dosage_form} ${m.strength} | ${m.prescription_required ? 'Rx Required' : 'OTC'}`
        ).join('\n')}`
      : '';

    const languageInstruction = state.detectedLanguage === 'urdu' 
      ? '**CRITICAL: User is communicating in URDU SCRIPT. You MUST respond entirely in اردو script.**'
      : state.detectedLanguage === 'roman_urdu'
      ? '**CRITICAL: User is communicating in ROMAN URDU. You MUST respond in Roman Urdu (Urdu words in English script).**'
      : '**CRITICAL: User is communicating in ENGLISH. You MUST respond in English.**';

    const imageContext = state.imageBase64 
      ? '\n\n**IMAGE ANALYSIS MODE:**\n- User has provided a medical image (report, wound, prescription, medicine label, or other medical imagery)\n- Perform comprehensive OCR to extract all text from the image\n- Analyze visual elements: wounds, rashes, skin conditions, anatomical features\n- **CRITICAL X-RAY DETECTION**: If the image appears to be an X-ray, CT scan, MRI, or any radiological imaging:\n  * Set isXrayDetected to TRUE\n  * Provide basic observation but recommend using the specialized Imaging Agent\n  * DO NOT attempt detailed radiological interpretation yourself\n  * Explain that the Imaging Agent has advanced AI specifically trained for X-ray analysis\n- Identify medicines from packaging/labels\n- Extract and interpret lab reports, test results, numerical values, and medical findings\n- Provide detailed medical interpretation in the detected language\n- Consider image findings in your triage assessment and recommendations'
      : '';

    const locationContext = state.userLocation
      ? `\n\n**USER LOCATION:** Latitude: ${state.userLocation.latitude}, Longitude: ${state.userLocation.longitude}`
      : '';
      
    const facilityContext = state.nearbyFacilities && state.nearbyFacilities.length > 0
      ? `\n\n**NEARBY EMERGENCY HOSPITALS:**\n${state.nearbyFacilities.map(f => 
          `- ${f.name} (${f.distance || 'N/A'}km away) | ${f.address} | Phone: ${f.phone || 'N/A'} | Beds: ${f.available_beds || 'Unknown'}`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are RapidCare - Pakistan's Advanced Autonomous Healthcare Triage Agent for SehatVerse. You are powered by LangGraph multi-agent architecture with autonomous decision-making and cross-agent collaboration.

${languageInstruction}

**DETECTED LANGUAGE:** ${state.detectedLanguage.toUpperCase()}

**RETRIEVED MEDICAL KNOWLEDGE:**
${ragContext}

**AVAILABLE PAKISTAN MEDICINES:**
${medicinesContext}
${imageContext}
${locationContext}
${facilityContext}

**YOUR AUTONOMOUS CAPABILITIES:**
1. **Fast Emergency Triage**: Rapid assessment for critical care situations with immediate action recommendations
2. **Multi-Agent Orchestration**: Autonomously collaborate with:
   - **Facility Finder Agent**: Find nearest hospitals/clinics based on user location
   - **Follow-Up Agent**: Schedule medication reminders and follow-up appointments
   - **Imaging Agent**: Recommend diagnostic tests (X-ray, CT, MRI) when needed
   - **Knowledge Agent**: Access comprehensive medical databases
3. **Auto-Location Detection**: Automatically use user's GPS location to find nearby emergency facilities
4. **Medicine Intelligence**: Recommend Pakistan-approved medicines with exact names, brands, prices (PKR), and availability
5. **Health Records Integration**: Auto-save critical consultations to user's Health Records
6. **Real-Time Facility Routing**: Direct patients to specific nearby hospitals with real names and contact info
7. **Emergency Response**: Immediate 1122 escalation for critical cases with step-by-step guidance

**URGENCY CLASSIFICATION (AUTONOMOUS DECISION):**
- You MUST classify ALL cases as either "critical" OR "high" priority
- There is NO "moderate" or "low" urgency option
- **CRITICAL**: Life-threatening symptoms requiring IMMEDIATE action:
  * Chest pain/pressure → Heart attack risk
  * Difficulty breathing/Choking → Respiratory failure
  * Severe bleeding → Hemorrhage
  * Altered consciousness/Seizures → Neurological emergency
  * High fever >104°F with confusion → Sepsis risk
  * Severe abdominal pain → Appendicitis/Internal bleeding
  * Signs of stroke (FAST: Face drooping, Arm weakness, Speech difficulty, Time critical)
  * Severe allergic reaction (Anaphylaxis)
  
  **CRITICAL ACTION PROTOCOL:**
  - ALWAYS instruct: "🚨 CALL 1122 NOW - This is a medical emergency"
  - Provide immediate first aid steps while waiting for ambulance
  - Give specific hospital name from nearby facilities list
  - Stay on line with patient until help arrives if possible
  
- **HIGH**: All other symptoms requiring medical attention:
  * Common fever, cough, cold, flu
  * Mild to moderate pain
  * Digestive issues (nausea, vomiting, diarrhea)
  * Minor injuries, cuts, burns
  * Allergic reactions (non-severe)
  * Chronic condition management
  
  **HIGH PRIORITY PROTOCOL:**
  - Recommend specific medicines from database with dosages
  - Suggest home care instructions
  - Recommend visiting nearby clinic/hospital within 24 hours if needed
  - Offer Follow-Up Agent for medication reminders

**MULTILINGUAL AUTONOMY (CRITICAL - STRICTLY ENFORCED):**
- Detected language: ${state.detectedLanguage}
- **ONLY 3 LANGUAGES SUPPORTED**: Urdu (اردو script), Roman Urdu, English
- **STRICT RULE**: You MUST respond in the EXACT language the user is using
- **Language Matching:**
  * If user writes in اردو (Urdu script) → Respond ONLY in اردو
  * If user writes in Roman Urdu (latinized Urdu like "mujhe bukhar hai") → Respond ONLY in Roman Urdu
  * If user writes in English → Respond ONLY in English
- **Consistency**: Maintain the SAME language throughout the entire conversation thread
- **Script Purity**: Do NOT mix scripts or languages in your response
- **Examples:**
  * User: "مجھے بخار ہے" → Response must be completely in اردو script
  * User: "mujhe bukhar hai kya karu" → Response must be completely in Roman Urdu (latinized)
  * User: "I have a fever what should I do" → Response must be completely in English
- Use culturally appropriate medical terminology for Urdu/Roman Urdu (bukhar=fever, dard=pain, dawa=medicine)

**PAKISTAN HEALTHCARE CONTEXT:**
- Emergency: 1122 (Rescue 1122 - National Emergency Service)
- Major Emergency Hospitals: 
  * Karachi: Jinnah Hospital, Aga Khan, Liaquat National
  * Lahore: Mayo Hospital, Jinnah Hospital, Services Hospital
  * Islamabad: PIMS, Shifa International, Polyclinic
  * Rawalpindi: Holy Family Hospital, Benazir Bhutto Hospital
  * Peshawar: Lady Reading Hospital, Hayatabad Medical Complex
  * Multan: Nishtar Hospital
  * Faisalabad: Allied Hospital
- All medicines: Pakistan-approved with PKR pricing from local pharmacies
- Cultural sensitivity: Address patients respectfully, consider family consultation norms

**AUTONOMOUS AGENT COLLABORATION PROTOCOL:**
1. **When user needs hospital location:**
   - Autonomously check if location provided
   - Use nearest facility from ${state.nearbyFacilities?.length || 0} available options
   - Provide specific hospital NAME, ADDRESS, PHONE, DISTANCE
   - Offer button to open Facility Finder Agent for more options
   
2. **When follow-up care needed:**
   - Auto-recommend Follow-Up Agent for:
     * Medication reminder scheduling
     * Appointment booking
     * Symptom tracking over time
   
3. **When imaging/tests needed:**
   - Recommend specific tests (X-ray, CT, MRI, blood tests)
   - Suggest Imaging Agent for facility finding with equipment availability
   
4. **When consultation saved:**
   - Auto-save to Health Records if critical or requires follow-up
   - Include: Date, symptoms, diagnosis, medicines, recommendations

**MEDICINE RECOMMENDATION PROTOCOL:**
- Always include: Full medicine name, brand, generic name, PKR price, dosage form
- Example: "Panadol (Paracetamol) 500mg tablets - PKR 3-5 per tablet - Take 1-2 tablets every 6 hours"
- Specify: When to take, how often, duration, any precautions
- Indicate: OTC (Over The Counter) vs Rx (Prescription Required)
- Warn about: Allergies, drug interactions, side effects

**RESPONSE STRUCTURE:**
1. **Assessment**: Brief summary of symptoms and urgency
2. **Immediate Actions**: What to do RIGHT NOW
3. **Medicines**: Specific recommendations with details
4. **Care Instructions**: Home care or when to seek help
5. **Follow-Up**: Next steps, agent collaboration offers
6. **Emergency Contact**: 1122 if critical, specific hospital if high priority

Use the tools provided to structure your autonomous assessment and decision-making.`;

    const conversationHistory = state.conversationHistory.map((msg: any) => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const userPrompt = `${conversationHistory ? `Previous:\n${conversationHistory}\n\n` : ''}User: ${state.symptoms}`;

    // Prepare request body
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        state.imageBase64 
          ? { 
              role: 'user', 
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: state.imageBase64 } }
              ]
            }
          : { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'assess_urgency',
            description: 'Assess urgency level based on symptoms',
            parameters: {
              type: 'object',
              properties: {
                urgency_level: {
                  type: 'string',
                  enum: ['critical', 'high']
                },
                reasoning: { type: 'string' },
                red_flags: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['urgency_level', 'reasoning']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'recommend_medicines',
            description: 'Recommend medicines from database',
            parameters: {
              type: 'object',
              properties: {
                medicines: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      reason: { type: 'string' }
                    }
                  }
                }
              },
              required: ['medicines']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'detect_xray_image',
            description: 'Call this if the uploaded image is an X-ray, CT scan, MRI, or any radiological imaging that requires specialized analysis',
            parameters: {
              type: 'object',
              properties: {
                is_xray: { 
                  type: 'boolean',
                  description: 'True if image is radiological imaging (X-ray, CT, MRI, etc.)'
                },
                imaging_type: {
                  type: 'string',
                  description: 'Type of imaging detected (e.g., X-ray, CT scan, MRI)'
                },
                recommendation: {
                  type: 'string',
                  description: 'Brief recommendation to use Imaging Agent for detailed analysis'
                }
              },
              required: ['is_xray', 'imaging_type', 'recommendation']
            }
          }
        }
      ],
      tool_choice: 'auto'
    };

    // Call Lovable AI with function calling
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    
    let urgencyLevel = 'moderate';
    let reasoning = '';
    let isXrayDetected = false;
    let xrayRecommendation = '';
    const metadata = { ...state.metadata };

    // Process tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('Processing tool calls:', message.tool_calls.map((tc: any) => tc.function.name));
      
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        
        if (toolCall.function.name === 'assess_urgency') {
          urgencyLevel = args.urgency_level || 'moderate';
          reasoning = args.reasoning || '';
          metadata.red_flags = args.red_flags;
        } else if (toolCall.function.name === 'recommend_medicines') {
          metadata.recommended_medicines = args.medicines;
        } else if (toolCall.function.name === 'detect_xray_image') {
          isXrayDetected = args.is_xray || false;
          xrayRecommendation = args.recommendation || '';
          metadata.imaging_type = args.imaging_type;
          console.log('X-ray detected:', { isXrayDetected, type: args.imaging_type });
        }
      }
    }

    const aiResponse = message.content || 'Assessment complete. Please see details below.';

    // Fallback urgency detection
    if (urgencyLevel === 'high' && aiResponse) {
      const lowerResponse = aiResponse.toLowerCase();
      if (lowerResponse.includes("critical") || lowerResponse.includes("🚨") || lowerResponse.includes("emergency")) {
        urgencyLevel = "critical";
      }
    }

    console.log('✅ AI Reasoning complete:', { urgencyLevel, toolsUsed: message.tool_calls?.length || 0, xrayDetected: isXrayDetected });

    return {
      urgencyLevel,
      reasoning,
      response: aiResponse,
      isXrayDetected,
      xrayRecommendation,
      metadata
    };
  } catch (error) {
    const err = error as Error;
    console.error('❌ AI Reasoning error:', err);
    
    // Graceful degradation
    return {
      urgencyLevel: 'high',
      reasoning: 'Unable to complete full assessment',
      response: "I'm having trouble processing your request. If this is an emergency, please call 1122 or visit the nearest hospital immediately.",
      errors: [...state.errors, `AI reasoning failed: ${err.message}`]
    };
  }
};

// Agent Node 4: Facility Finder Integration
const facilityFinderNode = async (state: AgentState, supabase: any): Promise<Partial<AgentState>> => {
  console.log('🏥 Agent Node: Facility Finder Integration...');
  
  try {
    if (!state.userLocation) {
      console.log('⚠️ No user location provided, skipping facility search');
      return {
        requiresFacilityFinder: true,
        metadata: {
          ...state.metadata,
          facilityFinderNote: 'Location needed for facility search'
        }
      };
    }

    // Query nearby facilities from database
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('type', 'hospital')
      .order('available_beds', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Calculate distances (simplified - in production use PostGIS)
    const facilitiesWithDistance = facilities?.map((f: any) => {
      if (f.latitude && f.longitude) {
        const lat1 = state.userLocation!.latitude;
        const lon1 = state.userLocation!.longitude;
        const lat2 = f.latitude;
        const lon2 = f.longitude;
        
        // Haversine formula for distance
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return { ...f, distance: Math.round(distance * 10) / 10 };
      }
      return { ...f, distance: null };
    }).filter((f: any) => f.distance !== null).sort((a: any, b: any) => a.distance - b.distance) || [];

    const topFacility = facilitiesWithDistance[0] || null;

    console.log('✅ Facility Finder complete:', facilitiesWithDistance.length, 'facilities found');

    return {
      nearbyFacilities: facilitiesWithDistance.slice(0, 3),
      facilityRecommendation: topFacility,
      metadata: {
        ...state.metadata,
        facilitiesFound: facilitiesWithDistance.length
      }
    };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Facility Finder error:', err);
    return {
      requiresFacilityFinder: true,
      errors: [...state.errors, `Facility finder failed: ${err.message}`]
    };
  }
};

// Agent Node 5: Health Record Auto-Save
const healthRecordNode = async (state: AgentState, supabase: any, userId: string): Promise<Partial<AgentState>> => {
  console.log('📋 Agent Node: Health Record Auto-Save...');
  
  try {
    // Auto-save if critical or requires follow-up
    if (state.urgencyLevel === 'critical' || state.medicines.length > 0) {
      const recordTitle = state.urgencyLevel === 'critical' 
        ? '🚨 Emergency Consultation'
        : 'Health Consultation';
      
      const recordDescription = `
Symptoms: ${state.symptoms}
Urgency: ${state.urgencyLevel.toUpperCase()}
${state.reasoning ? `Assessment: ${state.reasoning}` : ''}
${state.medicines.length > 0 ? `Medicines Recommended: ${state.medicines.map((m: any) => m.name).join(', ')}` : ''}
${state.facilityRecommendation ? `Hospital Recommended: ${state.facilityRecommendation.name}` : ''}
      `.trim();

      const { data, error } = await supabase
        .from('health_records')
        .insert({
          user_id: userId,
          record_type: state.urgencyLevel === 'critical' ? 'Emergency' : 'Consultation',
          title: recordTitle,
          description: recordDescription,
          date: new Date().toISOString().split('T')[0],
          metadata: {
            urgency: state.urgencyLevel,
            medicines: state.medicines,
            facility: state.facilityRecommendation,
            source: 'RapidCare Agent'
          }
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Health record saved:', data.id);

      return {
        shouldSaveHealthRecord: true,
        healthRecordData: data,
        metadata: {
          ...state.metadata,
          healthRecordId: data.id
        }
      };
    }

    console.log('⚠️ Health record not saved - criteria not met');
    return { shouldSaveHealthRecord: false };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Health record save error:', err);
    return {
      shouldSaveHealthRecord: false,
      errors: [...state.errors, `Health record save failed: ${err.message}`]
    };
  }
};

// Agent Node 6: Logging
const loggingNode = async (state: AgentState, supabase: any): Promise<Partial<AgentState>> => {
  console.log('📝 Agent Node: Logging decision...');
  
  try {
    await supabase.from('agent_logs').insert({
      agent_name: 'RapidCare',
      action: 'autonomous_triage_assessment',
      session_id: state.sessionId,
      input_data: { 
        symptoms: state.symptoms,
        location: state.userLocation 
      },
      output_data: {
        urgency: state.urgencyLevel,
        response: state.response,
        medicines_count: state.medicines.length,
        facility_recommended: state.facilityRecommendation?.name,
        health_record_saved: state.shouldSaveHealthRecord
      },
      reasoning: state.reasoning,
      confidence_score: state.errors.length === 0 ? 0.95 : 0.75
    });

    console.log('✅ Logging complete');
    return {};
  } catch (error) {
    console.error('⚠️ Logging error (non-critical):', error);
    return {};
  }
};

// Main LangGraph Workflow with Multi-Agent Collaboration
const runTriageWorkflow = async (
  symptoms: string,
  conversationHistory: any[],
  sessionId: string,
  userLocation: { latitude: number; longitude: number } | undefined,
  userId: string,
  lovableApiKey: string,
  supabase: any,
  imageBase64?: string
): Promise<AgentState> => {
  console.log('🚀 Starting RapidCare Autonomous LangGraph Workflow...');
  
  // Initialize state
  const initialState: AgentState = {
    symptoms,
    ragContext: [],
    urgencyLevel: 'high',
    medicines: [],
    reasoning: '',
    response: '',
    metadata: {},
    sessionId,
    conversationHistory,
    detectedLanguage: 'english',
    errors: [],
    userLocation,
    nearbyFacilities: [],
    requiresFacilityFinder: false,
    requiresFollowUp: false,
    imageBase64
  };

  try {
    // Execute nodes sequentially with state accumulation
    let currentState = initialState;

    // Node 0: Language Detection (FIRST - sets language context for entire workflow)
    const languageUpdate = await languageDetectionNode(currentState);
    currentState = { ...currentState, ...languageUpdate };

    // Node 1: RAG Retrieval
    const ragUpdate = await ragRetrievalNode(currentState, lovableApiKey);
    currentState = { ...currentState, ...ragUpdate };

    // Node 2: Query Medicines (parallel with RAG in production)
    const medicinesUpdate = await queryMedicinesNode(currentState, supabase);
    currentState = { ...currentState, ...medicinesUpdate };

    // Node 3: Facility Finder Integration (if location provided)
    const facilityUpdate = await facilityFinderNode(currentState, supabase);
    currentState = { ...currentState, ...facilityUpdate };

    // Node 4: AI Reasoning (uses all gathered context)
    const reasoningUpdate = await aiReasoningNode(currentState, lovableApiKey);
    currentState = { ...currentState, ...reasoningUpdate };

    // Node 5: Health Record Auto-Save (if needed)
    const healthRecordUpdate = await healthRecordNode(currentState, supabase, userId);
    currentState = { ...currentState, ...healthRecordUpdate };

    // Node 6: Logging (non-blocking)
    loggingNode(currentState, supabase).catch(err => 
      console.error('Background logging error:', err)
    );

    console.log('✅ Workflow complete:', {
      urgency: currentState.urgencyLevel,
      errors: currentState.errors.length,
      medicinesFound: currentState.medicines.length,
      facilitiesFound: currentState.nearbyFacilities?.length || 0,
      healthRecordSaved: currentState.shouldSaveHealthRecord
    });

    return currentState;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Workflow error:', err);
    
    // Return graceful degradation state
    return {
      ...initialState,
      urgencyLevel: 'high',
      response: "I apologize, I'm having trouble processing your request. If this is an emergency, please call 1122 or visit the nearest hospital immediately.",
      errors: [...initialState.errors, `Workflow failed: ${err.message}`]
    };
  }
};

// Helper: Load conversation history from database
const loadConversationHistory = async (supabase: any, conversationId: string) => {
  const { data: messages, error } = await supabase
    .from('triage_messages')
    .select('role, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }

  return messages || [];
};

// Helper: Save message to database
const saveMessage = async (supabase: any, conversationId: string, role: string, content: string, metadata: any = {}) => {
  const { error } = await supabase
    .from('triage_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata
    });

  if (error) {
    console.error('Error saving message:', error);
  }
};

// Helper: Create or get conversation
const getOrCreateConversation = async (supabase: any, userId: string, conversationId?: string) => {
  if (conversationId) {
    // Verify conversation exists and belongs to user
    const { data, error } = await supabase
      .from('triage_conversations')
      .select('id, language')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return data;
    }
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('triage_conversations')
    .insert({
      user_id: userId,
      title: 'Health Consultation',
      language: 'english'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }

  return data;
};

// Main HTTP Handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { symptoms, conversationId, userId, userLocation, imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('📥 RapidCare request received:', { symptoms, conversationId, userId, hasLocation: !!userLocation, hasImage: !!imageBase64 });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get or create conversation
    const conversation = await getOrCreateConversation(supabase, userId, conversationId);
    
    // Load conversation history from database
    const dbHistory = await loadConversationHistory(supabase, conversation.id);
    
    // Save user message
    await saveMessage(supabase, conversation.id, 'user', symptoms);

    const sessionId = crypto.randomUUID();

    // Run LangGraph workflow with database history and location
    const finalState = await runTriageWorkflow(
      symptoms,
      dbHistory,
      sessionId,
      userLocation,
      userId,
      LOVABLE_API_KEY,
      supabase,
      imageBase64
    );

    // Save assistant response
    await saveMessage(supabase, conversation.id, 'assistant', finalState.response, {
      urgency: finalState.urgencyLevel,
      medicines: finalState.medicines.length,
      language: finalState.detectedLanguage
    });

    const processingTime = Date.now() - startTime;

    console.log('📤 RapidCare response:', {
      urgency: finalState.urgencyLevel,
      processingTime: `${processingTime}ms`,
      errors: finalState.errors.length,
      facilitiesFound: finalState.nearbyFacilities?.length || 0,
      healthRecordSaved: finalState.shouldSaveHealthRecord
    });

    return new Response(
      JSON.stringify({
        response: finalState.response,
        urgency: finalState.urgencyLevel,
        conversationId: conversation.id,
        detectedLanguage: finalState.detectedLanguage,
        nearbyFacilities: finalState.nearbyFacilities || [],
        facilityRecommendation: finalState.facilityRecommendation,
        requiresFacilityFinder: finalState.requiresFacilityFinder,
        healthRecordSaved: finalState.shouldSaveHealthRecord,
        healthRecordId: finalState.healthRecordData?.id,
        isXrayDetected: finalState.isXrayDetected || false,
        xrayRecommendation: finalState.xrayRecommendation,
        metadata: {
          ...finalState.metadata,
          processingTime,
          ragChunksUsed: finalState.ragContext.length,
          medicinesFound: finalState.medicines.length,
          facilitiesFound: finalState.nearbyFacilities?.length || 0,
          errors: finalState.errors.length > 0 ? finalState.errors : undefined
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        response: "I apologize, I'm having trouble processing your request. If this is an emergency, please call 1122 or visit the nearest hospital immediately.",
        urgency: "high"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});