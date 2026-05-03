const mongoose = require('mongoose');

const rokarTransactionSchema = new mongoose.Schema({
  referenceId: { type: String, required: true }, // <-- NAYA: Hawala Number
  partyName: { type: String },                   // <-- NAYA: Party ka naam
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['Jama', 'Naam'], required: true },
  category: { type: String, default: 'General' },
  time: { type: String, default: () => new Date().toLocaleTimeString('en-GB') }
});

const rokarSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  openingBalance: { type: Number, required: true, default: 0 },
  transactions: [rokarTransactionSchema],
  closingBalance: { type: Number, required: true, default: 0 },
  isClosed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Rokar', rokarSchema);