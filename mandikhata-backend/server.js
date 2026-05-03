const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rokarRoutes = require('./routes/rokarRoutes');
require('dotenv').config();

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use('/api/rokar', rokarRoutes);
app.use('/api/auth', require('./routes/authRoutes'));

// ---- IMPORT YOUR NEW DOORS HERE ----
const parchaRoutes = require('./routes/parchaRoutes');
app.use('/api/parcha', parchaRoutes);
// ------------------------------------

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { family: 4 })
  .then(() => console.log('✅ Ground Reality: Connected to MongoDB ATLAS (Cloud Server)!'))
  .catch((err) => console.log('❌ Cloud Connection Error:', err));

app.get('/', (req, res) => {
  res.send('MandiKhata Cloud API is running securely.');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Master Server is running on port ${PORT}`);
});