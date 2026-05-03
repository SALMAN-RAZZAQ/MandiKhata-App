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
  name: { type: String, required: true }, 
  partyType: { type: String, required: true }, 
  phone: { type: String }, 
  currentBalance: { type: Number, default: 0 }, 
  transactions: [partyTransactionSchema], // NAYA: Taake Arham ki poori history save ho!
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Party', partySchema);