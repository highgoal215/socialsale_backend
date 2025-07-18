const express = require("express");
const path=require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { createServer } = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const serviceRoutes = require("./routes/services");
const orderRoutes = require("./routes/orders");
const instagramRoutes = require("./routes/instagram");

const transactionRoutes = require("./routes/transactions");
dotenv.config();

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with better error handling
const io = new Server(httpServer, {
  cors: {
    origin: ["https://likes.io", "https://www.likes.io", "http://localhost:9000", "http://localhost:4000", "http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  },
  pingTimeout: 60000,
  pingInterval: 250,
  transports: ['websocket', 'polling']
});

// Socket.IO connection handling with error handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user', (userId) => {
    try {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    } catch (error) {
      console.error('Error joining user room:', error);
    }
  });

  // Join admin room
  socket.on('join-admin', () => {
    try {
      socket.join('admin');
      console.log('Admin joined admin room');
    } catch (error) {
      console.error('Error joining admin room:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Error handling for socket events
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io available globally
global.io = io;

// Enhanced security middleware - More permissive for development
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://checkout.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "http://localhost:5005"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "https://api.stripe.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  } : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enhanced CORS configuration - MUST come BEFORE static file serving
app.use(
  cors({
    origin: ["https://likes.io", "https://www.likes.io", "https://admin.likes.io", "http://localhost:9000", "http://localhost:4000", "http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Disposition"]
  })
);

// JSON parsing middleware with better error handling
app.use(express.json({
  limit: '10mb', verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

// Static file serving with proper CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for image requests
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Likes.IO API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Mount routers
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/content", require("./routes/content"));
app.use("/api/blog", require("./routes/blog"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/coupons", require("./routes/coupons"));
app.use("/api/transactions", transactionRoutes);
app.use("/api/payments", require("./routes/payments"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/tickets", require("./routes/tickets"));

// Admin notification routes
app.use("/api/notifications", require("./routes/notifications"));

// Client notification routes
app.use("/api/client/notifications", require("./routes/clientNotifications"));
app.use("/api/client/notification-preferences", require("./routes/clientNotificationPreferences"));

// Admin notification preferences (for admin to manage user preferences)
app.use("/api/notification-preferences", require("./routes/notificationPreferences"));
app.use("/api/notification-templates", require("./routes/notificationTemplates"));
app.use("/api/notification-analytics", require("./routes/notificationAnalytics"));
app.use("/api/analytics", require("./routes/analytics"));
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/contact', require('./routes/contact'));
app.use('/api/support', require('./routes/support'));
app.use('/api/leavereview', require('./routes/leaveReview'));
app.use('/api/social-order-payments', require('./routes/socialOrderPayments'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/seo-settings', require('./routes/seoSettings'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Enhanced error handler middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    // Only return JSON parsing error for requests that should have JSON body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON format in request body',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    } else {
      // For GET requests, this shouldn't happen, so it's likely a server configuration issue
      return res.status(500).json({
        success: false,
        error: 'Server configuration error - unexpected JSON parsing for GET request',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Ensure proper JSON response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5005;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});