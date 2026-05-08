const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  voucherNo: { type: String, required: true }, // Jaise CR-01104 (Receipt) ya P-102 (Parcha)
  date: { type: Date, default: Date.now },
  
  // Kis kism ki entry hai? (Cash Receipt, Cash Payment, ya Kachi Arhat)
  transactionType: { type: String, required: true }, 
  
  // Parchi kis Khate mein jayegi
  khataCategory: { type: String, default: 'Kisan' }, 
  
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  partyName: { type: String, required: true }, 
  
  // YEH HAIN ASAL LEDGER KI JAAN (Debit / Credit)
  debit: { type: Number, default: 0 },  // Naam (Aapne party se lene hain)
  credit: { type: Number, default: 0 }, // Jama (Party ne aapse lene hain / jama karwaye)
  
  // Details mein likhenge "Cash received" ya "Bill #102 ki amount"
  details: { type: String },
  
  // Agar yeh entry kisi Parcha/Bill ke banne se aayi hai, toh uska reference
  parchaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcha', default: null }
  
}, { timestamps: true }); // ✅ FIX: Timestamps ka bracket fields ke bahar aata hai

module.exports = mongoose.model('Transaction', transactionSchema);