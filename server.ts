import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Stripe from "stripe";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { keyPool } from "./api/geminiKeyPool";

dotenv.config();
// Refresh key pool with loaded environment variables
keyPool.refreshKeys();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security: HTTP headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // Security: CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'];
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // Security: Rate limiting on API routes
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per IP
    message: { error: 'Too many requests. Please wait a moment before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

  app.use(express.json({ limit: '20mb' }));

  // Request logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // API health route
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      activeKeysCount: keyPool.getKeyCount(),
      poolStatus: keyPool.getPoolStatus(),
    });
  });

  // Status check for Gemini pool
  app.get("/api/gemini", (req, res) => {
    res.json({
      status: "ok",
      totalKeys: keyPool.getKeyCount(),
      pool: keyPool.getPoolStatus(),
    });
  });

  // --- Gemini AI Proxy (Robust key pooling, failover & rate-limit auto-switch) ---
  app.post("/api/gemini", async (req: any, res: any) => {
    try {
      const { prompt, parts, contents, schema, model } = req.body || {};

      if (!prompt && !parts && !contents) {
        return res.status(400).json({ error: "Missing prompt, parts, or contents in request body." });
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
      console.error('[Server Gemini Proxy] Error:', error);
      return res.status(500).json({
        error: error.message || 'Internal AI proxy error',
        pool: keyPool.getPoolStatus(),
      });
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
    console.log(`   Gemini AI Pool: ✅ Configured (${keyPool.getKeyCount()} active keys with auto-failover)`);
    console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '⚠️  Not configured (optional)'}\n`);
  });
}

startServer();
