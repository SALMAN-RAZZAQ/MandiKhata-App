const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const Parcha = require('../models/Parcha'); 
const PartaBill = require('../models/PartaBill'); 
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

// ==========================================
// 4. NAYA: Dukan Ki Kamai (Income / Profit)
// ==========================================
router.get('/income', fetchUser, adminOnly, async (req, res) => {
  try {
    // Katcha Parcha se aamdan
    const parchaIncome = await Parcha.aggregate([
      {
        $group: {
          _id: null,
          commission: { $sum: "$commission" },
          mazdoori: { $sum: "$mazdoori" },
          marketFee: { $sum: "$marketFee" },
          dami: { $sum: "$dami" }
        }
      }
    ]);

    // Pakka Parta se aamdan
    const partaIncome = await PartaBill.aggregate([
      {
        $group: {
          _id: null,
          commission: { $sum: "$commAmount" },
          mazdoori: { $sum: "$mazdooriAmount" },
          marketFee: { $sum: "$marketFeeAmount" },
          dami: { $sum: "$damiAmount" }
        }
      }
    ]);

    const prc = parchaIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, dami: 0 };
    const prt = partaIncome[0] || { commission: 0, mazdoori: 0, marketFee: 0, dami: 0 };

    const totalIncome = {
      totalCommission: prc.commission + prt.commission,
      totalMazdoori: prc.mazdoori + prt.mazdoori,
      totalMarketFee: prc.marketFee + prt.marketFee,
      totalDami: prc.dami + prt.dami,
    };
    
    // Grand Total
    totalIncome.grandTotal = totalIncome.totalCommission + totalIncome.totalMazdoori + totalIncome.totalMarketFee + totalIncome.totalDami;

    res.json(totalIncome);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Income load nahi ho saki.' });
  }
});

module.exports = router;