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
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token'] // ✅ auth-token add kiya
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Routes — sab ek jagah saaf tarike se
app.use('/api/auth',   require('./routes/authRoutes'));
app.use('/api/parcha', require('./routes/parchaRoutes'));
app.use('/api/rokar',  require('./routes/RokarRoutes'));
app.use('/api/parta', require('./routes/PartaRoutes'));
// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch((err) => console.log('❌ Connection Error:', err));

// ✅ Default Route
app.get('/', (req, res) => {
  res.send('MandiKhata API is running securely.');
});

// ✅ PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});