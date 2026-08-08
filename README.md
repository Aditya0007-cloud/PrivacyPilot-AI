# PrivacyPilot AI

PrivacyPilot AI is a full-stack hackathon foundation for an AI-powered DPDP compliance and consent management platform.

This repository contains a modular hackathon build with authentication, AI-assisted privacy policy analysis, consent workflows, deletion request management, privacy assistant chat, and audit analytics dashboards.

## Tech Stack

- Frontend: React with Vite
- Styling: Tailwind CSS
- Backend: Node.js and Express
- Database: MongoDB with Mongoose
- Authentication: JWT
- AI: OpenRouter or Google Gemini API
- PDF extraction: pdf-parse
- Charts: Recharts

## Project Structure

```text
.
├── backend
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── middleware
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   ├── test-utils
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── lib
│   │   ├── pages
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 20+
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- OpenRouter API key, or Google Gemini API key if using Gemini

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Update `backend/.env` with your real values:

```env
PORT=5001
HOST=127.0.0.1
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/privacypilot_ai
MONGODB_TIMEOUT_MS=5000
JWT_SECRET=replace-with-a-secure-random-secret
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
GEMINI_API_KEY=your-gemini-api-key
```

The API health endpoint is available at:

```text
http://localhost:5001/api/health
```

In development, the server can still start if MongoDB is not available. The health endpoint will report the database as `disconnected`.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Update `frontend/.env` if the backend runs somewhere else:

```env
VITE_API_URL=http://localhost:5001/api
```

## Verify Connectivity

1. Start the backend with `npm run dev` from `backend`.
2. Start the frontend with `npm run dev` from `frontend`.
3. Open `http://localhost:5173`.
4. The status chip should show `API Connected` when the frontend can reach the backend.

## Demo Mode

Use `Try Interactive Demo` from the landing page or the demo buttons on the login page.
The backend will seed a realistic Acme Digital Services workspace and return a normal JWT session.

Demo accounts:

```text
Company: demo.company@privacypilot.ai / DemoPass123!
User: demo.user@privacypilot.ai / DemoPass123!
```

Demo mode includes seeded users, privacy policy analysis, consent records, deletion requests,
and audit logs. MongoDB must be reachable so the seed data can be stored and read through
the same APIs used by the real app.

## Available Scripts

Backend:

```bash
npm run dev
npm start
npm run lint
npm test
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Current Scope

Implemented now:

- Clean frontend and backend folders
- React/Vite/Tailwind application shell
- Express API with CORS, Helmet, logging, and JSON parsing
- MongoDB connection via environment variables
- Health check endpoint
- Frontend-to-backend health check
- JWT authentication with company and user roles
- Login, registration, and protected dashboard routing
- Company-only privacy policy PDF analyzer
- PDF text extraction through `pdf-parse`
- Server-side OpenRouter/Gemini DPDP readiness assessment with structured JSON validation
- Latest privacy policy analysis dashboard summary
- DPDP consent records with grant and withdrawal APIs
- Consent audit logs for granted and withdrawn consent events
- User Consent Center with withdrawal confirmation and toast feedback
- Company Consent Overview with live consent metrics and recent activity
- Data deletion request workflow with user submission and company processing
- Audit logs for deletion request creation, start, completion, and rejection
- User deletion request page with confirmation and request history
- Company deletion request table with start, complete, and reject actions
- AI Privacy Assistant grounded only in the latest uploaded company policy
- User chat interface with company selection, suggested questions, source display, and session history
- Company analytics API with real consent, deletion, audit, and latest policy metrics
- User analytics API with consent totals, deletion request status, and recent privacy activity
- Role-scoped audit log API with pagination, action filtering, and date filtering support
- Company compliance dashboard with Recharts consent and deletion distribution charts
- Dedicated Audit Logs page with filter, pagination, loading, and empty states
- User dashboard analytics for consent statistics, deletion status, and privacy activity
- Demo Mode with Acme Digital Services seed data and one-click demo company/user sessions
- Polished landing page with dashboard preview, demo CTA, product sections, and legal disclaimer
- Complete company navigation for dashboard, analyzer, consent overview, deletion requests, and audit logs
- Complete user navigation for dashboard, consents, deletion requests, assistant, and privacy activity
- OpenRouter/Gemini AI provider scaffold
- Mongoose models for users, privacy policies, consent records, deletion requests, and audit logs
- `.env.example` files and setup documentation

Not implemented yet:

- Production deployment configuration
