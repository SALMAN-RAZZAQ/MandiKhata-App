const mongoose = require('mongoose');

const rokarSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: 'dd-mm-yy'
  
  // Galla khulte waqt kitne paise the
  openingBalance: { type: Number, required: true, default: 0 },
  
  // Galla band hote waqt kitne paise hain
  closingBalance: { type: Number, required: true, default: 0 },
  
  // Kya aaj ki rokar band (lock) ho chuki hai?
  isClosed: { type: Boolean, default: false }
  
  // 🔥 FIX: 'transactions' array yahan se remove kar diya gaya hai taake double entry na ho.
  
}, { timestamps: true });

module.exports = mongoose.model('Rokar', rokarSchema);