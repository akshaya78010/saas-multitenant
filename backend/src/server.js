const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const runMigrations = require('./utils/runMigrations');
const runSeeds = require('./utils/runSeeds');

// Import routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS configuration
// Allow both localhost (for browser) and frontend service (for Docker)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://frontend:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
      // In production, uncomment the line below and remove the line above
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/tenants', userRoutes); // User routes for tenant-specific operations
app.use('/api/users', userRoutes); // User routes for user operations
app.use('/api/projects', projectRoutes);
app.use('/api/projects', taskRoutes); // Task routes for project-specific operations
app.use('/api/tasks', taskRoutes); // Task routes for task operations

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Wait for database to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await pool.query('SELECT 1');
        console.log('Database connection established');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Failed to connect to database');
        }
        console.log(`Waiting for database... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Run migrations
    console.log('Running database migrations...');
    await runMigrations();
    
    // Run seeds
    console.log('Loading seed data...');
    await runSeeds();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

