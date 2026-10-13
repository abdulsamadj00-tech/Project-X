import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

async function callGeminiAPI(apiKey: string, modelName: string, requestBody: any): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
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
      if (response.status === 404) continue;
      return { ok: false, status: response.status, error: errText };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { ok: true, status: 200, data: { text } };
  }

  return { ok: false, status: 404, error: `Model ${modelName} not found on any endpoint` };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Gemini AI Proxy (works in both dev and production) ---
  app.post("/api/gemini", async (req: any, res: any) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server. Add it to your .env file." });
    }

    try {
      const { prompt, schema, model } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt in request body." });
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

      const modelsToTry = model
        ? [model, ...GEMINI_MODELS.filter((m) => m !== model)]
        : GEMINI_MODELS;

      let lastError = '';
      let lastStatus = 500;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));

          console.log(`Trying model: ${modelName} (attempt ${attempt + 1})`);
          const result = await callGeminiAPI(apiKey, modelName, requestBody);

          if (result.ok) {
            console.log(`Success with model: ${modelName}`);
            return res.status(200).json(result.data);
          }

          lastError = result.error || 'Unknown error';
          lastStatus = result.status;

          if (result.status === 429 || result.status === 400 || result.status === 404) break;
        }
      }

      console.error('All models failed. Last error:', lastError);
      return res.status(lastStatus).json({ error: `Gemini API error: ${lastStatus}`, details: lastError });
    } catch (error: any) {
      console.error('Server proxy error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "MediDx Pro Subscription",
                description: "Unlock advanced AI diagnostics and unlimited reports.",
              },
              unit_amount: 2900, // $29.00
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
      root: process.cwd(),
    });
    app.use(vite.middlewares);

    // Explicitly serve index.html for non-asset requests in dev
    app.get("*all", async (req: any, res: any, next: any) => {
      const url = req.originalUrl;

      // If it's an API request or has an extension, skip
      if (url.startsWith('/api') || (url.includes('.') && !url.endsWith('.html'))) {
        return next();
      }

      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        console.error('Vite transform error:', e);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 MediDx server running at http://localhost:${PORT}`);
    console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured (add GEMINI_API_KEY to .env)'}`);
    console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '⚠️  Not configured (optional)'}\n`);
  });
}

startServer();