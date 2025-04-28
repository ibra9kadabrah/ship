import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import reportRoutes from './routes/report.routes';


import vesselRoutes from './routes/vessel.routes';
import authRoutes from './routes/auth.routes';
import { setupDatabase } from './db/setup';

// Load environment variables
dotenv.config();

// Setup database
setupDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/vessels', vesselRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);


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