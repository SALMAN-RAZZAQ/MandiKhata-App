const mongoose = require('mongoose');

const tradingBillSchema = new mongoose.Schema({
  // 1. Client & Meta Info
  clientName: { type: String, required: true },
  jins: { type: String, required: true },
  date: { type: Date, required: true },
  bharti: { type: Number, default: 60 },

  // 2. Shop Entries (Array)
  entries: [{
    shopName: { type: String, required: true },
    weight: { type: Number, required: true },
    rate: { type: Number, required: true },
    damiPercent: { type: Number, default: 0 },
    rowTotal: { type: Number, required: true }
  }],

  // 3. Expenses
  expenses: {
    labourPerBag: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 0 },
    freightType: { type: String, default: 'per_maund' },
    freightRate: { type: Number, default: 0 },
    marketFeeRate: { type: Number, default: 2 }
  },

  // 4. Final Calculated Totals
  totals: {
    totalWeight: { type: Number, default: 0 },
    totalBags: { type: Number, default: 0 },
    totalPurchaseCost: { type: Number, default: 0 },
    totalDamiAmount: { type: Number, default: 0 },
    totalLabour: { type: Number, default: 0 },
    totalFreight: { type: Number, default: 0 },
    totalMarketFee: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    finalNetCost: { type: Number, default: 0 },
    perMaundCost: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('TradingBill', tradingBillSchema);