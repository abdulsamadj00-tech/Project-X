import type { VercelRequest, VercelResponse } from '@vercel/node';

// Models to try in order of preference (fallback chain)
// gemini-flash-latest is the stable alias that always points to the latest flash model
const MODELS = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest'
];

async function callGemini(apiKey: string, modelName: string, requestBody: any): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
    // Use v1beta endpoint (supports all model aliases including gemini-flash-latest)
    const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
    ];
    
    for (const url of endpoints) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errText = await response.text();
            // If 404 on this endpoint, try next
            if (response.status === 404) continue;
            return { ok: false, status: response.status, error: errText };
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { ok: true, status: 200, data: { text } };
    }
    
    return { ok: false, status: 404, error: `Model ${modelName} not found on any endpoint` };
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
    }

    try {
        const { prompt, schema, model } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt in request body.' });
        }

        const requestBody: any = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        if (schema) {
            requestBody.generationConfig = {
                responseMimeType: 'application/json',
                responseSchema: schema,
            };
        }

        // If a specific model is requested, put it first in the fallback chain
        const modelsToTry = model 
            ? [model, ...MODELS.filter(m => m !== model)]
            : MODELS;

        let lastError = '';
        let lastStatus = 500;

        // Try each model with retry
        for (const modelName of modelsToTry) {
            for (let attempt = 0; attempt < 2; attempt++) {
                if (attempt > 0) {
                    // Wait before retry (exponential backoff)
                    await sleep(2000 * attempt);
                }

                console.log(`Trying model: ${modelName} (attempt ${attempt + 1})`);
                const result = await callGemini(apiKey, modelName, requestBody);

                if (result.ok) {
                    console.log(`Success with model: ${modelName}`);
                    return res.status(200).json(result.data);
                }

                lastError = result.error || 'Unknown error';
                lastStatus = result.status;

                // If it's a 429 (rate limit), try next model immediately
                if (result.status === 429) {
                    console.log(`Rate limited on ${modelName}, trying next model...`);
                    break; // Skip retry, move to next model
                }

                // If it's a 400 (bad request / model not found), try next model
                if (result.status === 400 || result.status === 404) {
                    console.log(`Model ${modelName} not available, trying next...`);
                    break;
                }
            }
        }

        // All models failed
        console.error('All models failed. Last error:', lastError);
        return res.status(lastStatus).json({ error: `Gemini API error: ${lastStatus}`, details: lastError });
    } catch (error: any) {
        console.error('Server proxy error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

