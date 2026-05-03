const mongoose = require('mongoose'); // YEH LINE MISSING THI

const transactionSchema = new mongoose.Schema({
  receiptNo: { type: String, required: true }, 
  date: { type: Date, default: Date.now },
  
  transactionType: { type: String, required: true }, 
  
  // NAYA: Parchi kis Khate mein jayegi
  khataCategory: { type: String, default: 'Kisan' }, 
  
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  partyName: { type: String, required: true }, 
  
  cropType: { type: String },
  weight: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  
  grossAmount: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  mazdoori: { type: Number, default: 0 },
  dami: { type: Number, default: 0 },
  marketFee: { type: Number, default: 0 },
  
  netAmount: { type: Number, required: true }, 
  details: { type: String } 
});

module.exports = mongoose.model('Transaction', transactionSchema);