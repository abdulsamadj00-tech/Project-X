/**
 * MediDx Intelligent Gemini API Key Pool & Failover Manager
 * 
 * Features:
 * 1. Multi-Key Pooling: Rotates requests across all active API keys.
 * 2. Automatic Failover: If a key hits rate limit (429), token exhaustion,
 *    or server overload (503), it is automatically placed in temporary cooldown
 *    and the request seamlessly retries with the next available key.
 * 3. Multi-Model Resilience: Automatic fallback across latest production Gemini models.
 * 4. Multimodal Support: Handles pure text prompts, complex schemas, and image/document parts.
 */

export interface KeyState {
    key: string;
    masked: string;
    disabledUntil: number;
    successCount: number;
    failCount: number;
    lastStatus?: number;
    lastError?: string;
}

export const SUPPORTED_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
];

function maskKey(key: string): string {
    if (!key || key.length < 8) return '***';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

class GeminiKeyPool {
    private keys: KeyState[] = [];
    private currentIndex = 0;

    constructor() {
        this.refreshKeys();
    }

    public refreshKeys(): void {
        const rawKeys: string[] = [];

        // 1. Check GEMINI_API_KEYS (comma or newline separated)
        const envKeys = process.env.GEMINI_API_KEYS;
        if (envKeys) {
            envKeys.split(/[,\n\r]+/).forEach((k) => {
                const trimmed = k.trim();
                if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('your_')) {
                    rawKeys.push(trimmed);
                }
            });
        }

        // 2. Check GEMINI_API_KEY (single fallback)
        const singleKey = process.env.GEMINI_API_KEY;
        if (singleKey) {
            const trimmed = singleKey.trim();
            if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('your_')) {
                rawKeys.push(trimmed);
            }
        }

        // Deduplicate
        const uniqueKeys = Array.from(new Set(rawKeys));

        // Preserve existing key states if present
        const existingMap = new Map<string, KeyState>(this.keys.map((k) => [k.key, k]));
        this.keys = uniqueKeys.map((key) => {
            const existing = existingMap.get(key);
            if (existing) return existing;
            return {
                key,
                masked: maskKey(key),
                disabledUntil: 0,
                successCount: 0,
                failCount: 0,
            };
        });

        console.log(`[GeminiKeyPool] Initialized with ${this.keys.length} API key(s): ${this.keys.map(k => k.masked).join(', ')}`);
    }

    public getKeyCount(): number {
        return this.keys.length;
    }

    public getPoolStatus() {
        const now = Date.now();
        return this.keys.map((k) => ({
            masked: k.masked,
            isAvailable: k.disabledUntil <= now,
            cooldownSecondsRemaining: Math.max(0, Math.round((k.disabledUntil - now) / 1000)),
            successCount: k.successCount,
            failCount: k.failCount,
            lastStatus: k.lastStatus,
        }));
    }

    /**
     * Get candidate keys sorted by availability and success rate
     */
    private getCandidateKeys(): KeyState[] {
        if (this.keys.length === 0) {
            this.refreshKeys();
        }
        if (this.keys.length === 0) {
            throw new Error('No Gemini API keys configured. Set GEMINI_API_KEYS in .env.');
        }

        const now = Date.now();
        const available = this.keys.filter((k) => k.disabledUntil <= now);

        if (available.length > 0) {
            // Rotate starting index for round-robin load distribution
            const offset = this.currentIndex % available.length;
            this.currentIndex = (this.currentIndex + 1) % available.length;
            return [...available.slice(offset), ...available.slice(0, offset)];
        }

        // If all keys are in cooldown, sort by nearest cooldown expiration
        console.warn('[GeminiKeyPool] All keys currently cooling down. Re-trying key with soonest expiration.');
        return [...this.keys].sort((a, b) => a.disabledUntil - b.disabledUntil);
    }

    /**
     * Mark a key as having failed with a status code
     */
    public markKeyFailure(keyState: KeyState, status: number, errorMsg: string): void {
        keyState.failCount++;
        keyState.lastStatus = status;
        keyState.lastError = errorMsg;

        const now = Date.now();
        if (status === 429) {
            // Rate limit / Quota exceeded: back off for 60 seconds
            keyState.disabledUntil = now + 60_000;
            console.warn(`[GeminiKeyPool] ⏳ Key ${keyState.masked} hit Rate Limit (429). Cooldown for 60s.`);
        } else if (status === 403) {
            // Quota exhausted or forbidden: back off for 120 seconds
            keyState.disabledUntil = now + 120_000;
            console.warn(`[GeminiKeyPool] ⏳ Key ${keyState.masked} hit Quota Limit / Forbidden (403). Cooldown for 120s.`);
        } else if (status === 503 || status === 500) {
            // High demand / temporary error: 20 seconds
            keyState.disabledUntil = now + 20_000;
            console.warn(`[GeminiKeyPool] ⏳ Key ${keyState.masked} hit Server Overload (${status}). Cooldown for 20s.`);
        }
    }

    public markKeySuccess(keyState: KeyState): void {
        keyState.successCount++;
        keyState.failCount = 0;
        keyState.disabledUntil = 0;
        keyState.lastStatus = 200;
    }

    /**
     * Call Gemini with full auto-switching across keys and models
     */
    public async generateContent(payload: {
        prompt?: string;
        parts?: any[];
        contents?: any[];
        schema?: any;
        model?: string;
    }): Promise<{ text: string; modelUsed: string; keyUsed: string }> {
        // Construct standard request body
        let requestBody: any;
        if (payload.contents) {
            requestBody = { contents: payload.contents };
        } else if (payload.parts) {
            requestBody = { contents: [{ parts: payload.parts }] };
        } else if (payload.prompt) {
            requestBody = { contents: [{ parts: [{ text: payload.prompt }] }] };
        } else {
            throw new Error('Missing prompt, parts, or contents in request body.');
        }

        if (payload.schema) {
            requestBody.generationConfig = {
                responseMimeType: 'application/json',
                responseSchema: payload.schema,
            };
        }

        const modelsToTry = payload.model
            ? [payload.model, ...SUPPORTED_MODELS.filter((m) => m !== payload.model)]
            : SUPPORTED_MODELS;

        const candidateKeys = this.getCandidateKeys();
        let lastError = '';
        let lastStatus = 500;

        for (const modelName of modelsToTry) {
            let model503Count = 0;
            for (const keyState of candidateKeys) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyState.key}`;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 35_000); // 35s timeout per attempt

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data: any = await response.json();
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        this.markKeySuccess(keyState);
                        return {
                            text,
                            modelUsed: modelName,
                            keyUsed: keyState.masked,
                        };
                    }

                    const errText = await response.text();
                    lastStatus = response.status;
                    lastError = errText;

                    console.warn(`[GeminiKeyPool] Model ${modelName} returned HTTP ${response.status} using key ${keyState.masked}`);

                    // 429 / 403 is KEY-SPECIFIC (quota/token exhausted on this key) -> Rotate to next key in pool
                    if (response.status === 429 || response.status === 403) {
                        this.markKeyFailure(keyState, response.status, errText);
                        console.log(`[GeminiKeyPool] 🔄 Auto-switching to next key in pool...`);
                        continue; // try next key immediately!
                    }

                    // 503 is MODEL-SPECIFIC (model experiencing high demand on Google's side)
                    if (response.status === 503) {
                        model503Count++;
                        this.markKeyFailure(keyState, response.status, errText);
                        // If model has 503'd twice, immediately fall back to next model (e.g. gemini-3.6-flash or 3.5-flash)
                        if (model503Count >= 2) {
                            console.warn(`[GeminiKeyPool] ⚡ Model ${modelName} experiencing capacity spikes. Fast-failing over to next model in chain.`);
                            break; // Try next model immediately
                        }
                        continue;
                    }

                    // 404/400 means model is not supported or deprecated
                    if (response.status === 404 || response.status === 400) {
                        break; // Move to next model
                    }
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        lastError = `Request to model ${modelName} timed out (35s).`;
                        console.warn(`[GeminiKeyPool] ⏱️ Timeout on model ${modelName} with key ${keyState.masked}. Trying next key/model.`);
                    } else {
                        lastError = err.message || 'Network error';
                    }
                    continue; // try next key
                }
            }
        }

        throw new Error(`All Gemini keys and fallback models failed. Last status: ${lastStatus}. Error: ${lastError}`);
    }
}

export const keyPool = new GeminiKeyPool();
