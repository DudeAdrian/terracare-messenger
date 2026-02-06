/**
 * Terracare Messenger Server
 * 
 * Express + Socket.io server for secure messaging
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const { handleSocketConnection } = require('./socket/handler');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'Terracare Messenger',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  handleSocketConnection(socket, io);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 3008;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 Terracare Messenger v1.0.0                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                                      ║
║  Socket.IO: ws://localhost:${PORT}                                     ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
