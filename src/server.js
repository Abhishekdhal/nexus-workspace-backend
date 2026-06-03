const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const admin = require('firebase-admin');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized from environment variable');
  } catch (error) {
    console.error('Firebase Admin initialization from env failed:', error.message);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized from file');
  } catch (error) {
    console.error('Firebase Admin initialization from file failed:', error.message);
  }
} else {
  console.warn('Firebase Admin credentials not found (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH)');
}

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const growthRoutes = require('./routes/growthRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Nexus Workspace API is running...');
});

// User Profile Web View
const { getWebProfile } = require('./controllers/webProfileController');
app.get('/:id', getWebProfile);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Local scheduled daily deadline check (for local run or VPS environments)
  const { checkDeadlinesAndSendReminders } = require('./controllers/projectController');
  
  // 1. Initial startup check after 10 seconds
  setTimeout(() => {
    console.log('[Scheduler] Running initial startup deadline check...');
    checkDeadlinesAndSendReminders();
  }, 10000);

  // 2. Set daily interval (every 24 hours)
  setInterval(() => {
    console.log('[Scheduler] Running scheduled daily deadline check...');
    checkDeadlinesAndSendReminders();
  }, 24 * 60 * 60 * 1000);
});
