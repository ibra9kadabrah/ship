import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import reportRoutes from './routes/report.routes';
import voyageRoutes from './routes/voyage.routes'; // Add import for voyage routes
import debugRoutes from './routes/debug.routes'; // Add import for debug routes


import vesselRoutes from './routes/vessel.routes';
import authRoutes from './routes/auth.routes';
import { setupDatabase } from './db/setup';
import { getDbPath } from './db/connection'; // Import a function to get the path
import fs from 'fs';

// Load environment variables
dotenv.config();

// Setup database only if it does not exist
const dbPath = getDbPath();
if (!fs.existsSync(dbPath)) {
  console.log(`[app] Database not found at ${dbPath}, running setup...`);
  setupDatabase();
} else {
  console.log(`[app] Database found at ${dbPath}, skipping setup.`);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/vessels', vesselRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/voyages', voyageRoutes); // Mount voyage routes
app.use('/api/debug', debugRoutes); // Mount debug routes


// Admin URL handler
app.use('/admin', (req, res, next) => {
  // This is just a placeholder for admin route handling
  // In a real implementation, you might serve an admin frontend here
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'MRV Ship Reporting API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
