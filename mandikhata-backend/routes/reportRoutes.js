const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const Parcha = require('../models/Parcha'); 
const PartaBill = require('../models/PartaBill'); 
const TradingBill = require('../models/TradingBill'); 
const fetchUser = require('../middleware/fetchUser');
const adminOnly = require('../middleware/adminOnly');

// 1. Outstanding Balances (Baqaya Jat)
router.get('/balances', fetchUser, adminOnly, async (req, res) => {
  try {
    const parties = await Party.find({ currentBalance: { $ne: 0 } }).sort({ currentBalance: -1 });
    res.json(parties);
  } catch (error) {
    res.status(500).json({ error: 'Balances load nahi ho sake.' });
  }
});

// 2. Monthly Summary (Aggregation)
router.get('/monthly', fetchUser, adminOnly, async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" }, type: "$transactionType" },
          totalCredit: { $sum: "$credit" },
          totalDebit: { $sum: "$debit" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Monthly summary load nahi ho saki.' });
  }
});

// 3. Trial Balance Checker (Debit = Credit)
router.get('/trial-balance', fetchUser, adminOnly, async (req, res) => {
  try {
    const totals = await Transaction.aggregate([
      { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } }
    ]);
    const result = totals.length > 0 ? totals[0] : { totalDebit: 0, totalCredit: 0 };
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Trial balance check nahi ho saka.' });
  }
});

router.get('/income', fetchUser, adminOnly, async (req, res) => {
  try {
    const parchaIncome = await Parcha.aggregate([
      { $group: { _id: null, commission: { $sum: "$commission" }, mazdoori: { $sum: "$mazdoori" }, marketFee: { $sum: "$marketFee" }, dami: { $sum: "$dami" } } }
    ]);
    const partaIncome = await PartaBill.aggregate([
      { $group: { _id: null, commission: { $sum: "$commAmount" }, mazdoori: { $sum: "$mazdooriAmount" }, marketFee: { $sum: "$marketFeeAmount" }, dami: { $sum: "$damiAmount" } } }
    ]);
    const tradingIncome = await TradingBill.aggregate([
      { $group: { _id: null, commission: { $sum: "$totals.totalCommission" }, mazdoori: { $sum: "$totals.totalLabour" }, marketFee: { $sum: "$totals.totalMarketFee" }, damiPaid: { $sum: "$totals.totalDamiAmount" } } }
    ]);

    const prc = parchaIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, dami: 0 };
    const prt = partaIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, dami: 0 };
    const trd = tradingIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, damiPaid: 0 };

    const totalCommission = (prc.commission || 0) + (prt.commission || 0) + (trd.commission || 0);
    const totalMazdoori = (prc.mazdoori || 0) + (prt.mazdoori || 0) + (trd.mazdoori || 0);
    const totalMarketFee = (prc.marketFee || 0) + (prt.marketFee || 0) + (trd.marketFee || 0);
    const totalDamiIncome = (prc.dami || 0) + (prt.dami || 0);
    const totalTradingDamiPaid = (trd.damiPaid || 0);
    
    const grandTotal = (totalCommission + totalDamiIncome) - totalTradingDamiPaid;

    res.json({
      totalCommission, totalMazdoori, totalMarketFee, totalDamiIncome, totalTradingDamiPaid, grandTotal
    });
  } catch (error) {
    res.status(500).json({ error: 'Income load nahi ho saki.' });
  }
});

module.exports = router; // 🔥 YEH LINE MISSING THI JISKI WAJAH SE ERROR AAYA!