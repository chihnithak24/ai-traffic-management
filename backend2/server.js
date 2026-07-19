/**
 * server.js — AI Smart Traffic Management v2
 * Express + Socket.IO entry point
 */
require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const connectDB = require('./config/db');

// Routes
const authRoutes         = require('./routes/authRoutes');
const trafficRoutes      = require('./routes/trafficRoutes');
const dashboardRoutes    = require('./routes/dashboardRoutes');
const predictRoutes      = require('./routes/predictRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ───────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:5174', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

// Store io globally so controllers can emit
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  socket.on('join_dashboard', () => socket.join('dashboard'));

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Emit live traffic updates every 30 seconds (simulation)
setInterval(async () => {
  try {
    const Traffic = require('./models/Traffic');
    const count = await Traffic.countDocuments();
    if (count > 0) {
      io.to('dashboard').emit('traffic_update', {
        timestamp: new Date(),
        message: 'Traffic data refreshed'
      });
    }
  } catch (_) {}
}, 30000);

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5174', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ──────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/traffic',       trafficRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/predict',       predictRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'OK', version: '2.0' }));

// 404
app.use((_, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, _, res, __) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
connectDB()
  .then(() => server.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`)))
  .catch(err => { console.error(err); process.exit(1); });
