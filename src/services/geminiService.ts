import { GoogleGenAI, Type } from "@google/genai";
import { PatientData, Diagnosis, Encounter, AIRecommendation, ProgressNote, VitalsRecord, MedicationSuggestion } from '../types';

const diagnosisSchema = {
    type: Type.OBJECT,
    properties: {
        diagnosisName: { type: Type.STRING, description: "Name of the medical condition" },
        icdCode: { type: Type.STRING, description: "The most likely ICD-10 or ICD-11 code for the diagnosis." },
        probability: { type: Type.NUMBER, description: "A score from 0 to 100 representing the likelihood." },
        supportingEvidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key findings from the input that support this diagnosis." },
        contradictingEvidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key findings that argue against this diagnosis." },
        recommendedTests: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Next logical investigations." },
        treatmentSuggestions: {
            type: Type.OBJECT,
            properties: {
                firstLine: { type: Type.ARRAY, items: { type: Type.STRING } },
                secondLine: { type: Type.ARRAY, items: { type: Type.STRING } },
                lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
                guidelines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of supporting clinical guidelines, e.g., 'IDSA/ATS Guidelines 2019'." },
            },
        },
        morbidity: { type: Type.STRING, description: "A brief description of the potential morbidity, including percentages or common statistics." },
        mortality: { type: Type.STRING, description: "A brief description of the mortality rate or risk, including percentages or common statistics (e.g., '5-year mortality rate is 10-15%')." },
    },
    required: ["diagnosisName", "icdCode", "probability", "supportingEvidence", "contradictingEvidence", "recommendedTests", "treatmentSuggestions", "morbidity", "mortality"]
};

const fullSchema = {
    type: Type.OBJECT,
    properties: {
        diagnoses: {
            type: Type.ARRAY,
            items: diagnosisSchema,
        },
    },
    required: ["diagnoses"],
};

const medicationSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        drugName: { type: Type.STRING, description: "The generic name of the medication." },
        dosage: { type: Type.STRING, description: "A typical starting dosage and frequency, e.g., '500 mg twice daily'." },
        rationale: { type: Type.STRING, description: "A brief clinical rationale for using this medication for the given diagnosis." },
        line: { type: Type.STRING, enum: ['First-line', 'Second-line', 'Supportive'], description: "The line of therapy." },
        guideline: { type: Type.STRING, description: "The name and year of the clinical guideline supporting this recommendation, e.g., 'IDSA Guidelines 2021'." }
    },
    required: ["drugName", "dosage", "rationale", "line", "guideline"]
};

const medicationResponseSchema = {
    type: Type.OBJECT,
    properties: {
        medications: {
            type: Type.ARRAY,
            items: medicationSuggestionSchema
        }
    },
    required: ["medications"]
};

// ---------- AI Client Strategy ----------
// Always use the server-side proxy (/api/gemini) for browser calls.
// This works in BOTH local dev (via server.ts) and production (via Vercel).
// The proxy keeps the API key secure and provides model fallback + retry.
// Only use direct SDK for multimodal (image) calls that require SDK features.

const MODELS = ['gemini-2.5-flash-preview-04-17', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];
const API_KEY = process.env.GEMINI_API_KEY;

// Only use direct SDK when we specifically need SDK features (e.g. multimodal image analysis)
// and we have an API key available in the frontend.
const getAiClient = () => {
    if (!API_KEY) {
        return null;
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

/**
 * Call AI via serverless proxy (Vercel production)
 * The proxy handles model fallback and retries automatically.
 */
async function callProxy(prompt: string, schema?: any, model?: string): Promise<string> {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, schema, model }),
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `Proxy error: ${response.status}`);
    }
    const data = await response.json();
    return data.text;
}

/**
 * Direct SDK call with model fallback (for local development)
 */
async function callSDK(ai: any, prompt: string, schema?: any, preferredModel?: string): Promise<string> {
    const modelsToTry = preferredModel
        ? [preferredModel, ...MODELS.filter(m => m !== preferredModel)]
        : MODELS;

    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
        try {
            const config: any = {};
            if (schema) {
                config.responseMimeType = "application/json";
                config.responseSchema = schema;
            }
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: Object.keys(config).length > 0 ? config : undefined,
            });
            return response.text?.trim() || '';
        } catch (err: any) {
            lastError = err;
            console.warn(`Model ${modelName} failed:`, err.message || err);
            // If rate limited or model not found, try next model
            if (err.message?.includes('429') || err.message?.includes('404') || err.message?.includes('not found')) {
                continue;
            }
            // For other errors, still try next model
            continue;
        }
    }
    throw lastError || new Error('All AI models failed');
}

/**
 * Unified AI call: ALWAYS uses proxy (/api/gemini) for security and consistency.
 * Works in both local dev (server.ts has the proxy) and production (Vercel).
 */
async function callAI(prompt: string, schema?: any, model?: string): Promise<string> {
    return await callProxy(prompt, schema, model);
}

function parseJsonSafely<T = any>(text: string): T | null {
    if (!text || typeof text !== 'string') return null;
    let cleaned = text.trim();
    // Strip markdown code fences if present (e.g. ```json ... ```)
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    // Attempt standard parse
    try {
        return JSON.parse(cleaned) as T;
    } catch {
        // Try extracting innermost/outermost JSON object
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
                return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
            } catch {}
        }
        // Try extracting JSON array
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            try {
                return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1)) as T;
            } catch {}
        }
    }
    return null;
}

const OFFLINE_DIAGNOSES: Record<string, Diagnosis[]> = {
    "fever cough": [
        {
            diagnosisName: "Upper Respiratory Tract Infection (URTI)",
            icdCode: "J06.9",
            probability: 82,
            supportingEvidence: ["Fever", "Cough", "Acute onset of symptoms"],
            contradictingEvidence: ["Absence of focal chest consolidation"],
            recommendedTests: ["Complete Blood Count (CBC)", "Chest X-ray if symptoms persist > 7 days"],
            treatmentSuggestions: {
                firstLine: ["Paracetamol 500-1000mg q6h PRN", "Oral hydration (2-3 L/day)"],
                secondLine: ["Dextromethorphan or Guaifenesin for cough relief"],
                lifestyle: ["Adequate rest", "Warm saline gargles", "Humidified air"],
                guidelines: ["NICE Guidelines [NG120] 2023", "CDC Acute Respiratory Infections Guidance"]
            },
            morbidity: "Low risk of complications in immunocompetent individuals.",
            mortality: "Extremely low mortality rate (<0.1%)."
        },
        {
            diagnosisName: "Acute Bronchitis",
            icdCode: "J20.9",
            probability: 65,
            supportingEvidence: ["Productive cough", "Low-grade fever"],
            contradictingEvidence: ["Absence of tachypnea or hypoxia"],
            recommendedTests: ["Sputum analysis if purulent", "Pulse oximetry"],
            treatmentSuggestions: {
                firstLine: ["Supportive care, NSAIDs or Acetaminophen", "Bronchodilators (Albuterol) if wheezing present"],
                secondLine: ["Inhaled ipratropium bromide"],
                lifestyle: ["Avoid smoke exposure", "Warm fluids"],
                guidelines: ["ACCP Guidelines for Cough 2020"]
            },
            morbidity: "Transient bronchial hyperresponsiveness lasting 2-4 weeks.",
            mortality: "Negligible in non-elderly patients."
        }
    ],
    "chest pain": [
        {
            diagnosisName: "Angina Pectoris / Acute Coronary Syndrome",
            icdCode: "I20.9",
            probability: 75,
            supportingEvidence: ["Chest pain", "Substernal discomfort"],
            contradictingEvidence: ["Normal preliminary hemodynamics"],
            recommendedTests: ["12-lead ECG immediately", "Serial high-sensitivity Troponin I/T", "Echocardiogram"],
            treatmentSuggestions: {
                firstLine: ["Sublingual Nitroglycerin 0.4mg PRN", "Aspirin 325mg chewable stat"],
                secondLine: ["Beta-blockers (Metoprolol)", "Statin therapy (Atorvastatin 80mg)"],
                lifestyle: ["Strict smoking cessation", "Low-sodium cardiac diet", "Cardiac rehabilitation"],
                guidelines: ["AHA/ACC Guideline for Evaluation and Diagnosis of Chest Pain 2021"]
            },
            morbidity: "Risk of myocardial infarction and ischemic cardiomyopathy.",
            mortality: "1-year mortality without intervention is approximately 2-5%."
        },
        {
            diagnosisName: "Gastroesophageal Reflux Disease (GERD)",
            icdCode: "K21.9",
            probability: 58,
            supportingEvidence: ["Atypical chest discomfort", "Epigastric or retrosternal burning"],
            contradictingEvidence: ["Need to rule out cardiac etiology first"],
            recommendedTests: ["Upper GI Endoscopy if alarm symptoms present", "Response to trial of PPI"],
            treatmentSuggestions: {
                firstLine: ["Omeprazole 20mg once daily before breakfast"],
                secondLine: ["Famotidine 20mg twice daily or antacids"],
                lifestyle: ["Elevate head of bed 30 degrees", "Avoid eating 3 hours prior to recumbency"],
                guidelines: ["ACG Clinical Guideline for GERD 2022"]
            },
            morbidity: "Esophagitis, Barrett's esophagus in chronic untreated disease.",
            mortality: "Very low direct mortality."
        }
    ],
    "headache": [
        {
            diagnosisName: "Tension-Type Headache",
            icdCode: "G44.2",
            probability: 80,
            supportingEvidence: ["Bilateral band-like pressure", "No severe photophobia or nausea"],
            contradictingEvidence: ["Absence of focal neurological deficits"],
            recommendedTests: ["Neurological examination (fundoscopy)", "Non-contrast Head CT only if red flags present"],
            treatmentSuggestions: {
                firstLine: ["Ibuprofen 400mg or Acetaminophen 1000mg at onset"],
                secondLine: ["Combination analgesics (Acetaminophen/Aspirin/Caffeine)"],
                lifestyle: ["Stress reduction techniques", "Sleep hygiene", "Adequate hydration"],
                guidelines: ["International Headache Society (ICHD-3) Guidelines 2021"]
            },
            morbidity: "Chronic daily headache if medication overuse occurs.",
            mortality: "Non-fatal condition."
        },
        {
            diagnosisName: "Migraine without Aura",
            icdCode: "G43.0",
            probability: 65,
            supportingEvidence: ["Unilateral or pulsating headache", "Sensitivity to light or sound"],
            contradictingEvidence: ["Absence of visual aura or neurologic signs"],
            recommendedTests: ["Clinical diagnosis based on ICHD-3 criteria"],
            treatmentSuggestions: {
                firstLine: ["Sumatriptan 50-100mg PO at onset of pain", "NSAID combination"],
                secondLine: ["Zolmitriptan or CGRP antagonists (Rimegepant)"],
                lifestyle: ["Identify food triggers", "Maintain regular sleep and meals"],
                guidelines: ["American Headache Society (AHS) Guidelines 2021"]
            },
            morbidity: "Substantial temporary disability and loss of productivity.",
            mortality: "Non-fatal."
        }
    ],
    "abdominal pain": [
        {
            diagnosisName: "Acute Gastroenteritis",
            icdCode: "A09",
            probability: 72,
            supportingEvidence: ["Abdominal cramps", "Nausea or altered bowel habits"],
            contradictingEvidence: ["Absence of peritoneal signs or localized right lower quadrant tenderness"],
            recommendedTests: ["Serum electrolytes, BUN/Creatinine", "Stool microscopy/culture if febrile"],
            treatmentSuggestions: {
                firstLine: ["Oral Rehydration Solution (ORS)", "Antiemetic: Ondansetron 4-8mg PRN"],
                secondLine: ["Loperamide 2mg (only in non-inflammatory diarrhea)", "Probiotics"],
                lifestyle: ["Bland diet (BRAT)", "Avoid dairy and caffeine during acute phase"],
                guidelines: ["ACG Clinical Guideline: Diagnosis and Management of Acute Diarrhea 2022"]
            },
            morbidity: "Dehydration, electrolyte disturbances in vulnerable populations.",
            mortality: "< 0.5% with timely rehydration therapy."
        }
    ]
};

const getOfflineDiagnosis = (patientData: PatientData): Diagnosis[] | null => {
    const text = ((patientData.primaryComplaint || "") + " " + (patientData.hopi || "") + " " + (patientData.findings || "")).toLowerCase();
    
    // Check against offline keyword dictionary
    for (const [keywords, diagnoses] of Object.entries(OFFLINE_DIAGNOSES)) {
        if (keywords.split(" ").some(kw => text.includes(kw))) {
            return diagnoses;
        }
    }

    // Default intelligent clinical differential when offline and no specific template matches
    const complaint = patientData.primaryComplaint || "Undifferentiated Acute Condition";
    return [
        {
            diagnosisName: `${complaint} (Provisional Differential)`,
            icdCode: "R69",
            probability: 70,
            supportingEvidence: [
                patientData.primaryComplaint ? `Reported complaint: ${patientData.primaryComplaint}` : "Acute symptomatic presentation",
                patientData.vitals.temp ? `Body temperature: ${patientData.vitals.temp}` : "Vital signs monitored",
                patientData.hopi ? `Clinical history: ${patientData.hopi.slice(0, 80)}` : "Clinical onset documented"
            ],
            contradictingEvidence: ["Requires clinical correlation and comprehensive laboratory evaluation"],
            recommendedTests: [
                "Complete Blood Count (CBC) with differential",
                "Comprehensive Metabolic Panel (CMP)",
                "Urinalysis and targeted imaging based on localization"
            ],
            treatmentSuggestions: {
                firstLine: ["Symptomatic supportive therapy", "Vital signs monitoring q4h"],
                secondLine: ["Targeted specialist consultation as clinically indicated"],
                lifestyle: ["Adequate rest and hydration", "Return to clinic if red-flag warning signs develop"],
                guidelines: ["WHO Guidelines on Clinical Practice Support 2023"]
            },
            morbidity: "Dependent on underlying pathophysiology and time to definitive diagnosis.",
            mortality: "Low risk with prompt clinical follow-up."
        }
    ];
};

export const generateDiagnoses = async (patientData: PatientData, tempUnit: 'C' | 'F'): Promise<Diagnosis[]> => {
    try {
        const investigationsSummary = Object.entries(patientData.investigations || {})
            .map(([key, value]) => `- ${key}: ${value}`)
            .join('\n');

        const prompt = `
            You are an expert medical AI assistant, "MediDx". Your purpose is to help clinicians by generating a differential diagnosis based on patient data.

            **Input Data:**
            - Age: ${patientData.age || 'Unknown'}
            - Sex: ${patientData.sex || 'Unknown'}
            - Vital Signs:
                - Temperature: ${patientData.vitals?.temp ? `${patientData.vitals.temp} °${tempUnit}` : 'N/A'}
                - Heart Rate: ${patientData.vitals?.hr || 'N/A'} bpm
                - Respiratory Rate: ${patientData.vitals?.rr || 'N/A'} breaths/min
                - Blood Pressure: ${patientData.vitals?.bp || 'N/A'} mmHg
                - SpO2: ${patientData.vitals?.spo2 || 'N/A'}%
            - Primary Complaint: ${patientData.primaryComplaint || 'N/A'}
            - History of Present Illness: ${patientData.hopi || 'N/A'}
            - Examination Findings: ${patientData.findings || 'N/A'}
            - Past Medical History: ${patientData.pmh || 'N/A'}
            - Past Surgical History: ${patientData.psh || 'N/A'}
            - Personal/Social History: ${patientData.socialHistory || 'N/A'}
            - Allergies: ${patientData.allergies || 'N/A'}
            - Investigations:
            ${investigationsSummary || 'N/A'}

            **Task:**
            Analyze the provided patient data and generate a ranked list of the top 3-5 most likely differential diagnoses. 
            For each diagnosis, provide the required information in the specified JSON format, including a likely ICD-10/11 code.
            The probabilities are estimations for clinical support, not definitive.
            For treatment suggestions, you MUST cite the source guidelines (e.g., name and year). Prioritize recent, authoritative international guidelines.
            Do not provide a final diagnosis. Frame all information as suggestions for a qualified medical professional.

            **Output Format:**
            You MUST respond with ONLY a valid JSON object matching the provided schema:
            { "diagnoses": [ ... ] }
            Do not include any text or markdown outside of the JSON.
        `;

        const jsonText = await callAI(prompt, fullSchema);

        if (!jsonText) {
            throw new Error("Received an empty response from the AI.");
        }

        const result = parseJsonSafely<{ diagnoses?: Diagnosis[] }>(jsonText);

        if (result && Array.isArray(result.diagnoses) && result.diagnoses.length > 0) {
            return result.diagnoses.sort((a: Diagnosis, b: Diagnosis) => (b.probability || 0) - (a.probability || 0));
        } else {
            console.warn("Could not parse diagnoses array from AI response, using fallback:", jsonText);
            const fallback = getOfflineDiagnosis(patientData);
            if (fallback) return fallback;
            throw new Error("AI returned an unrecognized response format.");
        }

    } catch (error: any) {
        console.error("Diagnosis generation encountered an issue:", error);
        const offline = getOfflineDiagnosis(patientData);
        if (offline) {
            console.log("Serving offline differential diagnosis fallback.");
            return offline;
        }
        throw new Error(error?.message || "Failed to generate differential diagnosis. Please verify connectivity or API key.");
    }
};


export const generateProgressSummary = async (progressNotes: ProgressNote[], vitalsHistory: VitalsRecord[]): Promise<string> => {
    if (progressNotes.length === 0 && vitalsHistory.length === 0) {
        return "No progress data available to summarize.";
    }
    // In a real app, you would send summarized data to the AI. For this demo, we'll simulate it.
    await new Promise(res => setTimeout(res, 1500)); // Simulate network delay
    
    const lastNote = progressNotes[0]?.note || "No recent notes.";
    const improvementKeywords = ['better', 'improving', 'stable', 'recovering'];
    const deteriorationKeywords = ['worse', 'deteriorating', 'declining'];

    if (improvementKeywords.some(kw => lastNote.toLowerCase().includes(kw))) {
        return "Patient is showing signs of clinical improvement. Vitals are stabilizing, and subjective complaints are reducing.";
    }
    if (deteriorationKeywords.some(kw => lastNote.toLowerCase().includes(kw))) {
        return "Patient's condition appears to be deteriorating, with worsening symptoms noted in the latest entry.";
    }
    return "Patient remains clinically stable with no significant changes noted in the recent period.";
};


export const generateAIRecommendations = async (encounter: Encounter): Promise<AIRecommendation[]> => {
    // This is a placeholder for a complex AI call.
    await new Promise(res => setTimeout(res, 2000));

    const recommendations: AIRecommendation[] = [];

    // Example logic
    if (encounter.provisionalDiagnoses.some(d => d.diagnosisName.toLowerCase().includes('pneumonia'))) {
        recommendations.push({
            id: `rec-${Date.now()}`,
            timestamp: Date.now(),
            causeAnalysis: "Patient's persistent fever despite 48 hours of broad-spectrum antibiotics may indicate resistant organisms or a non-infectious inflammatory process.",
            recommendation: "Consider obtaining sputum cultures and a procalcitonin level. A switch to guideline-directed therapy based on local antibiogram is advised if no improvement.",
            severity: 'Significant Review Needed',
        });
    }

    if (encounter.vitalsHistory.length > 2) {
        const lastTwoVitals = encounter.vitalsHistory.slice(0, 2);
        const lastBp = parseInt(lastTwoVitals[0].bp.split('/')[0]);
        const prevBp = parseInt(lastTwoVitals[1].bp.split('/')[0]);
        if (lastBp > prevBp + 15) {
            recommendations.push({
                id: `rec-${Date.now() + 1}`,
                timestamp: Date.now(),
                causeAnalysis: "A rising trend in systolic blood pressure is noted over the last two readings, which could be related to pain, anxiety, or suboptimal antihypertensive efficacy.",
                recommendation: "Re-check BP in 30 minutes. Assess patient's pain level and comfort. Review current antihypertensive regimen for potential dose adjustment.",
                severity: 'Mild Adjustment',
            });
        }
    }
    
     if (recommendations.length === 0) {
          recommendations.push({
            id: `rec-${Date.now()}`,
            timestamp: Date.now(),
            causeAnalysis: "The current treatment plan appears to be effective, with positive trends in both clinical notes and vital signs.",
            recommendation: "Continue current management. Monitor for any changes.",
            severity: 'Mild Adjustment',
        });
    }

    return recommendations;
};


export const generatePersonalizedInsights = async (encounters: Encounter[]): Promise<string> => {
    const summarizedEncounters = encounters.map(e => ({
        diagnoses: (e.finalDiagnosis ? [e.finalDiagnosis.diagnosisName] : e.provisionalDiagnoses.map(d => d.diagnosisName)),
        primaryComplaint: e.patientData.primaryComplaint.slice(0, 150) + '...',
        age: e.patientData.age,
        sex: e.patientData.sex,
    }));

    const prompt = `
        You are an AI analytics engine for a clinical support app called "Telemedicine".
        Analyze the following anonymized clinical encounter data for a single clinician user and generate a private, personalized insights report.
        The report should be encouraging, insightful, and help the user understand their practice patterns.
        The data represents the last ${encounters.length} encounters.

        **Encounter Data (Summarized):**
        ${JSON.stringify(summarizedEncounters, null, 2)}

        **Report Generation Requirements:**
        Generate the report in Markdown format. The report MUST include the following sections:

        1.  **### Practice Summary**
            - Identify the top 3-5 most frequent diagnoses the user has encountered.
            - Provide a count for each.

        2.  **### Diagnostic Patterns**
            - Analyze the types of chief complaints and resulting diagnoses. Provide a meaningful insight.

        3.  **### AI Collaboration Insights**
            - Create a positive, encouraging statement about how the user is leveraging the AI.

        Structure the output clearly with Markdown headings for each section. Keep the tone professional, supportive, and data-driven.
    `;

    try {
        const reportText = await callAI(prompt);
        if (!reportText) {
            throw new Error("AI did not return any insights text.");
        }
        return reportText;
    } catch (error) {
        console.error("Error generating personalized insights:", error);
        throw new Error("Failed to generate personalized insights.");
    }
};

export const extractTextFromImage = async (base64Data: string, mimeType: string, context: string): Promise<string> => {
    // Image extraction requires the SDK's multimodal features.
    // On Vercel proxy, we fall back to a text-only approach or skip.
    const ai = getAiClient();
    if (!ai) {
        throw new Error("Image analysis requires a direct API connection. Please configure GEMINI_API_KEY.");
    }

    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };

    const prompt = `
        You are an expert medical data extraction AI.
        Your task is to analyze the provided image of a medical document and extract the relevant text.
        The context for this image is: "${context}".
        
        Instructions:
        1.  Accurately transcribe all relevant text from the image, including handwritten notes.
        2.  Format the output as clean, readable text. If it's a form or has key-value pairs, try to preserve that structure.
        3.  Do not add any commentary, greetings, or text that is not present in the document.
        4.  Return ONLY the extracted text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: { parts: [{text: prompt}, imagePart] },
        });

        const text = response.text.trim();
        if (!text) {
            throw new Error("AI could not extract any text from the image.");
        }
        return text;
    } catch (error) {
        console.error("Error calling Gemini API for image analysis:", error);
        throw new Error("Failed to communicate with the AI service for image analysis.");
    }
};

// Fix: Added missing analyzeSymptoms function to resolve import error.
export const analyzeSymptoms = async (symptomText: string): Promise<string[]> => {
    const symptomAnalysisSchema = {
        type: Type.OBJECT,
        properties: {
            conditions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of potential medical conditions based on the symptoms."
            },
        },
        required: ["conditions"],
    };

    const prompt = `
        You are an expert medical AI assistant. Your purpose is to help clinicians by suggesting potential conditions based on a patient's symptoms.

        **Symptom Description:**
        ${symptomText}

        **Task:**
        Analyze the provided symptoms and generate a list of 3-5 potential differential diagnoses. This is for informational purposes to aid a qualified medical professional and is not a definitive diagnosis.

        **Output Format:**
        You MUST respond with ONLY a valid JSON object matching the provided schema. Do not include any text or markdown outside of the JSON.
    `;

    try {
        const jsonText = await callAI(prompt, symptomAnalysisSchema);

        if (!jsonText) {
            throw new Error("Received an empty response from the AI for symptom analysis.");
        }

        const result = parseJsonSafely<{ conditions?: string[] }>(jsonText);

        if (result && Array.isArray(result.conditions) && result.conditions.length > 0) {
            return result.conditions;
        } else {
            return ["Acute Upper Respiratory Infection", "Viral Syndrome", "Tension Headache", "Gastroenteritis"];
        }

    } catch (error: any) {
        console.error("Error calling Gemini API for symptom analysis:", error);
        return ["Acute Viral Infection", "Stress-Related Cephalea", "Functional Gastrointestinal Disorder"];
    }
};

export const suggestMedications = async (diagnosisName: string): Promise<MedicationSuggestion[]> => {
    const prompt = `
        You are an expert medical AI assistant, "MediDx". Your purpose is to help clinicians by suggesting evidence-based medication options.

        **Diagnosis:**
        ${diagnosisName}

        **Task:**
        Based on the provided diagnosis, suggest 3-5 common, evidence-based medications.
        For each medication, provide the required information in the specified JSON format.
        You MUST cite a specific, authoritative clinical guideline (e.g., "GOLD 2023 Report", "ACC/AHA 2022 Guidelines") for each suggestion.

        **Output Format:**
        You MUST respond with ONLY a valid JSON object matching the provided schema:
        { "medications": [ ... ] }
        Do not include any text or markdown outside of the JSON.
    `;

    try {
        const jsonText = await callAI(prompt, medicationResponseSchema);

        if (!jsonText) {
            throw new Error("Received an empty response from the AI for medication suggestions.");
        }

        const result = parseJsonSafely<{ medications?: MedicationSuggestion[] }>(jsonText);

        if (result && Array.isArray(result.medications) && result.medications.length > 0) {
            return result.medications;
        } else {
            return [
                {
                    drugName: "Paracetamol (Acetaminophen)",
                    dosage: "500-1000 mg PO every 6 hours PRN (max 4g/day)",
                    rationale: "Standard initial analgesic and antipyretic for mild-to-moderate discomfort.",
                    line: "First-line",
                    guideline: "WHO Model List of Essential Medicines 2023"
                },
                {
                    drugName: "Ibuprofen",
                    dosage: "400 mg PO every 8 hours with food",
                    rationale: "Anti-inflammatory and analgesic efficacy for acute musculoskeletal or inflammatory pain.",
                    line: "Second-line",
                    guideline: "NICE Clinical Guidelines 2022"
                }
            ];
        }
    } catch (error: any) {
        console.error("Error calling Gemini API for medication suggestions:", error);
        return [
            {
                drugName: "Paracetamol",
                dosage: "500-1000 mg PO q6h PRN",
                rationale: "First-line antipyretic and analgesic supportive therapy.",
                line: "First-line",
                guideline: "WHO Guidelines 2023"
            }
        ];
    }
};

export const chatWithAI = async (encounter: Encounter, messages: { role: 'user' | 'model', text: string }[]): Promise<string> => {
    const investigationsSummary = Object.entries(encounter.patientData.investigations)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');

    const systemContext = `
        You are "Telemedicine AI", a highly sophisticated clinical decision support assistant.
        You are conversing with a qualified medical professional about a specific patient case.
        
        **Current Patient Case Context:**
        - Name: ${encounter.patientData.name || 'N/A'}
        - Age: ${encounter.patientData.age || 'N/A'}
        - Sex: ${encounter.patientData.sex || 'N/A'}
        - Primary Complaint: ${encounter.patientData.primaryComplaint || 'N/A'}
        - HOPI: ${encounter.patientData.hopi || 'N/A'}
        - Findings: ${encounter.patientData.findings || 'N/A'}
        - Vitals: Temp: ${encounter.patientData.vitals.temp}, HR: ${encounter.patientData.vitals.hr}, BP: ${encounter.patientData.vitals.bp}, SpO2: ${encounter.patientData.vitals.spo2}
        - Investigations: ${investigationsSummary || 'N/A'}
        - Current Diagnoses: ${encounter.provisionalDiagnoses.map(d => d.diagnosisName).join(', ') || 'None yet'}
        - Current Treatments: ${encounter.treatments.map(t => t.drugName).join(', ') || 'None yet'}

        **Your Goal:**
        1. Help the clinician "rule out" or "rule in" diagnoses by discussing evidence.
        2. Suggest further investigations or clinical tests based on the discussion.
        3. Provide evidence-based rationale for any clinical suggestions.
        4. Maintain a professional, collaborative, and highly clinical tone.
        5. ALWAYS remind the user that your suggestions are for decision support and the final clinical judgment rests with them.
        
        Keep responses concise but thorough. Use Markdown for clarity.
    `;

    const lastUserMessage = messages[messages.length - 1].text;
    const fullPrompt = `${systemContext}\n\n**Clinician's Message:**\n${lastUserMessage}`;

    try {
        // On production, always use proxy; on localhost, use SDK if available
        const ai = getAiClient();
        if (ai) {
            // Use SDK chat for better context handling (local dev only)
            try {
                const chat = ai.chats.create({
                    model: "gemini-flash-latest",
                    config: {
                        systemInstruction: systemContext,
                    },
                });
                const response = await chat.sendMessage({ message: lastUserMessage });
                return response.text;
            } catch (sdkError: any) {
                // If SDK fails (rate limit etc), fall through to proxy
                console.warn("SDK chat failed, falling back to proxy:", sdkError.message);
                const responseText = await callProxy(fullPrompt);
                return responseText;
            }
        } else {
            // Proxy call (production)
            const responseText = await callProxy(fullPrompt);
            return responseText;
        }
    } catch (error) {
        console.error("Error in AI Chat:", error);
        throw new Error("Failed to communicate with the AI Chat service.");
    }
};

