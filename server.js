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

connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join admin room
  socket.on('join-admin', () => {
    socket.join('admin');
    console.log('Admin joined admin room');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available globally
global.io = io;

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Mount routers
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
// app.use("/api/services", require("./routes/services"));
app.use("/api/content", require("./routes/content"));
app.use("/api/blog", require("./routes/blog"));
// app.use("/api/reviews", require("./routes/reviews"));
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


// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    contentType: req.headers['content-type']
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

  const statusCode = err.statusCode || 500;
  const message = err.message || "Server Error";

  // Ensure proper JSON response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT =  5005;

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
});