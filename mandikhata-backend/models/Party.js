const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  // ✅ NAYA FIELD: Auto-generate hone wala Khata Number
  khataIndex: { 
    type: Number, 
    unique: true 
  },
  
  name: { type: String, required: true, trim: true }, 
  
  partyType: { type: String, required: true }, // Jaise: 'Kisan', 'Kharidar', 'Staff'
  
  phone: { type: String }, 
  
  currentBalance: { type: Number, default: 0 }, 
  
  balanceType: { type: String, enum: ['Jama', 'Naam'], default: 'Naam' },
  
  createdAt: { type: Date, default: Date.now }
});

// 🔥 CRITICAL FIX: Case-Insensitive Unique Index 
partySchema.index(
  { name: 1 }, 
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Party', partySchema);