const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CORS Settings
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token'] 
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Routes 
app.use('/api/auth',   require('./routes/authRoutes'));
app.use('/api/parcha', require('./routes/parchaRoutes'));
app.use('/api/rokar',  require('./routes/RokarRoutes'));
app.use('/api/parta', require('./routes/PartaRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch((err) => console.log('❌ Connection Error:', err));

// ✅ Default Route
app.get('/', (req, res) => {
  res.send('MandiKhata API is running securely.');
});

// ========================================================
// 🔥 FIX: CENTRAL ERROR HANDLER MIDDLEWARE
// Yeh hamesha saare routes ke bilkul aakhir mein aata hai
// ========================================================
app.use((err, req, res, next) => {
  // 1. Terminal (Backend) par poora error print karo taake aapko pata chalay
  console.error("🚨 Backend Error Log:", err.message || err);

  // 2. Check karo ke app Live hai (Production) ya aapke PC par chal rahi hai (Development)
  const isProduction = process.env.NODE_ENV === 'production';

  // 3. User ko status 500 ke sath safe message bhejo
  res.status(err.status || 500).json({
    success: false,
    error: isProduction 
      ? 'Server mein koi androni masla aagaya hai. Kripya baad mein koshish karein.' // Safe message for users
      : err.message // Detail message for you (Developer)
  });
});

// ✅ PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});