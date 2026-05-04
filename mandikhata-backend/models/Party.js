const mongoose = require('mongoose');

// NAYA: Khate ke andar rozana ki entry ka design
const partyTransactionSchema = new mongoose.Schema({
  referenceId: { type: String }, // Rokar wala Hawala Number yahan aayega
  date: { type: String },
  description: { type: String },
  amount: { type: Number },
  type: { type: String, enum: ['Jama', 'Naam'] }
});

const partySchema = new mongoose.Schema({
  // 🔥 FIX #9: 'unique: true' (Duplicate rokne ke liye) aur 'trim: true' (faltu spaces hatane ke liye) lagaya gaya
  name: { type: String, required: true, unique: true, trim: true }, 
  partyType: { type: String, required: true }, 
  phone: { type: String }, 
  currentBalance: { type: Number, default: 0 }, 
  transactions: [partyTransactionSchema], // NAYA: Taake poori history save ho!
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Party', partySchema);