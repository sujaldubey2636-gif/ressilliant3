# DigiQuest Studio — Client Pre-Production Brief Collection System

## About
A full-stack web application for DigiQuest Studio to collect, manage, and track client production briefs before project kickoff. Reduces kickoff meeting time and prevents mid-project brief changes caused by unclear initial requirements.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Charts | Chart.js |

## Project Structure
```
digiquest-brief-system/
├── frontend/          # React + Vite app
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── db/        # Database schema, connection, seeds
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic engine
│   │   └── middleware/ # Validation, error handling, uploads
│   ├── data/          # SQLite database file
│   └── uploads/       # Uploaded files
├── docs/              # Documentation
└── tests/             # Test cases
```

## Getting Started

### Backend
```bash
cd backend
npm install
npm run seed    # Insert sample data (5 clients + 15 briefs)
npm run dev     # Start dev server on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Start dev server on http://localhost:5173
```

## API Endpoints

### Briefs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/briefs | Create a new brief |
| GET | /api/briefs | List briefs (filters, search, pagination) |
| GET | /api/briefs/:id | Get single brief |
| GET | /api/briefs/:id/detail | Full detail + audit history |
| PUT | /api/briefs/:id | Update brief |
| PATCH | /api/briefs/:id/status | Change status |
| DELETE | /api/briefs/:id | Archive brief |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/clients | Create client |
| GET | /api/clients | List clients |
| GET | /api/clients/:id | Client + their briefs |
| PUT | /api/clients/:id | Update client |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/summary | Overall stats + 30-day time series |
| GET | /api/reports/by-type | Briefs by project type |
| GET | /api/reports/by-client | Briefs per client |
| GET | /api/reports/completeness | Score distribution + trends |
| GET | /api/reports/export | CSV export |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/summary | Key metrics + recent briefs |
| GET | /api/dashboard/alerts | Unread alerts |
| PATCH | /api/dashboard/alerts/:id/read | Mark alert read |
| PATCH | /api/dashboard/alerts/read-all | Mark all read |

## Team
- Student 1: Frontend
- Student 2: Backend
- Student 3: Testing & Deployment

## Company
DigiQuest Studio — Full-service film and digital content production
