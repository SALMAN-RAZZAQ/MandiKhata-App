const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  // ✅ FIX: Yahan se 'unique: true' hata diya hai kyunke neeche custom index lagayenge
  name: { type: String, required: true, trim: true }, 
  
  partyType: { type: String, required: true }, // Jaise: 'Kisan', 'Kharidar', 'Staff'
  
  phone: { type: String }, 
  
  currentBalance: { type: Number, default: 0 }, 
  
  balanceType: { type: String, enum: ['Jama', 'Naam'], default: 'Naam' },
  
  createdAt: { type: Date, default: Date.now }
});

// 🔥 CRITICAL FIX: Case-Insensitive Unique Index 
// Yeh database ko majboor karega ke "Ali" aur "ali" ko ek hi party mane!
partySchema.index(
  { name: 1 }, 
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Party', partySchema);