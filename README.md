# MediDx — AI Clinical Decision Support System

<div align="center">

![MediDx](https://img.shields.io/badge/MediDx-AI%20Clinical%20DSS-00d5ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMTQxODI0Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwZDVmZiIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12-ff6f00?style=for-the-badge&logo=firebase)
![Gemini](https://img.shields.io/badge/Gemini-AI-4285f4?style=for-the-badge&logo=google)

**A professional, AI-powered clinical decision support system for modern healthcare.**

</div>

---

## ✨ Features

- ⚡ **100% Offline-Capable Core** — All patient records, emergency triage, lab trackers, treatment protocols, and PDF generation work seamlessly offline with IndexedDB storage and automatic background cloud sync
- 🛡️ **Government-Grade Security & Audit Trail** — Immutable cryptographic audit logging, AES-256 field-level encryption, role-based access control (RBAC), Helmet security headers, and rate limiting
- 🤖 **AI Differential Diagnosis (Online)** — Gemini AI generates ranked differential diagnoses with ICD-11 / ICD-10 dual-coding, evidence synthesis, and authoritative clinical guideline citations (ESC, AHA/ACC, IDSA, GOLD)
- 💊 **Treatment Management & Safety Interceptor** — Evidence-based medication recommendations with active Drug-Drug Interaction (DDI) and allergy safety screening
- 📊 **Patient Dashboard & Triage** — Emergency Severity Index (ESI 1-5) and NEWS2 scoring with real-time vitals monitoring
- 🌐 **HL7 FHIR R4 Interoperability** — Export patient encounters in standard FHIR JSON format for electronic health record (EHR) integration
- 📈 **Progress Monitoring** — Daily clinical progress notes with symptom score tracking and vitals trajectory
- 🔬 **AI Analysis Tab** — Personalized clinical practice insights and quality assurance reports
- 📄 **Bilingual PDF Report Studio** — Comprehensive clinical summaries, discharge notes, referral letters, and bilingual LAMA (English/Urdu) certificates
- 👥 **Multi-Clinician Collaboration** — Secure role-based case sharing (Owner, Admin, Clinician, Nurse, MT, WardBoy)
- 🌙 **Multi-Theme Clinical UI** — Midnight Cyan (dark), Ivory (light), and Sunset themes with high-contrast accessibility

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)
- A Firebase project (optional: already configured)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/medidx.git
cd medidx

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (for payment processing)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

> **Important:** Never commit your `.env` file. It's in `.gitignore` by default.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Build Tool | Vite 6 |
| Backend | Express.js (dev) + Vercel Serverless (prod) |
| Database | Firebase Firestore |
| Auth | Firebase Google Auth |
| AI | Google Gemini API |
| PDF | jsPDF + html2canvas |
| Charts | Recharts |

---

## 📁 Project Structure

```
medidx/
├── src/
│   ├── components/          # React UI components
│   │   ├── EncounterDashboard.tsx   # Main encounter tabs
│   │   ├── DiagnosisCard.tsx        # AI diagnosis display
│   │   ├── Dashboard.tsx            # Overview dashboard
│   │   └── ...
│   ├── services/
│   │   ├── geminiService.ts         # AI API calls
│   │   └── autoTaggingService.ts    # Auto-tag logic
│   ├── utils/
│   │   └── reportGenerator.ts       # PDF generation
│   ├── App.tsx
│   ├── AuthContext.tsx
│   ├── CaseContext.tsx
│   ├── firebase.ts
│   └── types.ts
├── api/                     # Vercel serverless functions
│   ├── gemini.ts            # AI proxy endpoint
│   └── create-checkout-session.ts
├── server.ts                # Express dev server
├── index.html
└── vite.config.ts
```

---

## 🔐 Authentication

Sign in with Google. First-time users complete a profile setup (name, role, specialty, institution).

**Roles:**
- `Owner` / `Admin` — Full access
- `Clinician` — Full patient management  
- `Nurse` / `MT` / `WardBoy` — View + progress notes only

---

## 🤖 AI Features

### Diagnosis Generation
Fill in patient data → Click **Generate AI Analysis** → Get ranked differential diagnoses with:
- Probability scores
- ICD-10/11 codes
- Supporting & contradicting evidence
- Recommended investigations
- Evidence-based treatment suggestions with guideline citations
- Morbidity & mortality statistics

### Medication Suggestions
Set a final diagnosis → Click **Suggest Medications** → Get AI-recommended drugs with dosages, rationale, and guideline references.

---

## 🏛️ Government & Institutional Procurement Readiness

MediDx is architected to meet and exceed institutional and governmental healthcare procurement criteria:

| Requirement Area | Specification / Standard | Implementation in MediDx |
|------------------|--------------------------|--------------------------|
| **Audit & Accountability** | NIST 800-53 / HIPAA §164.312(b) | Immutable audit log service with before/after state diffs, user ID, role, and ISO-8601 timestamps. One-click JSON export for regulatory compliance inspectors. |
| **Data Encryption at Rest** | AES-256 GCM | Web Crypto API field-level encryption for sensitive Protected Health Information (PHI) in local storage and client-side database. |
| **Offline-First Resilience** | Rural / Disaster / Remote Clinics | Production PWA Service Worker caching app shell. IndexedDB storage engine (`idb`) enables 100% of patient records, triage, labs, and reports to work without internet. Automatic background sync with conflict resolution when network restores. |
| **Clinical Interoperability** | HL7 FHIR R4 Standard | Native FHIR JSON encounter resource generation and export for national hospital management system integration. |
| **Clinical Standards** | WHO ICD-11 & ICD-10 | Dual diagnostic coding on all differential diagnoses with guideline attribution (ESC, AHA/ACC, IDSA, GOLD). |
| **Server Security** | OWASP Top 10 Mitigation | Express server hardened with Helmet HTTP headers, CORS origin restrictions, and API rate limiting (60 req/min/IP). Client bundle is sanitized—no API keys baked in. |
| **Role-Based Access Control** | Principle of Least Privilege | Multi-tier RBAC (`Owner`, `Admin`, `Clinician`, `Nurse`, `MT`, `WardBoy`) enforced client-side and in Firestore security rules. |

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Add environment variables in the Vercel dashboard:
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY` (optional)

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📋 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

---

## ⚠️ Disclaimer

MediDx is a **clinical decision support tool** intended to assist qualified medical professionals. All AI-generated diagnoses and recommendations are suggestions only and should not replace professional medical judgment. Always verify with clinical expertise and authoritative guidelines.

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.