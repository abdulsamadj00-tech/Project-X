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

- 🤖 **AI Differential Diagnosis** — Gemini AI generates ranked differential diagnoses with ICD-10 codes, supporting/contradicting evidence, and treatment suggestions
- 💊 **Treatment Management** — Evidence-based medication recommendations with guideline citations
- 📊 **Patient Dashboard** — Real-time patient case management with Firebase sync
- 📈 **Progress Monitoring** — Daily progress notes with symptom score tracking and vitals history
- 🔬 **AI Analysis Tab** — Personalized clinical insights and AI recommendations
- 📄 **Report Generation** — PDF reports (comprehensive, discharge summary, referral, LAMA)
- 👥 **Team Collaboration** — Multi-clinician case sharing with role-based access
- 🌙 **Multi-Theme** — Midnight Cyan (dark), Ivory (light), and Sunset themes
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile

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