import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { checkSupabaseConnection } from './lib/supabase';
import mealRoutes from './routes/meal';
import dashboardRoutes from './routes/dashboard';
import profileRoutes from './routes/profile';
import exerciseRoutes from './routes/exercise';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images

// --- Health Check ---
app.get('/api/health', async (_req, res) => {
  const supabaseOk = await checkSupabaseConnection();

  const status = supabaseOk ? 'ok' : 'degraded';
  const httpCode = supabaseOk ? 200 : 503;

  res.status(httpCode).json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      supabase: supabaseOk ? 'connected' : 'disconnected',
    },
  });
});

// --- API Routes ---
app.use('/api', mealRoutes);      // analyze-meal, save-meal, upload-image
app.use('/api', dashboardRoutes); // daily-stats, today-meals
app.use('/api', profileRoutes);   // user-profile, weight-history
app.use('/api', exerciseRoutes);  // log-exercise, today-exercises
// POST /api/generate-daily-summary — Ticket #7
// POST /api/generate-weekly-plan   — Ticket #8
// POST /api/log-exercise       — Ticket #6
// POST /api/update-profile-summary — Ticket #10

app.get('/', (_req, res) => {
  res.json({
    name: 'Health App API',
    version: '0.1.0',
    docs: '/api/health',
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Backend] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
