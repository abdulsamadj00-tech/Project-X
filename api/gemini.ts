import type { VercelRequest, VercelResponse } from '@vercel/node';
import { keyPool } from './geminiKeyPool';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET /api/gemini - Pool health & status check
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'ok',
            totalKeys: keyPool.getKeyCount(),
            pool: keyPool.getPoolStatus(),
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, parts, contents, schema, model } = req.body || {};

        if (!prompt && !parts && !contents) {
            return res.status(400).json({ error: 'Missing prompt, parts, or contents in request body.' });
        }

        const result = await keyPool.generateContent({
            prompt,
            parts,
            contents,
            schema,
            model,
        });

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('[API Gemini] Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal AI proxy error',
            pool: keyPool.getPoolStatus(),
        });
    }
}
