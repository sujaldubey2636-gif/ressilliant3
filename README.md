# DigiQuest Studio — Client Pre-Production Brief Collection System

A premium, full-stack pre-production brief collection and client kickoff management platform built for **DigiQuest Studio** (a full-service film and digital content production company).

The system allows studio clients and staff to submit creative and technical briefs (with scripts, visual references, brand guidelines, and target timelines) before project kickoff, helping prevent scope creep and alignment delays.

## 🚀 Repository Structure

```
digiquest-brief-system/
├── backend/                    # Node.js Express REST API
│   ├── src/
│   │   ├── db/                  # SQLite + sql.js database layer
│   │   ├── middleware/          # Validation, file uploads, error handling
│   │   ├── routes/              # Express API endpoints
│   │   ├── services/            # Brief Engine (completeness score, auto-transitions)
│   │   └── server.js            # Entry point (Port 3001)
│   └── package.json
├── frontend/                    # React 18 + Vite SPA client
│   ├── src/
│   │   ├── components/          # Reusable UI components (Uploader, Toast, Badges)
│   │   ├── pages/               # Dashboard, Forms, Lists, Analytics charts
│   │   ├── styles/              # Design system & premium dark-mode styling
│   │   └── utils/               # Fetch API wrapper
│   └── package.json
└── package.json                 # Monorepo scripts runner
```

## 🛠️ Tech Stack & Features

*   **Frontend**: React (Vite) styled with a cohesive, premium glassmorphic dark-mode CSS theme.
*   **Charts**: Chart.js & React-Chartjs-2 for visual reports of submissions, budget tiers, and completeness trends.
*   **Icons**: Lucide React.
*   **Backend**: Node.js, Express, Multer (multipart file uploads).
*   **Database**: Portable SQLite database, seeded with realistic pre-production briefs (TVCs, Feature Films, Animations, etc.).

---

## ⚡ Quick Start Instructions

You can run both the frontend and backend easily from the root folder:

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start the Backend Server (Port 3001)
```bash
npm run backend
```

### 3. Start the Frontend Client (Vite Dev Server)
```bash
npm run frontend
```

---

## 🧠 Core Business Logic: Brief Engine

The system features a custom **Brief Quality Engine** that evaluates briefs in real time:

1.  **Completeness Score (0-100)**:
    *   Script details (text or file upload): **20 pts**
    *   Visual references (text or assets): **15 pts**
    *   Brand guidelines: **15 pts**
    *   Delivery specs preset: **15 pts**
    *   Approval contacts (stakeholders): **15 pts**
    *   Deadline date target: **10 pts**
    *   Budget selection: **5 pts**
    *   Special logistics: **5 pts**
2.  **Kickoff Validation Gate**: A brief cannot be moved to `Approved` or `In Production` status unless it satisfies a minimum completeness score of **80%**.
3.  **Real-Time Alerts**: Auto-generates alerts for approaching deadlines (3 days left), overdue projects, or stale reviews.