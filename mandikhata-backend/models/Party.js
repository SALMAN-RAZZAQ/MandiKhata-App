const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  // 🔥 FIX #9: 'unique: true' aur 'trim: true' wali behtareen logic barkarar hai
  name: { type: String, required: true, unique: true, trim: true }, 
  
  partyType: { type: String, required: true }, // Jaise: 'Kisan', 'Kharidar', 'Staff'
  
  phone: { type: String }, 
  
  // NAYA: Party ka total hisaab yahan save hoga (Sirf ek number)
  currentBalance: { type: Number, default: 0 }, 
  
  // NAYA: Yeh current balance Jama hai ya Naam?
  balanceType: { type: String, enum: ['Jama', 'Naam'], default: 'Naam' },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Party', partySchema);