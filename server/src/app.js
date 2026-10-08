const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');

const config = require('./config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const { initializeSocket } = require('./config/socket');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const projectRoutes = require('./routes/project.routes');
const issueRoutes = require('./routes/issue.routes');
const commentRoutes = require('./routes/comment.routes');
const activityRoutes = require('./routes/activity.routes');
const notificationRoutes = require('./routes/notification.routes');
const githubRoutes = require('./routes/github.routes');
const webhookRoutes = require('./routes/webhook.routes');
const releaseRoutes = require('./routes/release.routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Security headers
app.use(helmet());

// Rate Limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Apply rate limiter to all /api routes except webhooks which need high throughput
app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/webhooks')) {
    return next();
  }
  return limiter(req, res, next);
});

// CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Request logging (skip in test)
if (config.env !== 'test') {
  app.use(morgan('short'));
}

// Body parsing — webhook route needs raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DevFlow API is running',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/releases', releaseRoutes);

// 404 handler for unmatched routes
app.all('*', (req, res, next) => {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
});

// Global error handler
app.use(errorHandler);

// Start server
async function start() {
  await connectDB();

  server.listen(config.port, () => {
    logger.info(`DevFlow server running on port ${config.port} [${config.env}]`);
  });
}

// Only start if not in test mode (supertest manages server lifecycle)
if (config.env !== 'test') {
  start();
}

module.exports = { app, server };
