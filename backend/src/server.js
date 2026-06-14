// ============================================================
// DigiQuest Studio — Express Server Entry Point
// ============================================================
// Client Pre-Production Brief Collection System
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');

const { getDb } = require('./db/database');
const errorHandler = require('./middleware/errorHandler');

async function startServer() {
  // Wait for database to initialize before starting the server
  const db = await getDb();
  console.log('✅ Database ready');

  // Make db available globally for route handlers
  global.__db = db;

  const briefsRouter = require('./routes/briefs');
  const clientsRouter = require('./routes/clients');
  const reportsRouter = require('./routes/reports');
  const dashboardRouter = require('./routes/dashboard');

  const app = express();
  const PORT = process.env.PORT || 3001;

  // ─── Global Middleware ───────────────────────────────────────
  app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // ─── Request Logging ─────────────────────────────────────────
  app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });

  // ─── Health Check ────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      project: 'client-pre-production-brief-collection-system',
      company: 'DigiQuest Studio',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // ─── API Routes ──────────────────────────────────────────────
  app.use('/api/briefs', briefsRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/dashboard', dashboardRouter);

  // ─── 404 Handler ─────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found. Check the URL and HTTP method.',
      code: 404
    });
  });

  // ─── Global Error Handler ────────────────────────────────────
  app.use(errorHandler);

  // ─── Start Server ────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   DigiQuest Studio — Brief Collection System Backend    ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║   Server running on: http://localhost:${PORT}              ║`);
    console.log(`║   Health check:      http://localhost:${PORT}/health        ║`);
    console.log('║   API base:          /api/briefs, /api/clients,         ║');
    console.log('║                      /api/reports, /api/dashboard       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
