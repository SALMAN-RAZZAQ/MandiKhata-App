const mongoose = require('mongoose');

const parchaSchema = new mongoose.Schema({
  // Parchi ka hawala number (Jaise: PRC-1001)
  parchaNo: { type: String, required: true }, 
  date: { type: Date, default: Date.now },
  
  // Kachi Arhat, Pakki Arhat ya Adaigi
  transactionType: { type: String, required: true }, 
  khataCategory: { type: String, default: 'Kisan' },

  // Kis party/kisan ka bill hai
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  partyName: { type: String, required: true }, 
  
  // Fasal aur wazan ki maloomat (Jo Transaction se nikal di thi)
  cropType: { type: String, default: 'N/A' },
  weight: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  
  // Karchay aur Hisaab
  grossAmount: { type: Number, default: 0 }, // Wazan * Rate
  commission: { type: Number, default: 0 },
  mazdoori: { type: Number, default: 0 },
  dami: { type: Number, default: 0 },
  marketFee: { type: Number, default: 0 },
  
  // Asal raqam jo Khate (Ledger) mein jama ya cut hogi
  netAmount: { type: Number, required: true }, 
  
  details: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('Parcha', parchaSchema);