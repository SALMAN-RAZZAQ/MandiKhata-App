const mongoose = require('mongoose');

// ======================================
// Har fasal ki alag entry ka schema
// ======================================
const partaItemSchema = new mongoose.Schema({
  cropType: { type: String, required: true },  // Gandum, Sarson etc
  weight:   { type: Number, required: true },  // Wazan (Maund/KG)
  rate:     { type: Number, required: true },  // Per unit rate
  amount:   { type: Number, required: true },  // weight * rate
}, { _id: false });

// ======================================
// Parta Bill ka main schema
// ======================================
const partaBillSchema = new mongoose.Schema({

  // Bill Number (PRT-1001, PRT-1002...)
  partaNo: { type: String, required: true, unique: true },

  // Kis customer ka bill hai
  customerName:  { type: String, required: true, trim: true },
  khataCategory: { type: String, default: 'Kisan' },

  // Party reference — ✅ default: null add kiya
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', default: null },

  // Multiple Faslen
  items: {
    type: [partaItemSchema],
    required: true,
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'Kam az kam ek fasal zaroori hai!'
    }
  },

  // Hisaab Kitab
  grossAmount:     { type: Number, default: 0 },
  commPercent:     { type: Number, default: 0 },
  commAmount:      { type: Number, default: 0 },
  mazdooriAmount:  { type: Number, default: 0 },
  marketFeeAmount: { type: Number, default: 0 },
  damiPercent:     { type: Number, default: 0 },
  damiAmount:      { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netAmount:       { type: Number, required: true },
  details:         { type: String, default: '' }

}, { timestamps: true });

module.exports = mongoose.model('PartaBill', partaBillSchema);