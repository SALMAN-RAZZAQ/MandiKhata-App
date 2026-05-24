const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS Settings
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token'] 
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ ALL ROUTES ARE SAFE NOW
app.use('/api/auth',   require('./routes/authRoutes'));
app.use('/api/parcha', require('./routes/parchaRoutes'));
app.use('/api/rokar',  require('./routes/RokarRoutes'));
app.use('/api/parta', require('./routes/PartaRoutes'));
app.use('/api/reports', require('./routes/reportRoutes')); // Yahan se crash ho raha tha!
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/crops', require('./routes/cropRoutes'));
app.use('/api/trading', require('./routes/tradingRoutes'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch((err) => console.log('❌ Connection Error:', err));

// Default Route
app.get('/', (req, res) => {
  res.send('MandiKhata API is running securely.');
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Backend Error Log:", err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});