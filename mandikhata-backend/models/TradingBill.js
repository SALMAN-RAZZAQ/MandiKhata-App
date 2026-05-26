const mongoose = require('mongoose');

const tradingBillSchema = new mongoose.Schema({
  billType: { type: String, enum: ['Purchase', 'Sale'], required: true },
  
  clientName: { type: String }, 
  clientCategory: { type: String }, // ✅ NAYA: Khareedar ka Khata Group
  shopCategory: { type: String },   // ✅ NAYA: Dukano ka Khata Group
  
  jins: { type: String, required: true },
  date: { type: Date, required: true },
  bharti: { type: Number, default: 60 },

  entries: [{
    shopName: { type: String },
    bharti: { type: Number, required: true, default: 60 },
    weight: { type: Number, required: true },
    rate: { type: Number, required: true },
    damiPercent: { type: Number, default: 0 },
    rowTotal: { type: Number, required: true }
  }],

  expenses: {
    labourPerBag: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 0 },
    clientDamiPercent: { type: Number, default: 0 }, 
    freightType: { type: String, default: 'per_maund' },
    freightRate: { type: Number, default: 0 },
    marketFeeRate: { type: Number, default: 2 }
  },

  totals: {
    totalWeight: { type: Number, default: 0 },
    totalBags: { type: Number, default: 0 },
    totalPurchaseCost: { type: Number, default: 0 },
    totalDamiAmount: { type: Number, default: 0 },
    clientDamiAmount: { type: Number, default: 0 },
    totalLabour: { type: Number, default: 0 },
    totalFreight: { type: Number, default: 0 },
    totalMarketFee: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    finalNetCost: { type: Number, default: 0 },
    perMaundCost: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('TradingBill', tradingBillSchema);