const mongoose = require('mongoose');

// ہر لاٹ/بیچ کا ریکارڈ رکھنے کے لیے سب-سکیما
const LotSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    weight: { type: Number, required: true }, // اس لاٹ کا بچا ہوا وزن (KG میں)
    rate: { type: Number, required: true }    // اس لاٹ کا خریدا گیا ریٹ (فی 40 کلو / من)
});

const InventorySchema = new mongoose.Schema({
  cropName: { 
    type: String, 
    required: true, 
    unique: true // Ek fasal ka ek hi record hoga (misal ke taur par: Gandum)
  },
  totalWeight: { 
    type: Number, 
    default: 0 // Shuru mein stock zero hoga (Man / KG mein)
  },
  lots: { 
    type: [LotSchema], 
    default: [] // 🚀 NAYA: اسٹاک میں پڑی الگ الگ ریٹ والی ڈھیریوں کا حساب (اس سے ایرر نہیں آئے گا)
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Inventory', InventorySchema);