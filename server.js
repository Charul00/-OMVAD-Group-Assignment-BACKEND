import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import db from './config/db.js'; // Note: Add .js extension for ESM
import authRoutes from './src/routes/authRoutes.js';
import bookmarkRoutes from './src/routes/bookmarkRoutes.js';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
// Updated CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://*.vercel.app'] // Allow Vercel domains in production
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Local development origins
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Home route
app.get('/', (req, res) => {
  res.send('Link Saver API Server');
});

// Database connection check route
app.get('/api/health', (req, res) => {
  try {
    // Test database connection
    db.get('SELECT 1', [], (err, result) => {
      if (err) {
        console.error('Database connection error:', err);
        return res.status(500).json({ 
          status: 'error', 
          message: 'Database connection error',
          details: err.message
        });
      }
      res.json({ 
        status: 'ok', 
        message: 'Database connection successful',
        timestamp: new Date() 
      });
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error during health check',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Global error handling to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Keep the server running despite the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the server running despite the unhandled promise rejection
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Properly handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server gracefully');
  
  try {
    // Close database connection
    await db.closeConnection();
    
    // Close server
    server.close(() => {
      console.log('Server shut down');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});
