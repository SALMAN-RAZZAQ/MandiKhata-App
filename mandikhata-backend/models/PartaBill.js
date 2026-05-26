const mongoose = require('mongoose');

const PartaBillSchema = new mongoose.Schema({
  partaNo: { type: String, required: true, unique: true },
 transactionType: {type: String,required: true }, // ✅ NAYA: Khareed ya Baich
  customerName: { type: String, required: true },
  khataCategory: { type: String },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  items: [{
    cropType: String,
    weight: Number,
    rate: Number,
    amount: Number
  }],
  grossAmount: { type: Number, default: 0 },
  commPercent: { type: Number, default: 0 },
  commAmount: { type: Number, default: 0 },
  mazdooriAmount: { type: Number, default: 0 },
  marketFeeAmount: { type: Number, default: 0 },
  damiPercent: { type: Number, default: 0 },
  damiAmount: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  details: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PartaBill', PartaBillSchema);